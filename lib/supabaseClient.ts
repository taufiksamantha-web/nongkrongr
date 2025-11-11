import { createClient } from '@supabase/supabase-js';

// --- PERHATIAN PENTING ---
// Kredensial di bawah ini disematkan langsung agar aplikasi bisa berjalan di Google AI Studio.
// Lingkungan AI Studio tidak mendukung environment variables seperti Vercel.
//
// GANTI NILAI DI BAWAH INI DENGAN KREDENSIAL SUPABASE ANDA.
const FALLBACK_SUPABASE_URL = 'https://dbtgyptcwxghlevpfstq.supabase.co'; // <-- GANTI DENGAN URL SUPABASE ANDA
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidGd5cHRjd3hnaGxldnBmc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDkwMTksImV4cCI6MjA3ODMyNTAxOX0.dGYgAYSKBMf2DqjM8iVkoX3IqZnjDmBdASVUhpkSQvk'; // <-- GANTI DENGAN KUNCI ANON SUPABASE ANDA
// --------------------------------------------------------------------

// Prioritaskan environment variables dari Vercel/Vite.
// Jika tidak ada, gunakan nilai fallback di atas untuk AI Studio.
const supabaseUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || FALLBACK_SUPABASE_ANON_KEY;

// Beri peringatan di konsol jika placeholder belum diganti.
if (supabaseUrl.includes('YOUR_SUPABASE_URL')) {
  console.error(
    "🛑 KESALAHAN KONFIGURASI: Anda belum mengatur kredensial Supabase di `lib/supabaseClient.ts`. " +
    "Silakan buka file tersebut dan ganti nilai placeholder `FALLBACK_SUPABASE_URL` dan `FALLBACK_SUPABASE_ANON_KEY`."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
