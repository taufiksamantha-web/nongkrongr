import { GoogleGenAI } from "@google/genai";
import { Vibe } from '../types';

// Menggunakan VITE_GEMINI_API_KEY agar konsisten dan aman untuk client-side di Vercel.
const API_KEY = process.env.VITE_GEMINI_API_KEY || '';

if (!API_KEY) {
  console.error(
    "🛑 Kunci API Gemini tidak ditemukan! Fitur AI tidak akan berfungsi. " +
    "Pastikan Anda telah menambahkan VITE_GEMINI_API_KEY " +
    "ke Environment Variables di Vercel."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes An array of vibe objects associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: Vibe[]): Promise<string> => {
    if (!API_KEY) {
        throw new Error("Kunci API Gemini tidak dikonfigurasi.");
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
      // Re-throw a more user-friendly error to be caught by the UI
      throw new Error("Gagal membuat deskripsi dengan AI. Periksa kembali kunci API Anda.");
    }
  },
};