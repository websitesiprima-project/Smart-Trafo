// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Pastikan Anda sudah punya .env di frontend dengan variable ini
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
