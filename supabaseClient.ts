import { createClient } from '@supabase/supabase-js';

// URL do Projeto
export const SUPABASE_URL = 'https://tdkjmojllatcdhqhsucf.supabase.co';

// Anon Key (Pública - Usada apenas para leitura no site)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2ptb2psbGF0Y2RoZWhzdWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MDgyMzMsImV4cCI6MjA1NjA4NDIzM30.qXQkOtnlXJg-aPqV_iQOaHk_gC-wL0q_E0p_O0q_O0g'; 

// Verificação de segurança no console
if (!SUPABASE_KEY) {
  console.error("Supabase Key está vazia!");
} else {
  console.log("Supabase Client inicializado para:", SUPABASE_URL);
}

// CONFIGURAÇÃO CRÍTICA PARA CORRIGIR "FAILED TO FETCH":
// 1. persistSession: false -> Evita erros em iframes/previews que bloqueiam LocalStorage.
// 2. autoRefreshToken: false -> Desnecessário para site público.
export const supabase = createClient(SUPABASE_URL.trim(), SUPABASE_KEY.trim(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});