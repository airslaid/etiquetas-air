import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://tdkjmojllatcdhqhsucf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lki8dEXZi1dHuyAL57gGcA_ERp-_Gyy';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
