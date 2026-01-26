import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Cek apakah config ada (Safe Check)
const isConfigValid = supabaseUrl && supabaseKey;

if (!isConfigValid) {
  console.error("⚠️ SUPABASE CONFIG MISSING! Cek file .env Anda.");
}

// Buat Client atau Dummy Client jika config kosong
export const supabase = isConfigValid
  ? createClient(supabaseUrl, supabaseKey)
  : {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null }),
            order: () => ({ data: [] }),
          }),
        }),
      }),
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signInWithPassword: async () => ({ data: null, error: new Error("Supabase not configured") }),
        signOut: async () => {},
      },
    };
