import { GoogleGenAI } from "@google/genai";
import { Vibe } from '../types';

// Pendekatan yang lebih aman dan universal untuk mengambil kunci API.
// Ini memeriksa keberadaan setiap objek lingkungan sebelum mengaksesnya untuk menghindari crash.
let apiKey: string | undefined;

// Coba dapatkan kunci dari lingkungan Vite/Vercel (import.meta.env)
if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
  apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
}

// Jika tidak ditemukan di lingkungan Vite, coba dapatkan dari lingkungan AI Studio (process.env)
if (!apiKey && typeof process !== 'undefined' && process.env) {
  apiKey = process.env.API_KEY;
}

let ai: GoogleGenAI | null = null;

// Inisialisasi "lazy" untuk mencegah aplikasi crash jika kunci API tidak ada di kedua lingkungan.
// Inisialisasi dengan parameter bernama { apiKey: ... } seperti yang disyaratkan.
if (apiKey) {
  ai = new GoogleGenAI({ apiKey: apiKey });
} else {
  console.error(
    "🛑 Kunci API Gemini tidak ditemukan! Fitur AI tidak akan berfungsi. " +
    "Pastikan variabel environment VITE_GEMINI_API_KEY (Vercel) atau API_KEY (AI Studio) sudah diatur."
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
