// In a real-world app, these would be in a .env file
const CLOUDINARY_CLOUD_NAME = 'dovouihq8';

// --- SECURITY NOTE ---
// The API Key and Secret should NEVER be exposed on the client-side.
// Doing so would allow anyone to gain full access to your Cloudinary account.
// Therefore, this application uses an 'unsigned' upload method, which is secure
// for client-side operations as it relies on a pre-configured, restricted preset
// in your Cloudinary dashboard instead of a secret key.

// IMPORTANT: This 'upload_preset' must be created in your Cloudinary account dashboard.
// Go to Settings -> Upload -> Upload Presets.
// It MUST be an 'unsigned' preset for client-side uploads to work without an API secret.
// For security, configure it to only allow specific file types (e.g., images) and
// assign it to a specific folder.
const CLOUDINARY_UPLOAD_PRESET = 'nongkrongr_uploads'; 

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export const cloudinaryService = {
  /**
   * Uploads a base64 encoded image to Cloudinary using an unsigned preset.
   * @param base64Image The image encoded as a base64 data URL.
   * @returns The secure URL of the uploaded image.
   * @throws An error if the upload fails.
   */
  uploadImage: async (base64Image: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        // Throw an error with the message from Cloudinary if available
        throw new Error(data.error?.message || 'Cloudinary image upload failed with status: ' + response.status);
      }

      return data.secure_url;
    } catch (error) {
      console.error('Error uploading image to Cloudinary:', error);
      // Re-throw the error so the calling component can handle it
      throw error;
    }
  },
};
