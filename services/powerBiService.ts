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

export const syncPowerBiToSupabase = async (
  onLog: (msg: string) => void
): Promise<number> => {
  try {
    onLog("Conectando ao servidor...");

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
        console.error("INVOKE ERROR:", error);
        
        let friendlyMsg = "";
        
        // Verifica erros comuns
        if (String(error).includes("Failed to send a request")) {
            friendlyMsg = "Não foi possível contactar a função. Verifique se ela foi implantada com 'npx supabase functions deploy quick-responder --no-verify-jwt'.";
        } else if (String(error).includes("401") || String(error).includes("403")) {
            friendlyMsg = "Erro de Permissão. Verifique se a função foi implantada com a flag '--no-verify-jwt'.";
        } else {
            friendlyMsg = `Erro de comunicação: ${error.message || error}`;
        }
        
        throw new Error(friendlyMsg);
    }

    // Se a função retornou 200 OK, mas enviou um erro no JSON
    if (data && data.error) {
        throw new Error(`Erro do Servidor: ${data.error}`);
    }

    if (!data) {
         throw new Error("A função não retornou dados.");
    }

    if (data.logs && Array.isArray(data.logs)) {
        data.logs.forEach((logMsg: string) => onLog(logMsg));
    }

    return data.count || 0;

  } catch (error: any) {
    const msg = error.message || "Erro desconhecido";
    onLog(`[FALHA] ${msg}`);
    throw error;
  }
};