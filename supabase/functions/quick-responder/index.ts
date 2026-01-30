// Setup modern types for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// @ts-ignore
Deno.serve(async (req) => {
  // 1. Handle CORS Preflight - Responde imediatamente ao browser para liberar a conexão
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Parse Body safely
    // Tentamos ler o corpo. Se falhar (vazio ou json inválido), retornamos erro amigável.
    let body;
    try {
        const text = await req.text();
        if (text) {
            body = JSON.parse(text);
        }
    } catch (e) {
        return new Response(JSON.stringify({ error: "Corpo da requisição inválido (esperado JSON)." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }

    if (!body) {
        return new Response(JSON.stringify({ error: "Corpo da requisição vazio." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });
    }

    const { action, config } = body;
    const logs: string[] = []
    
    // Log inicial
    logs.push("Edge Function 'quick-responder' iniciada.");

    if (action !== 'sync') {
        throw new Error(`Ação desconhecida recebida: ${action}`)
    }
    
    if (!config) {
        throw new Error("Objeto 'config' ausente no payload.")
    }

    // 3. Azure AD Authentication
    logs.push("Autenticando no Azure AD...")
    const params = new URLSearchParams()
    params.append("grant_type", "client_credentials")
    params.append("client_id", config.clientId)
    params.append("client_secret", config.clientSecret)
    params.append("scope", "https://analysis.windows.net/powerbi/api/.default")

    const authRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    })

    if (!authRes.ok) {
        const txt = await authRes.text()
        throw new Error(`Falha na Autenticação Azure (${authRes.status}): ${txt}`)
    }

    const authData = await authRes.json()
    const token = authData.access_token
    logs.push("Token Azure obtido com sucesso.")

    // 4. Power BI Query
    logs.push("Executando consulta DAX no Power BI...")
    
    // Dax query construction
    const daxQuery = `
    EVALUATE
    SELECTCOLUMNS(
      TOPN(5000, '${config.tableName}', '${config.tableName}'[ord_dt_abertura_real], DESC),
      "ord_in_codigo", '${config.tableName}'[ord_in_codigo],
      "ord_dt_abertura_real", '${config.tableName}'[ord_dt_abertura_real],
      "fil_in_codigo", '${config.tableName}'[fil_in_codigo],
      "pro_st_alternativo", '${config.tableName}'[pro_st_alternativo],
      "pro_st_descricao", '${config.tableName}'[pro_st_descricao],
      "orl_st_lotefabricacao", '${config.tableName}'[orl_st_lotefabricacao],
      "esv_st_valor", '${config.tableName}'[esv_st_valor]
    )`

    const pbiRes = await fetch(`https://api.powerbi.com/v1.0/myorg/groups/${config.groupId}/datasets/${config.datasetId}/executeQueries`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            queries: [{ query: daxQuery }],
            serializerSettings: { includeNulls: true }
        })
    })

    if (!pbiRes.ok) {
        const txt = await pbiRes.text()
        throw new Error(`Erro na API do Power BI (${pbiRes.status}): ${txt}`)
    }

    const pbiData = await pbiRes.json()
    
    if (pbiData.error) {
        throw new Error(`Power BI retornou erro de consulta: ${JSON.stringify(pbiData.error)}`)
    }

    const rows = pbiData.results?.[0]?.tables?.[0]?.rows || []
    logs.push(`${rows.length} linhas recebidas do Power BI.`)

    if (rows.length === 0) {
        return new Response(JSON.stringify({ count: 0, logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })
    }

    // 5. Data Transformation
    const formattedRows = rows.map((row: any) => ({
      ord_in_codigo: row["[ord_in_codigo]"] || row.ord_in_codigo,
      ord_dt_abertura_real: row["[ord_dt_abertura_real]"] || row.ord_dt_abertura_real || new Date().toISOString(),
      fil_in_codigo: row["[fil_in_codigo]"] || row.fil_in_codigo || 1,
      pro_st_alternativo: row["[pro_st_alternativo]"] || row.pro_st_alternativo || "",
      pro_st_descricao: row["[pro_st_descricao]"] || row.pro_st_descricao || "Produto sem descrição",
      orl_st_lotefabricacao: row["[orl_st_lotefabricacao]"] || row.orl_st_lotefabricacao || "",
      esv_st_valor: row["[esv_st_valor]"] || row.esv_st_valor || ""
    })).filter((r: any) => r.ord_in_codigo)

    // Deduplicate in memory
    const uniqueMap = new Map()
    formattedRows.forEach((r: any) => {
        const key = `${r.ord_in_codigo}-${r.fil_in_codigo}-${r.orl_st_lotefabricacao}`
        uniqueMap.set(key, r)
    })
    const uniqueRows = Array.from(uniqueMap.values())

    // 6. Supabase Upsert
    logs.push(`Salvando ${uniqueRows.length} registros no Supabase...`)
    
    // @ts-ignore
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    // @ts-ignore
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Variáveis de ambiente (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY) não estão configuradas no servidor Edge.")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const { error: upsertError } = await supabaseAdmin
        .from(config.tableName)
        .upsert(uniqueRows, {
            onConflict: 'ord_in_codigo,fil_in_codigo,orl_st_lotefabricacao'
        })

    if (upsertError) {
        throw new Error(`Falha ao salvar no banco de dados: ${upsertError.message}`)
    }

    logs.push("Sincronização concluída com sucesso.")

    // Sucesso: Retorna 200
    return new Response(JSON.stringify({ count: uniqueRows.length, logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
    })

  } catch (error: any) {
    // FATAL ERROR HANDLER
    // Importante: Retornamos status 200 mesmo com erro, para que o cliente (invoke)
    // consiga ler o JSON com a mensagem de erro. Se retornarmos 500, o cliente joga uma exceção genérica.
    const errorMessage = error.message || String(error)
    console.error("EDGE FUNCTION ERROR:", errorMessage)
    
    return new Response(JSON.stringify({ error: errorMessage, logs: ["Processo abortado devido a erro fatal."] }), {
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})