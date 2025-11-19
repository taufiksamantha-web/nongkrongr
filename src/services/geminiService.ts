
import { GoogleGenAI, Type } from "@google/genai";
import { Vibe } from '../types';

export type AiRecommendationParams = {
    vibes: string[];
    amenities: string[];
    maxPriceTier: number;
    sortBy: 'aesthetic' | 'work' | 'quiet';
    reasoning: string;
}

/**
 * Membuat instance klien AI baru.
 * @throws Error jika Kunci API tidak tersedia sama sekali.
 */
const getAiClient = (): GoogleGenAI => {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        throw new Error("Klien Gemini AI tidak diinisialisasi. Kunci API tidak tersedia di process.env.API_KEY.");
    }
    
    return new GoogleGenAI({ apiKey });
};

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes An array of vibe objects associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: Vibe[]): Promise<string> => {
    const ai = getAiClient(); // Inisialisasi klien saat dibutuhkan
    const vibeNames = vibes.map(v => v.name).join(', ') || 'unique';
    // FIX: Updated prompt to be more specific for better AI output.
    const prompt = `Create a short, catchy, and aesthetic description for a cafe in South Sumatra called "${cafeName}". The description should be one paragraph, written in Indonesian, and appeal to Gen Z. Highlight its ${vibeNames} vibes.`;
      
    try {
      // FIX: Use the recommended 'gemini-2.5-flash' model.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text || '';
    } catch (error) {
      console.error("Error generating description with Gemini:", error);
      if (error instanceof Error) {
          // Check for specific, user-actionable errors
          if (error.message.includes('API key not valid')) {
              throw new Error('Gagal: Kunci API Gemini tidak valid. Harap periksa kembali kunci Anda.');
          }
          if (error.message.toLowerCase().includes('quota')) {
              throw new Error('Gagal: Kuota API Gemini Anda telah terlampaui.');
          }
          // For other errors, pass a more generic but still informative message
          throw new Error(`Gagal membuat deskripsi: ${error.message}`);
      }
      // Fallback for non-Error objects
      throw new Error("Terjadi kesalahan yang tidak diketahui saat menghubungi layanan AI.");
    }
  },

  /**
   * Generates structured cafe filter parameters from a user's natural language prompt.
   * @param userPrompt The user's request in Indonesian.
   * @returns A promise that resolves to a structured AiRecommendationParams object.
   */
  getCafeRecommendations: async (userPrompt: string): Promise<AiRecommendationParams> => {
    const ai = getAiClient(); // Inisialisasi klien saat dibutuhkan
    const systemInstruction = `You are an expert cafe recommender for the province of South Sumatra. Your goal is to understand a user's request in Indonesian and translate it into a structured JSON object that can be used to filter a list of cafes. You must only respond with the JSON object defined in the schema.
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

      const jsonString = (response.text || '').trim();
      const parsedJson = JSON.parse(jsonString);
      
      if (typeof parsedJson !== 'object' || parsedJson === null) {
          throw new Error("AI response is not a valid JSON object.");
      }
      
      return parsedJson as AiRecommendationParams;

    } catch (error) {
      console.error("Error getting cafe recommendations from Gemini:", error);
      throw error; // Melempar error asli untuk ditangani oleh komponen
    }
  },

  /**
   * Converts a Google Maps Plus Code into latitude and longitude coordinates.
   * @param plusCode The Plus Code string (e.g., "6P5G2QG8+R8").
   * @returns A promise that resolves to an object with lat and lng coordinates.
   */
  convertPlusCodeToCoords: async (plusCode: string): Promise<{ lat: number; lng: number }> => {
    const ai = getAiClient();
    const systemInstruction = `You are a highly accurate geocoding assistant. Your task is to convert a Google Maps Plus Code into precise latitude and longitude coordinates. You must only respond with a JSON object matching the defined schema. Do not add any extra text or explanations.`;
    
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            lat: {
                type: Type.NUMBER,
                description: "The latitude coordinate.",
            },
            lng: {
                type: Type.NUMBER,
                description: "The longitude coordinate.",
            },
        },
        required: ['lat', 'lng']
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Convert this Plus Code to coordinates: ${plusCode}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const jsonString = (response.text || '').trim();
        const parsedJson = JSON.parse(jsonString);

        if (typeof parsedJson.lat !== 'number' || typeof parsedJson.lng !== 'number') {
            throw new Error("Invalid coordinate format received from AI.");
        }

        return parsedJson as { lat: number; lng: number };
    } catch (error) {
        console.error("Error converting Plus Code with Gemini:", error);
        throw new Error("Gagal mengonversi Plus Code. Pastikan kode valid dan coba lagi.");
    }
  },
};
