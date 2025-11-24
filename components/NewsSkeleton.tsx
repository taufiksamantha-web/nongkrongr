import React from 'react';

const NewsSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 overflow-hidden flex flex-col h-full animate-pulse">
      {/* Image Placeholder */}
      <div className="h-52 bg-gray-200 dark:bg-navy-700 w-full relative">
        <div className="absolute top-4 right-4 w-20 h-6 bg-gray-300 dark:bg-navy-600 rounded"></div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col space-y-4">
        {/* Meta Tags Placeholder */}
        <div className="flex items-center space-x-3">
          <div className="h-5 w-20 bg-gray-200 dark:bg-navy-700 rounded"></div>
          <div className="h-5 w-24 bg-gray-200 dark:bg-navy-700 rounded"></div>
        </div>
        
        {/* Title Placeholder */}
        <div className="space-y-2">
          <div className="h-7 w-full bg-gray-300 dark:bg-navy-600 rounded"></div>
          <div className="h-7 w-2/3 bg-gray-300 dark:bg-navy-600 rounded"></div>
        </div>
        
        {/* Content Placeholder */}
        <div className="space-y-2 flex-1 pt-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-navy-700 rounded"></div>
          <div className="h-4 w-full bg-gray-200 dark:bg-navy-700 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-navy-700 rounded"></div>
        </div>
        
        {/* Footer/Badge Placeholder */}
        <div className="pt-4 mt-auto border-t border-gray-100 dark:border-navy-700">
           <div className="h-8 w-28 bg-gray-200 dark:bg-navy-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
};

export default NewsSkeleton;