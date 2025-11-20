
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { StarIcon, BriefcaseIcon, HandThumbUpIcon, MapPinIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';

type TopReview = Review & { cafeName: string; cafeSlug: string };

interface ReviewCardProps {
  review: TopReview;
  animationDelay?: string;
  isDetailView?: boolean; // If true, disables link to cafe and hides cafe name context
  onImageClick?: (src: string) => void; // Handler for lightbox
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, animationDelay, isDetailView = false, onImageClick }) => {
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
      
      setVoted(true);
      localStorage.setItem(storageKey, 'true');

      const { error } = await cafeContext.incrementHelpfulCount(review.id);

      if (error) {
        setVoted(false);
        localStorage.removeItem(storageKey);
        alert('Gagal menyimpan vote. Perubahan telah dibatalkan. Silakan coba lagi.');
      }
  };

  const formatDate = (dateString: string | Date) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  const hasPhotos = review.photos && review.photos.length > 0;

  // --- INTERNAL COMPONENTS ---

  const UserHeader = () => (
    <div className="flex items-center gap-3 mb-3">
        <img
            src={review.author_avatar_url || `https://ui-avatars.com/api/?name=${(review.author || 'User').replace(/\s/g, '+')}&background=random&color=fff`}
            alt={review.author}
            className="h-10 w-10 rounded-full object-cover border border-border flex-shrink-0 shadow-sm"
            loading="lazy"
        />
        <div className="min-w-0 flex-1">
            <div className="flex justify-between items-start">
                <p className="font-bold text-sm text-primary dark:text-white truncate">{review.author}</p>
                <span className="text-[10px] text-muted whitespace-nowrap ml-2">{formatDate(review.createdAt)}</span>
            </div>
            {!isDetailView && (
                 <Link to={`/cafe/${review.cafeSlug}`} className="text-xs text-brand hover:underline font-medium truncate block flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <MapPinIcon className="h-3 w-3" /> {review.cafeName}
                </Link>
            )}
        </div>
    </div>
  );

  const RatingBadges = () => (
    <div className="flex flex-wrap gap-2 mt-4">
        <div className="flex items-center gap-1 px-2 py-1 bg-accent-pink/10 text-accent-pink rounded-lg border border-accent-pink/20">
            <StarIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{review.ratingAesthetic}/10</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-accent-cyan/10 text-accent-cyan rounded-lg border border-accent-cyan/20">
            <BriefcaseIcon className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{review.ratingWork}/10</span>
        </div>
        {review.priceSpent > 0 && (
             <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800">
                <BanknotesIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">~{review.priceSpent.toLocaleString('id-ID')}</span>
            </div>
        )}
    </div>
  );

  const ReviewContent = () => (
     <>
        <p className="text-muted text-sm leading-relaxed break-words whitespace-pre-line">
            {review.text}
        </p>
        
        {/* Photo Gallery - Proportional Grid */}
        {hasPhotos && (
            <div className={`mt-3 grid gap-2 ${
                review.photos.length === 1 ? 'grid-cols-1' : 
                review.photos.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2 sm:grid-cols-3'
            }`}>
                {review.photos.map((photo, index) => {
                    // Logic for aspect ratios:
                    // 1 Photo: Wide (16:9)
                    // 2 Photos: Square (1:1)
                    // 3+ Photos: 
                    //    - If index 0 (first): Span 2 cols if grid is 2-col, or square if 3-col.
                    //    - Actually, simpler is better: keep them consistent.
                    
                    let aspectClass = 'aspect-[4/3]'; // Default for multi-grid
                    if (review.photos.length === 1) aspectClass = 'aspect-[16/9] sm:aspect-[2/1]';
                    if (review.photos.length === 2) aspectClass = 'aspect-square';

                    // If we have 3 photos, make the first one span full width on small screens (grid-cols-2), 
                    // but normal on larger (grid-cols-3)
                    const spanClass = (review.photos.length === 3 && index === 0) 
                        ? 'col-span-2 sm:col-span-1' 
                        : '';

                    return (
                        <div 
                            key={index} 
                            className={`relative overflow-hidden rounded-xl border border-border group ${aspectClass} ${spanClass}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onImageClick) onImageClick(photo);
                            }}
                        >
                            <ImageWithFallback 
                                src={photo} 
                                alt={`Foto review oleh ${review.author} ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-zoom-in"
                                width={400}
                                height={300}
                            />
                            {onImageClick && (
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                            )}
                        </div>
                    );
                })}
            </div>
        )}

        <div className="flex justify-between items-end mt-4 pt-3 border-t border-border/50">
            <RatingBadges />
            <button
                onClick={handleVote}
                disabled={voted}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm active:scale-95 ${
                    voted 
                    ? 'bg-brand text-white shadow-brand/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-muted hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-primary dark:hover:text-white'
                }`}
            >
                <HandThumbUpIcon className={`h-4 w-4 ${voted ? 'animate-bounce' : ''}`}/>
                <span>{review.helpful_count || 0}</span>
            </button>
        </div>
     </>
  );

  // Wrapper logic: If detail view, standard div. If list view (Home), Link wrapper.
  const containerClass = "bg-card dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-border hover:shadow-md hover:border-brand/30 transition-all duration-300 h-full flex flex-col animate-fade-in-up review-card-optimized";
  
  if (isDetailView) {
      return (
          <div className={containerClass} style={{ animationDelay }}>
              <UserHeader />
              <ReviewContent />
          </div>
      );
  }

  return (
    <Link 
      to={`/cafe/${review.cafeSlug}`} 
      className={`${containerClass} cursor-pointer`}
      style={{ animationDelay }}
    >
        <UserHeader />
        <ReviewContent />
    </Link>
  );
};

export default React.memo(ReviewCard);
