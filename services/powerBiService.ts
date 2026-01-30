import { supabase } from "../supabaseClient";
import { TABLE_NAME, POWER_BI_CONFIG, DATASET_ID, GROUP_ID } from "../constants";
import { PowerBiLabelData } from "../types";

// --- SUPABASE READ OPERATIONS ---

export const getProductionDataByOP = async (opNumber: number): Promise<PowerBiLabelData[]> => {
  try {
      // Tentativa 1: Usando o nome da tabela exatamente como definido
      let { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .eq('ord_in_codigo', opNumber);

      // Se der erro de "Relação não encontrada" (42P01), tenta em minúsculo
      if (error && error.code === '42P01') {
          console.warn(`Tabela ${TABLE_NAME} não encontrada. Tentando minúsculo...`);
          const retry = await supabase
            .from(TABLE_NAME.toLowerCase())
            .select('*')
            .eq('ord_in_codigo', opNumber);
          
          data = retry.data;
          error = retry.error;
      }

      // Tratamento de Erros
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      return (data || []) as PowerBiLabelData[];

  } catch (error: any) {
    console.error("Erro capturado no service:", error);
    let msg = error.message || "Erro desconhecido";
    
    // Erros de Rede / Conexão
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        throw new Error("Erro de Conexão: O navegador bloqueou o acesso ao banco de dados. Se estiver usando uma VPN ou bloqueador de anúncios, tente desativá-los.");
    }
    
    // Erros de Chave API
    if (msg.includes("Invalid API key") || msg.includes("JWT")) {
        throw new Error("A Chave de API está incorreta ou expirada.");
    }

    throw new Error(`Erro no Banco de Dados: ${msg}`);
  }
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

    const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errorMsg = `Erro HTTP: ${response.status}`;
        try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
        } catch (e) { /* ignore */ }
        
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
    
    if (msg.includes("SUPABASE_URL")) {
        onLog("[DICA] Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas configurações da Vercel.");
    }
    
    throw error;
  }
};