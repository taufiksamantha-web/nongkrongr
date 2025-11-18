/**
 * Converts a File object to a base64 encoded string with compression and resizing.
 * This ensures images uploaded to Cloudinary are optimized for desktop screens (max 1920px)
 * and file sizes are kept small.
 * 
 * @param file The file to convert.
 * @returns A promise that resolves with the compressed base64 data URL.
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920; // Limit width for desktop screens
                const MAX_HEIGHT = 1920;
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Could not get canvas context"));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.8 quality (good balance)
                // This significantly reduces file size compared to raw PNG/JPEG
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(compressedDataUrl);
            };

            img.onerror = (error) => reject(error);
        };
        
        reader.onerror = (error) => reject(error);
    });
};