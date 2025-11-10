import { createClient } from '@supabase/supabase-js';

// --- 🛑 IMPORTANT: ACTION REQUIRED 🛑 ---
// The application was crashing because Supabase credentials were not provided.
// To make the app functional, you MUST replace the placeholder values below
// with your actual Supabase Project URL and Public Anon Key.
//
// You can find these credentials in your Supabase project's dashboard under:
// Project Settings > API
//
// The app will load now, but will not be able to fetch or save data until
// you provide valid credentials.
//
// In a real-world application, these secrets should be stored in environment
// variables (e.g., a .env file) and not hardcoded.

const supabaseUrl = 'https://dbtgyptcwxghlevpfstq.supabase.co'; // <-- REPLACE WITH YOUR SUPABASE URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRidGd5cHRjd3hnaGxldnBmc3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NDkwMTksImV4cCI6MjA3ODMyNTAxOX0.dGYgAYSKBMf2DqjM8iVkoX3IqZnjDmBdASVUhpkSQvk'; // <-- REPLACE WITH YOUR SUPABASE ANON KEY

// We have removed the error that was crashing the app.
// You must provide valid credentials above for Supabase features to work.

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
