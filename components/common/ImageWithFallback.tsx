import React, { useState, useEffect } from 'react';
import { optimizeCloudinaryImage } from '../../utils/imageOptimizer';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className: string;
  fallbackText?: string;
  width?: number;
  height?: number;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, className, fallbackText = "Foto tidak tersedia", width, height }) => {
  const [error, setError] = useState(!src);
  
  const optimizedSrc = src && width && height ? optimizeCloudinaryImage(src, width, height) : src;

  // Reset error state if src changes
  useEffect(() => {
    setError(!src);
  }, [src]);

  const handleError = () => {
    setError(true);
  };

  if (error) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-center`}>
        <span className="text-gray-500 dark:text-gray-400 text-sm p-2">{fallbackText}</span>
      </div>
    );
  }

  // The container div now provides a placeholder background, using the same dimensions
  // as the image to prevent layout shift. This improves the visual experience of lazy loading.
  return (
    <div className={`bg-gray-200 dark:bg-gray-700 ${className}`}>
        <img 
            src={optimizedSrc!} 
            alt={alt} 
            className={className} 
            onError={handleError} 
            loading="lazy" 
        />
    </div>
    );
};

export default ImageWithFallback;
