import React from 'react';

const SkeletonFeaturedCard: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-card/80 dark:bg-card/70 rounded-4xl border-2 border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden animate-pulse">
        <div className="grid md:grid-cols-2">
          <div className="md:col-span-1 aspect-[4/3] md:aspect-auto bg-gray-200 dark:bg-gray-700">
          </div>
          <div className="md:col-span-1 p-6 flex flex-col">
            <div>
              <div className="h-6 w-48 bg-gray-300 dark:bg-gray-600 rounded-full mb-4"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-full mb-1"></div>
              <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-5/6 mb-4"></div>
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex items-center space-x-2">
                    <div className="space-y-1">
                        <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                </div>
                 <div className="flex items-center space-x-2">
                   <div className="space-y-1">
                        <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        <div className="h-6 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
    </div>
  );
};

export default SkeletonFeaturedCard;
