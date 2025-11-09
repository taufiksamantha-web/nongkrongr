/**
 * Converts a File object to a base64 encoded string.
 * This is useful for creating image previews or sending file data in JSON payloads.
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 data URL.
 */
export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};
