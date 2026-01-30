import { createClient } from '@supabase/supabase-js';

// URL do Projeto
// Usamos optional chaining (?.) porque em alguns ambientes sem build (ex: browser direto), import.meta.env pode ser undefined.
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://tdkjmojllatcdhqhsucf.supabase.co';

// Chave de API (Anon/Public) atualizada
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRka2ptb2psbGF0Y2RocWhzdWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MjgyNTcsImV4cCI6MjA4NTAwNDI1N30.-9NcFWRBY6N8jYAtTY6K46PT0xDwBVpw_CmLgcMuP2M'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);