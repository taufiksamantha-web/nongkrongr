import React from 'react';

const SkeletonCard: React.FC = () => {
  return (
    <div className="bg-card rounded-3xl shadow-lg overflow-hidden border border-border">
      <div className="relative">
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent">
          <div className="h-7 bg-gray-300 dark:bg-gray-600 rounded w-3/4 animate-pulse mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          </div>
          <div className="h-7 w-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
