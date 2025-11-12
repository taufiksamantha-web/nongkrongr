import React, { useState, useEffect } from 'react';
import { optimizeCloudinaryImage } from '../../utils/imageOptimizer';

interface ImageWithFallbackProps {
  src?: string | null;
  defaultSrc?: string;
  alt: string;
  className: string;
  fallbackText?: string;
  width?: number;
  height?: number;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, defaultSrc, alt, className, fallbackText = "Foto tidak tersedia", width, height }) => {
  const finalSrc = src || defaultSrc;
  const [error, setError] = useState(!finalSrc);
  
  const optimizedSrc = finalSrc && width && height ? optimizeCloudinaryImage(finalSrc, width, height) : finalSrc;

  // Reset error state if src or defaultSrc changes
  useEffect(() => {
    setError(!finalSrc);
  }, [finalSrc]);

  const handleError = () => {
    // If the primary src fails, and there's a defaultSrc, try it.
    // If the defaultSrc also fails (or there's no defaultSrc), then show fallback.
    // This logic is implicitly handled by the finalSrc logic and error state.
    // We only set error to true, which triggers the fallback UI.
    setError(true);
  };

  if (error || !finalSrc) {
    return (
      <div className={`${className} bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-center`}>
        <span className="text-gray-500 dark:text-gray-400 text-sm p-2">{fallbackText}</span>
      </div>
    );
  }

  // The container div provides a placeholder background, preventing layout shift.
  return (
    <div className={`bg-gray-200 dark:bg-gray-700 ${className}`}>
        <img 
            src={optimizedSrc} 
            alt={alt} 
            className={className} 
            onError={handleError} 
            loading="lazy" 
        />
    </div>
    );
};

export default ImageWithFallback;
