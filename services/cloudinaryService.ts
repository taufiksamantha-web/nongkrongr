
/**
 * Service untuk upload gambar ke Cloudinary
 * Pastikan kamu sudah membuat Unsigned Upload Preset di Dashboard Cloudinary
 * Settings > Upload > Upload presets > Add upload preset (Mode: Unsigned)
 */

const CLOUD_NAME = 'dovouihq8'; // GANTI DENGAN CLOUD NAME KAMU
const UPLOAD_PRESET = 'cekfakta'; // GANTI DENGAN UPLOAD PRESET KAMU (UNSIGNED)

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Gagal upload gambar');
    }

    const data = await response.json();
    return data.secure_url; // Mengembalikan URL gambar yang sudah dihost
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    // Fallback untuk demo jika credential belum diset, menggunakan placeholder
    // Dalam production, ini harus throw error
    return URL.createObjectURL(file); 
  }
};
