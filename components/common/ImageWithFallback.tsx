import React, { useState, useEffect } from 'react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className: string;
  fallbackText?: string;
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, className, fallbackText = "Foto tidak tersedia" }) => {
  const [error, setError] = useState(!src);

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

  return <img src={src!} alt={alt} className={className} onError={handleError} loading="lazy" />;
};

export default ImageWithFallback;
