import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Cek apakah URL dan Key ada
const isConfigValid = supabaseUrl && supabaseKey;

if (!isConfigValid) {
  console.warn(
    "⚠️ PERINGATAN: Supabase URL/Key belum disetting di .env. Aplikasi berjalan dalam mode terbatas."
  );
}

export const supabase = isConfigValid
  ? createClient(supabaseUrl, supabaseKey)
  : {
      // DUMMY CLIENT (Agar aplikasi tidak crash saat tidak ada koneksi)
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signOut: async () => {},
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null }),
          }),
          order: async () => ({ data: [], error: null }),
        }),
        insert: async () => ({ error: null }),
        delete: () => ({ eq: async () => ({ error: null }) }),
      }),
    };
