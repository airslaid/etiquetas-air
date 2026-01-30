import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // Configuração CORS para permitir chamadas do frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Tratamento de Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { action, config } = req.body;
    const logs: string[] = [];

    logs.push("API Vercel 'sync' iniciada.");

    if (action !== 'sync') {
      throw new Error(`Ação desconhecida: ${action}`);
    }

    if (!config) {
      throw new Error("Configuração ausente.");
    }

    // 1. Autenticação Azure AD
    logs.push("Autenticando no Azure AD...");
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", config.clientId);
    params.append("client_secret", config.clientSecret);
    params.append("scope", "https://analysis.windows.net/powerbi/api/.default");

    const authRes = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
    });

    if (!authRes.ok) {
        const txt = await authRes.text();
        throw new Error(`Falha Auth Azure: ${txt}`);
    }

    const authData: any = await authRes.json();
    const token = authData.access_token;
    logs.push("Token Azure obtido.");

    // 2. Consulta Power BI (DAX)
    logs.push("Consultando Power BI...");
    
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
    )`;

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
    });

    if (!pbiRes.ok) {
        const txt = await pbiRes.text();
        throw new Error(`Erro API Power BI: ${txt}`);
    }

    const pbiData: any = await pbiRes.json();
    
    if (pbiData.error) {
        throw new Error(`Erro Power BI Query: ${JSON.stringify(pbiData.error)}`);
    }

    const rows = pbiData.results?.[0]?.tables?.[0]?.rows || [];
    logs.push(`${rows.length} linhas recebidas.`);

    if (rows.length === 0) {
        return res.status(200).json({ count: 0, logs });
    }

    // 3. Transformação de Dados
    const formattedRows = rows.map((row: any) => ({
      ord_in_codigo: row["[ord_in_codigo]"] || row.ord_in_codigo,
      ord_dt_abertura_real: row["[ord_dt_abertura_real]"] || row.ord_dt_abertura_real || new Date().toISOString(),
      fil_in_codigo: row["[fil_in_codigo]"] || row.fil_in_codigo || 1,
      pro_st_alternativo: row["[pro_st_alternativo]"] || row.pro_st_alternativo || "",
      pro_st_descricao: row["[pro_st_descricao]"] || row.pro_st_descricao || "Produto sem descrição",
      orl_st_lotefabricacao: row["[orl_st_lotefabricacao]"] || row.orl_st_lotefabricacao || "",
      esv_st_valor: row["[esv_st_valor]"] || row.esv_st_valor || ""
    })).filter((r: any) => r.ord_in_codigo);

    // Remover duplicatas
    const uniqueMap = new Map();
    formattedRows.forEach((r: any) => {
        const key = `${r.ord_in_codigo}-${r.fil_in_codigo}-${r.orl_st_lotefabricacao}`;
        uniqueMap.set(key, r);
    });
    const uniqueRows = Array.from(uniqueMap.values());

    // 4. Salvar no Supabase
    logs.push(`Salvando ${uniqueRows.length} registros...`);
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Configuração do servidor incompleta (SUPABASE_URL ou SERVICE_KEY ausentes).");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { error: upsertError } = await supabaseAdmin
        .from(config.tableName)
        .upsert(uniqueRows, {
            onConflict: 'ord_in_codigo,fil_in_codigo,orl_st_lotefabricacao'
        });

    if (upsertError) {
        throw new Error(`Erro no Banco de Dados: ${upsertError.message}`);
    }

    logs.push("Sucesso!");

    return res.status(200).json({ count: uniqueRows.length, logs });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ 
        error: error.message || 'Erro interno no servidor',
        logs: ['Erro fatal durante processamento.']
    });
  }
}