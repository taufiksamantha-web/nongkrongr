import { createClient } from '@supabase/supabase-js';

// --- Kredensial Supabase sekarang diambil dari Environment Variables ---
// Ini adalah cara yang aman dan standar untuk production.
// Pastikan Anda telah mengatur variabel-variabel ini di pengaturan proyek Vercel Anda.

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "🛑 Kredensial Supabase tidak ditemukan! Aplikasi mungkin tidak berfungsi dengan benar. " +
    "Pastikan Anda telah menambahkan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY " +
    "ke Environment Variables di Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);