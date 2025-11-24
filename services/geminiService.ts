
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

// Helper untuk membersihkan string JSON dari format Markdown (```json ... ```)
const cleanJsonString = (text: string) => {
    if (!text) return "";
    // Hapus ```json di awal dan ``` di akhir, serta whitespace
    return text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
};

// Helper untuk inisialisasi client dengan error handling yang lebih baik
const getClient = () => {
    let apiKey = "";

    // CARA 1: Cek Import Meta (Khusus Vite - Paling Standar untuk Project ini)
    try {
        // @ts-ignore
        if (typeof import.meta !== "undefined" && import.meta.env) {
            // @ts-ignore
            apiKey = import.meta.env.VITE_API_KEY || import.meta.env.API_KEY || "";
        }
    } catch (e) {
        // Ignore error jika import.meta tidak didukung
    }

    // CARA 2: Cek Process Env (Fallback untuk Create React App / Node.js)
    if (!apiKey) {
        try {
            // Pengecekan aman agar tidak crash jika process undefined di browser
            if (typeof process !== "undefined" && process.env) {
                apiKey = process.env.REACT_APP_API_KEY || process.env.API_KEY || "";
            }
        } catch (e) {
            // Ignore error
        }
    }
    
    if (!apiKey) {
        console.error("FATAL: API Key tidak ditemukan. Pastikan Environment Variable 'VITE_API_KEY' sudah diset di Vercel.");
        throw new Error("Konfigurasi Server Belum Lengkap (API Key Missing)");
    }
    
    return new GoogleGenAI({ apiKey: apiKey });
};

export const analyzeHeadlineWithAI = async (headline: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Model cepat untuk teks
      contents: `Analisis judul/klaim berikut ini: "${headline}"`,
      config: {
        systemInstruction: `Kamu adalah 'SumselCekFakta AI', asisten verifikasi berita untuk masyarakat Sumatera Selatan.
        
        Tugasmu:
        1. Analisis apakah judul/berita yang diberikan berpotensi HOAX, FAKTA, atau DISINFORMASI.
        2. Jika itu topik umum (bansos, jalan rusak, loker), berikan tips verifikasi.
        3. Jawab dengan bahasa Indonesia yang santai, akrab, dan mudah dimengerti (seperti teman ngobrol).
        4. Jangan terlalu panjang, cukup 2-3 paragraf ringkas.
        
        Disclaimer: Selalu ingatkan user untuk mengecek sumber resmi pemerintah provinsi Sumsel.`,
        temperature: 0.7, 
      }
    });

    return response.text || "Waduh, AI lagi bingung nih bosku. Coba cek manual aja ya datanya.";
  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    
    // Error handling khusus agar user tahu kenapa gagal
    if (error.message.includes("API Key") || error.message.includes("Konfigurasi Server")) {
        return "Sistem Error: API Key belum disetting dengan benar di Vercel. Pastikan nama variablenya 'VITE_API_KEY'.";
    }
    if (error.toString().includes("403") || error.toString().includes("400")) {
        return "Akses Ditolak: Domain hosting ini mungkin belum diizinkan di Google AI Studio.";
    }
    
    return "Maaf bosku, kuota AI harian mungkin habis atau ada gangguan sinyal. Coba lagi besok ya!";
  }
};

// Fungsi deteksi Deepfake (Versi UPGRADED V5.0 - Gemini 2.5 Flash Vision Forensic)
export const analyzeImageForDeepfake = async (base64Image: string): Promise<any> => {
  try {
    const ai = getClient();
    
    // Hapus header data:image/png;base64, jika ada
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      // Menggunakan model gemini-2.5-flash yang lebih stabil untuk production dibanding preview
      model: 'gemini-2.5-flash', 
      contents: {
        parts: [
            { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
            { text: `Bertindaklah sebagai Ahli Forensik Digital Tingkat Tinggi. Misi kamu adalah mendeteksi manipulasi gambar yang SANGAT HALUS, terutama teknik 'Hybrid Inpainting' dimana Wajah Asli ditempel ke Badan/Pakaian AI.

            PENTING: Jangan tertipu oleh wajah yang terlihat asli. Fokus analisis kamu adalah KONSISTENSI antar elemen (Kepala vs Badan).

            Lakukan pemindaian visual mendalam (Deep Scan) dari atas ke bawah:

            1. 🕵️‍♂️ ANALISIS SAMBUNGAN LEHER (The Neck Seam):
               - Perhatikan area pertemuan dagu, leher, dan kerah baju.
               - Apakah ada bayangan yang hilang? Apakah warna kulit leher konsisten dengan wajah?

            2. 🔬 PERBANDINGAN TEKSTUR MIKRO (ISO Noise Check):
               - Bandingkan tekstur kulit wajah dengan tekstur kain baju/celana.
               - FOTO ASLI: Memiliki 'grain' atau noise kamera yang seragam.
               - FOTO EDITAN/AI: Wajah mungkin ber-noise (asli), tapi Baju/Celana terlihat terlalu halus seperti plastik/lilin.

            3. 🧵 LOGIKA FISIKA PAKAIAN & LIPATAN:
               - Perhatikan lipatan baju. Apakah mengikuti bentuk tubuh secara natural?
               - Cek ritsleting, kancing, dan jahitan. AI sering membuat kancing meleleh.

            4. 👣 KONSISTENSI CAHAYA:
               - Cek bayangan di lantai/celana. Apakah arah cahayanya sinkron dengan bayangan di wajah?

            OUTPUT JSON (Wajib):
            Berikan analisis kritis. Jika tekstur baju beda dengan muka, beri skor tinggi.
            ` }
        ]
      },
      config: {
        temperature: 0.1,
        // PENTING: Matikan Safety Settings agar analisis wajah tidak diblokir Google
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                score: { 
                    type: Type.NUMBER, 
                    description: "Persentase kemungkinan gambar dimanipulasi/AI (0-100)." 
                },
                verdict: { 
                    type: Type.STRING, 
                    description: "Kesimpulan singkat (Contoh: 'Deepfake', 'Original')." 
                },
                reason: { 
                    type: Type.STRING, 
                    description: "Penjelasan detil dalam Bahasa Indonesia." 
                },
                flags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Daftar poin mencurigakan."
                }
            },
            required: ["score", "verdict", "reason", "flags"]
        }
      }
    });

    // Validasi respons teks sebelum parsing
    const rawText = response.text;
    if (!rawText) {
        throw new Error("Respons AI kosong. Kemungkinan gambar diblokir oleh filter keamanan (Safety Filter).");
    }

    const cleanJson = cleanJsonString(rawText);
    return JSON.parse(cleanJson);

  } catch (error: any) {
    console.error("Deepfake Analysis Error:", error);
    
    let errorMsg = "Gagal Menganalisis (Server Error).";
    
    if (error.message && (error.message.includes("API Key") || error.message.includes("Konfigurasi Server"))) {
        errorMsg = "API Key bermasalah. Cek Vercel Settings.";
    } else if (error.toString().includes("403")) {
        errorMsg = "Akses Ditolak (403). Pastikan domain Vercel Anda sudah ditambahkan di Google AI Studio > API Key > URL Restrictions.";
    } else if (error.toString().includes("SAFETY")) {
        errorMsg = "Gambar ditolak oleh filter keamanan Google.";
    }

    return {
        score: 0,
        verdict: "Analisis Gagal",
        reason: `Sistem mendeteksi masalah: ${errorMsg}`,
        flags: ["System Error"]
    };
  }
};
