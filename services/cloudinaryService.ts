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

// Constants for the JSON database file
// This ID ensures that uploads from the admin panel overwrite the correct file.
const DATABASE_PUBLIC_ID = 'database';
// This is the direct URL to fetch the raw database file.
export const DATABASE_URL = 'https://res.cloudinary.com/dovouihq8/raw/upload/database.json';


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

  /**
   * Uploads the entire cafe database as a JSON file to Cloudinary.
   * Overwrites the existing file by using a fixed public_id.
   * @param data The array of Cafe objects to be saved.
   * @throws An error if the upload fails.
   */
  uploadDatabase: async (data: any): Promise<void> => {
    const jsonData = JSON.stringify(data, null, 2); // Pretty print JSON
    const blob = new Blob([jsonData], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, 'database.json');
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', DATABASE_PUBLIC_ID);
    formData.append('resource_type', 'raw');
    
    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error?.message || 'Cloudinary database upload failed with status: ' + response.status);
      }
      
      console.log('Database successfully uploaded to Cloudinary.');
    } catch (error) {
      console.error('Error uploading database to Cloudinary:', error);
      throw error;
    }
  }
};