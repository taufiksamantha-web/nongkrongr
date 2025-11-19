import { supabase } from '../lib/supabaseClient';

export const settingsService = {
  /**
   * Mengambil nilai pengaturan berdasarkan kunci.
   * @param key Kunci dari pengaturan yang ingin diambil.
   * @returns Promise yang resolve ke nilai pengaturan atau null jika tidak ditemukan.
   */
  async getSetting(key: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error) {
        // Kode error 'PGRST116' berarti tidak ada baris yang ditemukan (no row found).
        if (error.code === 'PGRST116') {
          return null;
        }
        // Kode error '42P01' berarti tabel tidak ditemukan (relation does not exist).
        if (error.code === '42P01') {
           console.warn(`Settings table not found (42P01). Returning null for key: "${key}".`);
           return null;
        }

        // Log pesan error yang spesifik, bukan objeknya langsung untuk menghindari [object Object]
        console.error(`Error fetching setting for key "${key}":`, error.message || error);
        return null;
      }
      return data?.value || null;
    } catch (err: any) {
      console.error(`Unexpected error fetching setting for key "${key}":`, err.message || err);
      return null;
    }
  },

  /**
   * Memperbarui atau membuat pengaturan baru (upsert).
   * @param key Kunci dari pengaturan.
   * @param value Nilai baru untuk pengaturan.
   * @returns Promise yang resolve dengan objek berisi error jika ada.
   */
  async updateSetting(key: string, value: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });
      
      if (error) {
        console.error(`Error updating setting for key "${key}":`, error.message || error);
      }
      
      return { error };
    } catch (err: any) {
      console.error(`Unexpected error updating setting for key "${key}":`, err.message || err);
      return { error: err };
    }
  },
};