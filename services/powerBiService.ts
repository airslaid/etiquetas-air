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

// --- POWER BI SYNC OPERATIONS (VIA EDGE FUNCTION) ---

/**
 * Invokes the 'quick-responder' Supabase Edge Function to handle
 * the authentication and data sync server-side.
 */
export const syncPowerBiToSupabase = async (
  onLog: (msg: string) => void
): Promise<number> => {
  try {
    onLog("Contactando servidor de sincronização...");

    const payload = {
        action: 'sync',
        config: {
            ...POWER_BI_CONFIG,
            datasetId: DATASET_ID,
            groupId: GROUP_ID,
            tableName: TABLE_NAME
        }
    };

    const { data, error } = await supabase.functions.invoke('quick-responder', {
      body: payload
    });

    if (error) {
        console.error("FATAL INVOKE ERROR:", error);
        // Tenta extrair informações úteis do erro, se for um erro de rede ou HTTP
        let msg = error.message || 'Erro desconhecido';
        
        // Se for erro de status (ex: 500, 404), o cliente do supabase geralmente
        // encapsula isso.
        if (msg.includes("non-2xx")) {
            msg += ". (Verifique os logs da Edge Function no painel do Supabase. Possível falha de inicialização ou variáveis de ambiente ausentes.)";
        }
        
        throw new Error(`Falha de comunicação: ${msg}`);
    }

    if (!data) {
         throw new Error("A função não retornou dados. Resposta vazia.");
    }

    // Se a função retornou 200 mas com campo de erro (nosso catch manual)
    if (data.error) {
        throw new Error(data.error);
    }

    // Process logs returned from server
    if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((logMsg: string) => onLog(logMsg));
    }

    return data.count || 0;

  } catch (error: any) {
    onLog(`ERRO: ${error.message}`);
    throw error;
  }
};