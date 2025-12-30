
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rcnyclqjwdekfmqyxesg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjbnljbHFqd2Rla2ZtcXl4ZXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjI1NzMsImV4cCI6MjA3OTg5ODU3M30.O9Hjx0pkJTYO3UjJhCZltH854_Un48yynZTDvsXepyE';

// --- ROBUST STORAGE ADAPTER (AI STUDIO COMPATIBLE) ---
const memoryStorage: Record<string, string> = {};

// Cek apakah kita berada di lingkungan AI Studio (iframe)
const isAIStudio = () => {
    try {
        return window.self !== window.top || window.location.hostname.includes('aistudio.google.com');
    } catch (e) {
        return true;
    }
};

export const SafeStorage = {
  getItem: (key: string) => {
    if (isAIStudio()) return memoryStorage[key] || null;
    try {
      return localStorage.getItem(key);
    } catch {
      try { return sessionStorage.getItem(key); } catch { return memoryStorage[key] || null; }
    }
  },
  setItem: (key: string, value: string) => {
    if (isAIStudio()) {
        memoryStorage[key] = value;
        return;
    }
    try {
      localStorage.setItem(key, value);
    } catch {
      try { sessionStorage.setItem(key, value); } catch { memoryStorage[key] = value; }
    }
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
    try { localStorage.removeItem(key); } catch {}
    try { sessionStorage.removeItem(key); } catch {}
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: SafeStorage, 
  }
});
