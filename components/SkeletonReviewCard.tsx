import React from 'react';

const SkeletonReviewCard: React.FC = () => {
    return (
        <div className="bg-card rounded-3xl shadow-lg p-6 flex flex-col justify-between h-full border border-border animate-pulse">
            <div className="space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                    <div>
                        <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                    </div>
                    <div className="flex flex-col space-y-2 items-end">
                        <div className="h-5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <div className="h-5 w-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
            </div>
        </div>
    );
};

export default SkeletonReviewCard;
