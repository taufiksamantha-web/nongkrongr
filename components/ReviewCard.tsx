import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { StarIcon, BriefcaseIcon, HandThumbUpIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';

type TopReview = Review & { cafeName: string; cafeSlug: string };

interface ReviewCardProps {
  review: TopReview;
  animationDelay?: string;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, animationDelay }) => {
  const cafeContext = useContext(CafeContext);
  const [voted, setVoted] = useState(false);
  const storageKey = `voted_review_${review.id}`;

  useEffect(() => {
    if (localStorage.getItem(storageKey)) {
        setVoted(true);
    }
  }, [storageKey]);

  const handleVote = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (voted || !cafeContext) return;
      
      // Set UI to voted state first for immediate feedback
      setVoted(true);
      localStorage.setItem(storageKey, 'true');

      const { error } = await cafeContext.incrementHelpfulCount(review.id);

      if (error) {
        // If DB update failed, revert UI changes and inform user
        setVoted(false);
        localStorage.removeItem(storageKey);
        alert('Gagal menyimpan vote. Perubahan telah dibatalkan. Silakan coba lagi.');
      }
  };
  
  const content = (
    <div>
      <div className="flex justify-between items-start">
        <p className="text-5xl text-brand font-bold opacity-20 -ml-2">“</p>
      </div>
      <p className="text-muted italic -mt-8 line-clamp-4">
        {review.text}
      </p>
    </div>
  );

  return (
    <div 
      className="bg-card rounded-3xl shadow-lg p-6 flex flex-col h-full transform transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-xl border border-border animate-fade-in-up review-card-optimized"
      style={{ animationDelay }}
    >
      <div className="flex-grow">
          {review.photos && review.photos.length > 0 && review.photos[0] 
            ? content 
            : <Link to={`/cafe/${review.cafeSlug}`} className="block h-full">{content}</Link>
          }
      </div>

      <div className="mt-4 pt-4 border-t border-border">
          {review.photos && review.photos.length > 0 && review.photos[0] && (
            <Link to={`/cafe/${review.cafeSlug}`} className="block mb-4">
                <ImageWithFallback 
                  src={review.photos[0]} 
                  alt={`Review by ${review.author}`} 
                  className="w-full h-24 object-cover rounded-xl"
                  width={250}
                  height={150}
                />
            </Link>
        )}
        <div className="flex justify-around items-center my-4 text-center">
            <div>
                <p className="font-bold text-2xl text-accent-pink">{review.ratingAesthetic}</p>
                <p className="text-xs text-muted font-semibold flex items-center gap-1 justify-center"><StarIcon className="h-3 w-3"/> ESTETIK</p>
            </div>
            <div>
                <p className="font-bold text-2xl text-accent-cyan">{review.ratingWork}</p>
                <p className="text-xs text-muted font-semibold flex items-center gap-1 justify-center"><BriefcaseIcon className="h-3 w-3"/> NUGAS</p>
            </div>
        </div>
        <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <img
                    src={review.author_avatar_url || `https://ui-avatars.com/api/?name=${review.author.replace(/\s/g, '+')}&background=random&color=fff`}
                    alt={review.author}
                    className="h-10 w-10 rounded-full object-cover"
                    loading="lazy"
                />
                <div>
                    <p className="font-bold text-primary dark:text-gray-100">{review.author}</p>
                    <Link to={`/cafe/${review.cafeSlug}`} className="text-sm text-brand hover:underline font-semibold">
                        di {review.cafeName}
                    </Link>
                </div>
            </div>
            <button
              onClick={handleVote}
              disabled={voted}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all ${
                voted 
                ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-700/50 text-muted hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <HandThumbUpIcon className="h-4 w-4"/>
              <span>{review.helpful_count || 0}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;