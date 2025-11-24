
import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-blue-100 dark:border-navy-700 border-t-blue-600 dark:border-t-blue-400 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
        </div>
      </div>
      <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium text-sm animate-pulse">
        Memuat halaman...
      </p>
    </div>
  );
};

export default LoadingScreen;
