/**
 * Optimizes a Cloudinary image URL by adding transformation parameters for resizing,
 * quality, and format.
 * @param url The original Cloudinary image URL.
 * e.g., "https://res.cloudinary.com/dovouihq8/image/upload/v1722244300/cover-placeholder-1_pqz5kl.jpg"
 * @param width The target width of the image.
 * @param height The target height of the image.
 * @returns The new URL with optimization parameters.
 * e.g., "https://res.cloudinary.com/dovouihq8/image/upload/w_400,h_300,c_fill,g_auto,q_auto:good,f_auto/v1722244300/cover-placeholder-1_pqz5kl.jpg"
 */
export const optimizeCloudinaryImage = (url: string, width: number, height: number): string => {
  if (!url || !url.includes('cloudinary.com')) {
    return url;
  }

  // Transformations:
  // w_{width}, h_{height}: resize to specific width and height
  // c_fill: crop to fill the given dimensions without distortion
  // g_auto: automatically focus on the most interesting part of the image when cropping
  // q_auto:good: automatically adjust compression to a "good" quality level
  // f_auto: automatically deliver the most optimal format (like WebP or AVIF)
  const transformations = `w_${width},h_${height},c_fill,g_auto,q_auto:good,f_auto`;

  const urlParts = url.split('/upload/');
  if (urlParts.length !== 2) {
    // URL doesn't match the expected format, return original
    return url;
  }

  // Check if transformations already exist (e.g., /upload/w_100,h_100/v1234/...)
  const versionAndPath = urlParts[1];
  const pathParts = versionAndPath.split('/');
  
  // If the first part after /upload/ looks like a transformation string, don't add another one.
  // This is a basic check and might need to be more robust for complex URLs.
  if (pathParts[0].includes('w_') || pathParts[0].includes('h_') || pathParts[0].includes('c_')) {
      return url;
  }

  return `${urlParts[0]}/upload/${transformations}/${urlParts[1]}`;
};
