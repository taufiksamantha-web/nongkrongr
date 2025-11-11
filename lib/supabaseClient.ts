import { createClient } from '@supabase/supabase-js';

// --- Kredensial Supabase sekarang diambil dari Environment Variables ---
// Di lingkungan client-side (browser) seperti ini, kita menggunakan import.meta.env
// untuk mengakses variabel yang diekspos oleh build tool (seperti Vite/Vercel).

// FIX: Cast `import.meta` to `any` to bypass TypeScript error about missing `env` property for VITE environment variables.
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "🛑 Kredensial Supabase tidak ditemukan! Aplikasi mungkin tidak berfungsi dengan benar. " +
    "Pastikan Anda telah menambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY " +
    "ke Environment Variables di Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
