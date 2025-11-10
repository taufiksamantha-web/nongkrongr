import { createClient } from '@supabase/supabase-js';
import { Cafe, Review, Spot } from '../types';

// Augment Supabase types to match our schema for better type safety
export interface Database {
  public: {
    Tables: {
      cafes: {
        Row: Cafe;
        Insert: Omit<Cafe, 'id' | 'created_at'>;
        Update: Partial<Cafe>;
      };
      reviews: {
        Row: Review & { cafe_id: string };
        Insert: Omit<Review, 'id' | 'created_at'> & { cafe_id: string };
        Update: Partial<Review>;
      };
      spots: {
        Row: Spot & { cafe_id: string };
        Insert: Omit<Spot, 'id' | 'created_at'> & { cafe_id: string };
        Update: Partial<Spot>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
  };
}


// Fix: Use process.env to access environment variables, consistent with other parts of the app.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Fix: Use process.env to access environment variables, consistent with other parts of the app.
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);