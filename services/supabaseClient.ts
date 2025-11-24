
import { createClient } from '@supabase/supabase-js';

// GANTI DENGAN SUPABASE URL DAN ANON KEY ANDA
// Jika menggunakan environment variables:
const supabaseUrl = process.env.SUPABASE_URL || 'https://aphxtzzyhlkfokpvwiqk.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwaHh0enp5aGxrZm9rcHZ3aXFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Mzc0MjEsImV4cCI6MjA3ODMxMzQyMX0.0282GRJNa1-upmVYusI4gyylg4APTb_OO-ZV0zL6L-E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
