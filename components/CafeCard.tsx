
import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, UsersIcon, HeartIcon, MapPinIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/solid';
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
    <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm ${color}`}>
        {icon}
        <span>{score > 0 ? score.toFixed(1) : '-'}</span>
    </div>
);

const getPriceColor = (tier: number) => {
    switch (tier) {
        case 1: return 'text-green-500 dark:text-green-400'; // Murah
        case 2: return 'text-blue-500 dark:text-blue-400';   // Standar
        case 3: return 'text-amber-500 dark:text-amber-400'; // Premium
        case 4: return 'text-red-500 dark:text-red-400';     // Mewah
        default: return 'text-brand';
    }
};

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
  
  const handleLinkClick = (e: React.MouseEvent) => {
      e.stopPropagation();
  };

  return (
    <Link 
      to={`/cafe/${cafe.slug}`} 
      className="block bg-card dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-xl dark:hover:shadow-brand/20 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 border border-transparent hover:border-brand/30 animate-fade-in-up cafe-card-optimized w-full flex flex-col h-full"
      style={{ animationDelay }}
    >
      {/* Image Section */}
      <div className="relative h-48 sm:h-56 md:h-48 lg:h-52 flex-shrink-0">
        <ImageWithFallback 
            src={cafe.coverUrl} 
            defaultSrc={DEFAULT_COVER_URL}
            alt={cafe.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            width={400}
            height={300}
        />
        {cafe.isSponsored && (
          <div className="absolute top-3 right-3 bg-accent-amber text-yellow-900 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-md z-10">
            SPONSORED
          </div>
        )}
        <button 
          onClick={handleFavoriteClick}
          className="absolute top-3 left-3 p-2 bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 hover:text-accent-pink transition-all duration-200 touch-manipulation z-10"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorited ? <HeartIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-pink"/> : <HeartIconOutline className="h-5 w-5 sm:h-6 sm:w-6" />}
        </button>
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          <h3 className="text-white text-lg sm:text-xl font-bold font-jakarta truncate leading-tight">{cafe.name}</h3>
          <p className="text-gray-300 text-xs sm:text-sm truncate mt-0.5 flex items-center gap-1">
             <MapPinIcon className="h-3 w-3"/> {cafe.city}
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-3 sm:p-4 flex flex-col flex-grow justify-between gap-3">
        
        {/* Top Row: Badges, Distance, Actions */}
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                <ScoreBadge icon={<StarIcon className="h-3 w-3" />} score={cafe.avgAestheticScore} color="bg-accent-pink" />
                <ScoreBadge icon={<UsersIcon className="h-3 w-3" />} score={cafe.avgCrowdEvening} color="bg-brand" />
                 {distance !== undefined && (
                    <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-300 whitespace-nowrap border border-gray-200 dark:border-gray-600">
                        <MapPinIcon className="h-3 w-3" />
                        <span>{distance.toFixed(1)} km</span>
                    </div>
                )}
            </div>
            
             <div className="flex gap-1 ml-1">
                 {cafe.phoneNumber && (
                    <a href={`tel:${cafe.phoneNumber}`} onClick={handleLinkClick} className="flex items-center justify-center w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors" title="Telepon">
                        <PhoneIcon className="h-3.5 w-3.5" />
                    </a>
                )}
                {cafe.websiteUrl && (
                    <a href={cafe.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick} className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors" title="Website">
                        <GlobeAltIcon className="h-3.5 w-3.5" />
                    </a>
                )}
            </div>
        </div>

        {/* Bottom Row: Vibes & Price */}
        <div className="flex items-center pt-3 mt-1 border-t border-gray-100 dark:border-gray-700">
            <div className="flex-1 flex flex-wrap gap-1.5 h-[26px] overflow-hidden content-center">
              {cafe.vibes.slice(0, 3).map(vibe => (
                <span key={vibe.id} className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-md text-[10px] font-bold truncate">
                  {vibe.name}
                </span>
              ))}
            </div>
             <div className="flex-shrink-0 text-right ml-2">
                 <span className={`text-base sm:text-lg font-bold tracking-widest ${getPriceColor(cafe.priceTier)}`}>{'$'.repeat(cafe.priceTier)}</span>
                 <span className="text-muted/30 text-base sm:text-lg tracking-widest">{'$'.repeat(4 - cafe.priceTier)}</span>
            </div>
        </div>
      </div>
    </Link>
  );
};

export default React.memo(CafeCard);
