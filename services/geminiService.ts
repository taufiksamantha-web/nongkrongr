import { GoogleGenAI } from "@google/genai";
import { Vibe } from '../types';

// Assume API_KEY is available via process.env and is valid.
const API_KEY = process.env.API_KEY!;
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes An array of vibe objects associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: Vibe[]): Promise<string> => {
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
      throw new Error("Failed to generate description with AI. Please check the API key and try again.");
    }
  },
};
