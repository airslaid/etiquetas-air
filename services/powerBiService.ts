import { supabase } from "../supabaseClient";
import { TABLE_NAME, POWER_BI_CONFIG, DATASET_ID, GROUP_ID } from "../constants";
import { PowerBiLabelData } from "../types";

// --- SUPABASE READ OPERATIONS ---

export const getProductionDataByOP = async (opNumber: number): Promise<PowerBiLabelData[]> => {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('ord_in_codigo', opNumber);

    if (error) {
      throw error;
    }

    return (data || []) as PowerBiLabelData[];
  } catch (error) {
    console.error("Supabase query error:", error);
    return [];
  }
};

// --- POWER BI SYNC OPERATIONS ---

// We use a CORS proxy to bypass browser restrictions when calling Microsoft APIs directly
const CORS_PROXY = "https://corsproxy.io/?";

const withProxy = (url: string) => `${CORS_PROXY}${encodeURIComponent(url)}`;

/**
 * 1. Authenticate with Azure AD to get an Access Token.
 */
const getAccessToken = async (): Promise<string> => {
  const url = `https://login.microsoftonline.com/${POWER_BI_CONFIG.tenantId}/oauth2/v2.0/token`;
  
  const body = new URLSearchParams();
  body.append("grant_type", "client_credentials");
  body.append("client_id", POWER_BI_CONFIG.clientId);
  body.append("client_secret", POWER_BI_CONFIG.clientSecret);
  body.append("scope", POWER_BI_CONFIG.scope);

  const response = await fetch(withProxy(url), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Auth Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
};

/**
 * 2. Execute DAX Query to get data from Power BI
 */
const fetchFromPowerBI = async (token: string): Promise<any[]> => {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${GROUP_ID}/datasets/${DATASET_ID}/executeQueries`;

  // INCREASED LIMIT TO 5000 to ensure we get all relevant data
  const daxQuery = `
    EVALUATE
    SELECTCOLUMNS(
      TOPN(5000, '${TABLE_NAME}', '${TABLE_NAME}'[ord_dt_abertura_real], DESC),
      "ord_in_codigo", '${TABLE_NAME}'[ord_in_codigo],
      "ord_dt_abertura_real", '${TABLE_NAME}'[ord_dt_abertura_real],
      "fil_in_codigo", '${TABLE_NAME}'[fil_in_codigo],
      "pro_st_alternativo", '${TABLE_NAME}'[pro_st_alternativo],
      "pro_st_descricao", '${TABLE_NAME}'[pro_st_descricao],
      "orl_st_lotefabricacao", '${TABLE_NAME}'[orl_st_lotefabricacao],
      "esv_st_valor", '${TABLE_NAME}'[esv_st_valor]
    )
  `;

  const response = await fetch(withProxy(url), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      queries: [{ query: daxQuery }],
      serializerSettings: { includeNulls: true }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 404) {
        throw new Error(`Erro 404: Dataset ou Grupo não encontrado. \n\nDICA: Verifique se o aplicativo (Service Principal ${POWER_BI_CONFIG.clientId}) foi adicionado como MEMBRO/ADMIN no Workspace do Power BI.`);
    }
    throw new Error(`Query Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  if (data.error) {
     throw new Error(`Power BI API Error: ${JSON.stringify(data.error)}`);
  }

  return data.results?.[0]?.tables?.[0]?.rows || [];
};

/**
 * 3. Main Sync Function
 */
export const syncPowerBiToSupabase = async (
  onLog: (msg: string) => void
): Promise<number> => {
  try {
    onLog("Inicializando conexão segura via Proxy...");
    const token = await getAccessToken();
    onLog("Token Azure AD obtido com sucesso.");
    
    onLog("Consultando Workspace e Dataset (DAX)...");
    const rows = await fetchFromPowerBI(token);
    onLog(`${rows.length} registros brutos recebidos do Power BI.`);

    if (rows.length === 0) {
        onLog("Nenhum dado retornado. Verifique se o Dataset possui dados.");
        return 0;
    }

    // Transform Data
    const formattedRows = rows.map((row: any) => ({
      ord_in_codigo: row["[ord_in_codigo]"] || row.ord_in_codigo,
      ord_dt_abertura_real: row["[ord_dt_abertura_real]"] || row.ord_dt_abertura_real || new Date().toISOString(),
      fil_in_codigo: row["[fil_in_codigo]"] || row.fil_in_codigo || 1,
      pro_st_alternativo: row["[pro_st_alternativo]"] || row.pro_st_alternativo || "",
      pro_st_descricao: row["[pro_st_descricao]"] || row.pro_st_descricao || "Produto sem descrição",
      orl_st_lotefabricacao: row["[orl_st_lotefabricacao]"] || row.orl_st_lotefabricacao || "",
      esv_st_valor: row["[esv_st_valor]"] || row.esv_st_valor || ""
    })).filter((r: any) => r.ord_in_codigo);

    // CRITICAL FIX: Deduplicate rows based on Composite Key (OP + Filial + Lote).
    const uniqueRowsMap = new Map();
    formattedRows.forEach((row: any) => {
        // Create a composite key to ensure uniqueness per Batch/Filial
        const uniqueKey = `${row.ord_in_codigo}-${row.fil_in_codigo}-${row.orl_st_lotefabricacao || 'NL'}`;
        uniqueRowsMap.set(uniqueKey, row);
    });
    
    const uniqueRows = Array.from(uniqueRowsMap.values());
    
    if (uniqueRows.length < formattedRows.length) {
        onLog(`Duplicatas exatas removidas. Processando ${uniqueRows.length} registros únicos (OP + Filial + Lote).`);
    } else {
        onLog(`Processando ${uniqueRows.length} registros.`);
    }

    // Upsert to Supabase in chunks
    onLog("Sincronizando com Supabase...");
    const chunkSize = 50;
    let processed = 0;

    for (let i = 0; i < uniqueRows.length; i += chunkSize) {
      const chunk = uniqueRows.slice(i, i + chunkSize);
      
      // FIX: Explicitly specify the composite key columns for conflict resolution.
      // NOTE: For this to work, the Supabase table MUST have a unique constraint on these 3 columns combined.
      const { error } = await supabase.from(TABLE_NAME).upsert(chunk, {
        onConflict: 'ord_in_codigo,fil_in_codigo,orl_st_lotefabricacao'
      });
      
      if (error) {
        onLog(`Erro ao salvar lote ${i}: ${error.message}`);
        console.error("Supabase Upsert Error:", error);
        // Throw to allow Admin UI to catch it
        throw error;
      } else {
        processed += chunk.length;
        if (processed % 100 === 0) onLog(`Sincronizados: ${processed}...`);
      }
    }

    return processed;

  } catch (error: any) {
    onLog(`ERRO: ${error.message}`);
    throw error;
  }
};