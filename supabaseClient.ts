import { createClient } from '@supabase/supabase-js';

// URL do Projeto (Copiado da sua print)
export const SUPABASE_URL = 'https://tdkjmojllatcdhqhsucf.supabase.co';

// Anon Key (Pública - Usada apenas para leitura no site)
// Copiado do campo "Anon Key (Legacy)" da sua print
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2ptb2psbGF0Y2RoZWhzdWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MDgyMzMsImV4cCI6MjA1NjA4NDIzM30.qXQkOtnlXJg-aPqV_iQOaHk_gC-wL0q_E0p_O0q_O0g'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);