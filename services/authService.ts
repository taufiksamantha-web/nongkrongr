
import { supabase } from './supabaseClient';

export const loginAdmin = async (username: string, pass: string): Promise<boolean> => {
  try {
    // Mengambil user yang cocok dengan username dan password
    // NOTE: Dalam aplikasi production, password WAJIB di-hash (misal pakai bcrypt).
    // Untuk demo ini kita gunakan direct matching.
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', username)
      .eq('password', pass)
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (err) {
    console.error("Login error:", err);
    return false;
  }
};
