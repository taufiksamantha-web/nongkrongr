
// This is a placeholder file to demonstrate where Gemini API logic would reside.
// The current application does not utilize the Gemini API, but if it were to,
// functions for interacting with the API would be here.

import { GoogleGenAI } from "@google/genai";

// Ensure the API key is handled securely, for example, via environment variables.
// In a real-world scenario, the client-side code would not have direct access to the API key.
// It would call a backend endpoint that then calls the Gemini API.
// For this frontend-only example, we'll assume a key is available if needed.
const API_KEY = process.env.API_KEY;

// Check if the API key is provided.
if (!API_KEY) {
    console.warn("Gemini API key not found. Gemini-related services will not be available.");
}

// Initialize the GoogleGenAI client if the API key exists.
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

export const geminiService = {
  /**
   * Generates a creative cafe description using the Gemini model.
   * @param cafeName The name of the cafe.
   * @param vibes A list of vibes associated with the cafe.
   * @returns A promise that resolves to a string containing the generated description.
   */
  generateCafeDescription: async (cafeName: string, vibes: string[]): Promise<string> => {
    if (!ai) {
        return Promise.resolve(`A beautiful cafe named ${cafeName} with vibes like ${vibes.join(', ')}.`);
    }

    try {
      const prompt = `Create a short, catchy, and aesthetic description for a cafe in Palembang called "${cafeName}". The vibes are: ${vibes.join(', ')}. Make it sound appealing to Gen Z.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.error("Error generating description with Gemini:", error);
      return "Discover your new favorite spot for coffee and creativity.";
    }
  },
};
