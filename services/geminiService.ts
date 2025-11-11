import { GoogleGenAI } from "@google/genai";
import { Vibe } from '../types';

// FIX: Per @google/genai guidelines, initialize the client directly with `process.env.API_KEY`. This resolves the `import.meta.env` error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes An array of vibe objects associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: Vibe[]): Promise<string> => {
    // FIX: Removed API key check per guidelines, as its presence is assumed.

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
      // FIX: Updated error message to be more generic and not mention API keys, as per guidelines.
      throw new Error("Gagal membuat deskripsi dengan AI.");
    }
  },
};
