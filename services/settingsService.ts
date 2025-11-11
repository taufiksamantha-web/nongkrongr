import { supabase } from '../lib/supabaseClient';

export const settingsService = {
  /**
   * Mengambil nilai pengaturan berdasarkan kunci.
   * @param key Kunci dari pengaturan yang ingin diambil.
   * @returns Promise yang resolve ke nilai pengaturan atau null jika tidak ditemukan.
   */
  async getSetting(key: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();

    // Kode error 'PGRST116' berarti tidak ada baris yang ditemukan, ini bukan error fatal.
    if (error && error.code !== 'PGRST116') {
      console.error(`Error fetching setting for key "${key}":`, error);
      return null;
    }
    return data?.value || null;
  },

  /**
   * Memperbarui atau membuat pengaturan baru (upsert).
   * @param key Kunci dari pengaturan.
   * @param value Nilai baru untuk pengaturan.
   * @returns Promise yang resolve dengan objek berisi error jika ada.
   */
  async updateSetting(key: string, value: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    
    if (error) {
        console.error(`Error updating setting for key "${key}":`, error);
    }
    
    return { error };
  },
};
