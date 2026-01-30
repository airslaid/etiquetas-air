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