
import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, UsersIcon, HeartIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import ImageWithFallback from './common/ImageWithFallback';
import { useFavorites } from '../context/FavoriteContext';
import { DEFAULT_COVER_URL } from '../constants';

interface CafeCardProps {
  cafe: Cafe;
  animationDelay?: string;
  distance?: number;
}

const ScoreBadge: React.FC<{ icon: React.ReactNode, score: number, color: string }> = ({ icon, score, color }) => (
    <div className={`flex items-center space-x-1 px-2 py-1 sm:px-3 rounded-full text-xs sm:text-sm font-bold text-white ${color}`}>
        {icon}
        <span>{score > 0 ? score.toFixed(1) : 'N/A'}</span>
    </div>
);

const CafeCard: React.FC<CafeCardProps> = ({ cafe, animationDelay, distance }) => {
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const favorited = isFavorite(cafe.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (favorited) {
      removeFavorite(cafe.id);
    } else {
      addFavorite(cafe.id);
    }
  };

  return (
    <Link 
      to={`/cafe/${cafe.slug}`} 
      className="block bg-card dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl dark:hover:shadow-brand/20 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 border border-transparent hover:border-brand/30 animate-fade-in-up cafe-card-optimized w-full"
      style={{ animationDelay }}
    >
      <div className="relative h-48 sm:h-52 md:h-48">
        <ImageWithFallback 
            src={cafe.coverUrl} 
            defaultSrc={DEFAULT_COVER_URL}
            alt={cafe.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            width={400}
            height={300}
        />
        {cafe.isSponsored && (
          <div className="absolute top-3 right-3 bg-accent-amber text-yellow-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-md">
            SPONSORED
          </div>
        )}
        <button 
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 hover:text-accent-pink transition-all duration-200 touch-manipulation"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorited ? <HeartIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-pink"/> : <HeartIconOutline className="h-5 w-5 sm:h-6 sm:w-6" />}
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/80 to-transparent">
          <h3 className="text-white text-xl sm:text-2xl font-bold font-jakarta truncate">{cafe.name}</h3>
          <p className="text-gray-200 text-xs sm:text-sm truncate">{cafe.city}</p>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-1 sm:space-x-2">
                <ScoreBadge icon={<StarIcon className="h-3 w-3 sm:h-4 sm:w-4" />} score={cafe.avgAestheticScore} color="bg-accent-pink" />
                <ScoreBadge icon={<UsersIcon className="h-3 w-3 sm:h-4 sm:w-4" />} score={cafe.avgCrowdEvening} color="bg-brand" />
            </div>
             {distance !== undefined ? (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs sm:text-sm font-bold bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 flex-shrink-0 whitespace-nowrap">
                    <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{distance.toFixed(1)} km</span>
                </div>
            ) : (
                <div className="text-right">
                    <span className="text-lg sm:text-xl font-bold text-brand">{'$'.repeat(cafe.priceTier)}</span>
                    <span className="text-muted/30 text-lg sm:text-xl">{'$'.repeat(4 - cafe.priceTier)}</span>
                </div>
            )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2 h-auto overflow-hidden">
          {cafe.vibes.slice(0, 2).map(vibe => (
            <span key={vibe.id} className="bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold truncate max-w-[100px]">
              {vibe.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default React.memo(CafeCard);
