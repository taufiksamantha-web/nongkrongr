import React from 'react';
import { Link } from 'react-router-dom';
import { Review } from '../types';
import { StarIcon, BriefcaseIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';

type TopReview = Review & { cafeName: string; cafeSlug: string };

interface ReviewCardProps {
  review: TopReview;
  animationDelay?: string;
}

const RatingBadge: React.FC<{ icon: React.ReactNode, score: number, color: string }> = ({ icon, score, color }) => (
    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-bold text-white ${color}`}>
        {icon}
        <span>{score}</span>
    </div>
);

const ReviewCard: React.FC<ReviewCardProps> = ({ review, animationDelay }) => {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-6 flex flex-col justify-between h-full transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl dark:border dark:border-gray-700 animate-fade-in-up"
      style={{ animationDelay }}
    >
      <div>
        <p className="text-5xl text-primary font-bold opacity-20">“</p>
        <p className="text-gray-700 dark:text-gray-300 italic -mt-6 line-clamp-4">
          {review.text}
        </p>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center">
            <div>
                <p className="font-bold text-gray-800 dark:text-gray-100">{review.author}</p>
                <Link to={`/cafe/${review.cafeSlug}`} className="text-sm text-primary hover:underline font-semibold">
                    di {review.cafeName}
                </Link>
            </div>
            <div className="flex flex-col space-y-1 items-end">
                <RatingBadge icon={<StarIcon className="h-3 w-3" />} score={review.ratingAesthetic} color="bg-accent-pink" />
                <RatingBadge icon={<BriefcaseIcon className="h-3 w-3" />} score={review.ratingWork} color="bg-secondary" />
            </div>
        </div>
        {review.photos && review.photos.length > 0 && (
             <ImageWithFallback 
                src={review.photos[0]} 
                alt={`Review by ${review.author}`} 
                className="mt-4 w-full h-24 object-cover rounded-xl"
                width={250}
                height={150}
             />
        )}
      </div>
    </div>
  );
};

export default ReviewCard;
