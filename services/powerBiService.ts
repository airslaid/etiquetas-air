import { supabase } from "../supabaseClient";
import { TABLE_NAME, POWER_BI_CONFIG, DATASET_ID, GROUP_ID } from "../constants";
import { PowerBiLabelData } from "../types";

// --- SUPABASE READ OPERATIONS ---

export const getProductionDataByOP = async (opNumber: number): Promise<PowerBiLabelData[]> => {
  // Tentativa 1: Usando o nome da tabela exatamente como definido (REL_ETIQUETAS)
  let { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('ord_in_codigo', opNumber);

  // Se der erro de "Relação não encontrada" (42P01), tenta em minúsculo
  // Isso acontece porque o Postgres às vezes salva como 'rel_etiquetas'
  if (error && error.code === '42P01') {
      console.warn(`Tabela ${TABLE_NAME} não encontrada. Tentando minúsculo...`);
      const retry = await supabase
        .from(TABLE_NAME.toLowerCase())
        .select('*')
        .eq('ord_in_codigo', opNumber);
      
      data = retry.data;
      error = retry.error;
  }

  // Se ainda houver erro, lançamos para a UI mostrar
  if (error) {
    console.error("Supabase query error:", error);
    let msg = error.message;
    
    // Tradução amigável para erro de chave
    if (msg.includes("Invalid API key") || msg.includes("JWT")) {
        msg = "A Chave de API (Anon Key) no arquivo supabaseClient.ts está incorreta, expirada ou o formato é inválido.";
    }

    throw new Error(`Erro no Banco de Dados: ${msg}`);
  }

  return (data || []) as PowerBiLabelData[];
};

// --- POWER BI SYNC OPERATIONS (VIA VERCEL API) ---

export const syncPowerBiToSupabase = async (
  onLog: (msg: string) => void
): Promise<number> => {
  try {
    onLog("Conectando via API Segura...");

    const payload = {
        action: 'sync',
        config: {
            ...POWER_BI_CONFIG,
            datasetId: DATASET_ID,
            groupId: GROUP_ID,
            tableName: TABLE_NAME
        }
    };

    // Agora chamamos a rota interna da Vercel /api/sync
    // Não usamos mais supabase.functions.invoke
    const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        // Tenta ler o erro JSON, se falhar, lê texto
        let errorMsg = `Erro HTTP: ${response.status}`;
        try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
        } catch (e) { /* ignore json parse error */ }
        
        throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(`Erro do Servidor: ${data.error}`);
    }

    if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((logMsg: string) => onLog(logMsg));
    }

    return data.count || 0;

  } catch (error: any) {
    const msg = error.message || "Erro desconhecido";
    onLog(`[FALHA] ${msg}`);
    
    // Sugestão específica se for erro de variáveis de ambiente
    if (msg.includes("SUPABASE_URL")) {
        onLog("[DICA] Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas configurações da Vercel.");
    }
    
    throw error;
  }
};