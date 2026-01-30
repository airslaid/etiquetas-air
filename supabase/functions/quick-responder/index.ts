// Setup modern types for Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Declare Deno to avoid TypeScript errors in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Use native Deno.serve (standard in Supabase Edge Runtime now)
Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Parse Body safely
    let body;
    try {
        body = await req.json();
    } catch (e) {
        throw new Error("Corpo da requisição inválido ou vazio (JSON expected).");
    }

    const { action, config } = body;
    const logs: string[] = []

    if (action !== 'sync') {
        throw new Error(`Ação desconhecida: ${action}`)
    }
    
    if (!config) {
        throw new Error("Configuração ausente no payload.")
    }

    logs.push("Função iniciada via Server-Side (v2).")

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
        throw new Error(`Erro Auth Azure (${authRes.status}): ${txt}`)
    }

    const authData = await authRes.json()
    const token = authData.access_token
    logs.push("Token Azure obtido.")

    // 4. Power BI Query
    logs.push("Consultando Power BI (DAX)...")
    
    // Note: Use simple quotes for DAX string literals to avoid JSON stringify issues
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
        throw new Error(`Erro Power BI API (${pbiRes.status}): ${txt}`)
    }

    const pbiData = await pbiRes.json()
    
    if (pbiData.error) {
        throw new Error(`Power BI retornou erro: ${JSON.stringify(pbiData.error)}`)
    }

    const rows = pbiData.results?.[0]?.tables?.[0]?.rows || []
    logs.push(`${rows.length} linhas recebidas.`)

    if (rows.length === 0) {
        return new Response(JSON.stringify({ count: 0, logs }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
    logs.push("Salvando no Supabase...")
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Variáveis de ambiente do Supabase (URL/KEY) não configuradas no servidor.")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey)

    const { error: upsertError } = await supabaseAdmin
        .from(config.tableName)
        .upsert(uniqueRows, {
            onConflict: 'ord_in_codigo,fil_in_codigo,orl_st_lotefabricacao'
        })

    if (upsertError) {
        throw new Error(`Erro Supabase Upsert: ${upsertError.message}`)
    }

    logs.push(`Processo concluído. ${uniqueRows.length} registros atualizados.`)

    return new Response(JSON.stringify({ count: uniqueRows.length, logs }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    // FATAL ERROR HANDLER: Always return 200 with error details so the client sees it.
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("EDGE FUNCTION ERROR:", errorMessage)
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200, // Important: Force 200 so the client library parses the body
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})