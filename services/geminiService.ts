import { GoogleGenAI, Type } from "@google/genai";
import { Vibe } from '../types';

export type AiRecommendationParams = {
    vibes: string[];
    amenities: string[];
    maxPriceTier: number;
    sortBy: 'aesthetic' | 'work' | 'quiet';
    reasoning: string;
}

// Kunci API diambil secara eksklusif dari process.env.API_KEY sesuai pedoman.
const apiKey = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.error(
    "🛑 Kunci API Gemini tidak ditemukan! Fitur AI tidak akan berfungsi. " +
    "Pastikan variabel environment API_KEY sudah diatur."
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

  /**
   * Generates structured cafe filter parameters from a user's natural language prompt.
   * @param userPrompt The user's request in Indonesian.
   * @returns A promise that resolves to a structured AiRecommendationParams object.
   */
  getCafeRecommendations: async (userPrompt: string): Promise<AiRecommendationParams> => {
    if (!ai) {
      throw new Error("Klien Gemini AI tidak diinisialisasi.");
    }

    const systemInstruction = `You are an expert cafe recommender for the city of Palembang. Your goal is to understand a user's request in Indonesian and translate it into a structured JSON object that can be used to filter a list of cafes. You must only respond with the JSON object defined in the schema.
    - Analyze the user's prompt for keywords related to vibes, amenities, price, and purpose.
    - For vibes, use one or more from: 'cozy', 'minimalis', 'industrial', 'tropical', 'classic'.
    - For amenities, use one or more from: 'wifi', 'power' (for power outlets/colokan), 'ac', 'outdoor', 'indoor', 'musholla', 'parking'.
    - For price, 'mahal'/'premium' means maxPriceTier 3 or 4. 'murah'/'terjangkau' means maxPriceTier 1 or 2. Default to 4 if not specified.
    - For purpose (sortBy), 'nugas'/'kerja'/'belajar' maps to 'work'. 'sepi' maps to 'quiet'. 'foto'/'cantik'/'instagramable' maps to 'aesthetic'. Default to 'aesthetic'.
    - The 'reasoning' field should be a short, friendly sentence in Indonesian summarizing your understanding of the user's request. Example: "Oke, aku carikan cafe yang cozy dengan wifi kencang untukmu!"`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        vibes: {
          type: Type.ARRAY,
          description: "A list of vibe IDs that match the user request. Possible values are: 'cozy', 'minimalis', 'industrial', 'tropical', 'classic'.",
          items: { type: Type.STRING }
        },
        amenities: {
          type: Type.ARRAY,
          description: "A list of amenity IDs that match the user request. Possible values are: 'wifi', 'power', 'ac', 'outdoor', 'indoor', 'musholla', 'parking'.",
          items: { type: Type.STRING }
        },
        maxPriceTier: {
          type: Type.INTEGER,
          description: "The maximum price tier (1-4). Default to 4 if not specified by user.",
        },
        sortBy: {
          type: Type.STRING,
          description: "The primary sorting criteria. Possible values: 'aesthetic', 'work', 'quiet'. Default is 'aesthetic'.",
        },
        reasoning: {
          type: Type.STRING,
          description: 'A short, friendly sentence in Indonesian explaining why these recommendations were chosen, based on the user prompt.'
        }
      },
      required: ['vibes', 'amenities', 'maxPriceTier', 'sortBy', 'reasoning']
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      const jsonString = response.text.trim();
      const parsedJson = JSON.parse(jsonString);
      
      if (typeof parsedJson !== 'object' || parsedJson === null) {
          throw new Error("AI response is not a valid JSON object.");
      }
      
      return parsedJson as AiRecommendationParams;

    } catch (error) {
      console.error("Error getting cafe recommendations from Gemini:", error);
      throw new Error("Gagal mendapatkan rekomendasi dari AI.");
    }
  },
};
