import { GoogleGenAI } from "@google/genai";
import { Vibe } from '../types';

// Sesuai pedoman, kunci API harus diambil secara eksklusif dari process.env.API_KEY.
// Lingkungan eksekusi diharapkan menyediakan variabel ini secara otomatis.
let ai: GoogleGenAI | null = null;

// Inisialisasi "lazy" untuk mencegah aplikasi crash jika kunci API tidak ada.
// Inisialisasi dengan parameter bernama { apiKey: ... } seperti yang disyaratkan.
if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.error(
    "🛑 Kunci API Gemini tidak ditemukan! Fitur AI tidak akan berfungsi. " +
    "Pastikan variabel environment API_KEY sudah diatur di Vercel."
  );
}

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes An array of vibe objects associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: Vibe[]): Promise<string> => {
    // Periksa apakah client AI berhasil diinisialisasi.
    if (!ai) {
      throw new Error("Klien Gemini AI tidak diinisialisasi. Pastikan API_KEY sudah dikonfigurasi dengan benar.");
    }

    const vibeNames = vibes.map(v => v.name).join(', ') || 'unique';
    const prompt = `Create a short, catchy, and aesthetic description for a cafe in Palembang called "${cafeName}". The cafe's vibes are: ${vibeNames}. The description should be one paragraph, written in Indonesian, and appeal to Gen Z.`;
      
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error("Error generating description with Gemini:", error);
      // Tampilkan error yang lebih ramah ke UI
      throw new Error("Gagal membuat deskripsi dengan AI.");
    }
  },
};
