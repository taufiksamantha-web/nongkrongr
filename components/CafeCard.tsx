
import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { HeartIcon, HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline'; // Import both
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid'; // Specific solid import
import ImageWithFallback from './common/ImageWithFallback';
import { useFavorites } from '../context/FavoriteContext';
import { DEFAULT_COVER_URL } from '../constants';

interface CafeCardProps {
  cafe: Cafe;
  animationDelay?: string;
  distance?: number;
}

const getPriceColor = (tier: number) => {
    switch (tier) {
        case 1: return 'text-green-500';
        case 2: return 'text-blue-500';
        case 3: return 'text-amber-500';
        case 4: return 'text-red-500';
        default: return 'text-gray-400';
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

  return (
    <Link 
      to={`/cafe/${cafe.slug}`} 
      // OUTER SHELL: Mengurus Layout, Margin, dan Hover Lift.
      // PENTING: Tidak boleh ada overflow-hidden disini agar shadow tidak terpotong.
      // UPDATE: Effect hover hanya aktif di md (desktop) ke atas.
      className="group relative block h-full w-full transition-transform duration-300 ease-out md:hover:-translate-y-2 md:hover:z-10 p-2"
      style={{ animationDelay }}
    >
      {/* SHADOW LAYER: Div terpisah di belakang untuk shadow yang bebas */}
      <div className="absolute inset-2 rounded-3xl bg-card shadow-md transition-all duration-300 md:group-hover:shadow-[0_20px_40px_-15px_rgba(124,77,255,0.4)] dark:md:group-hover:shadow-[0_20px_40px_-15px_rgba(124,77,255,0.2)] dark:bg-gray-800" />

      {/* CONTENT CONTAINER: Ini yang punya overflow-hidden untuk radius gambar */}
      <div className="relative h-full w-full rounded-3xl overflow-hidden bg-card dark:bg-gray-800 border-2 border-transparent md:group-hover:border-brand transition-colors duration-300 flex flex-col">
        
        {/* Image Section */}
        <div className="relative aspect-[4/3] w-full overflow-hidden">
            <ImageWithFallback 
                src={cafe.coverUrl} 
                defaultSrc={DEFAULT_COVER_URL}
                alt={cafe.name} 
                className="w-full h-full object-cover transition-transform duration-700 ease-out md:group-hover:scale-110"
                width={400}
                height={300}
            />
            
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 md:group-hover:opacity-80 transition-opacity duration-300" />

            {/* Top Badges */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                {/* Favorite Button */}
                <button 
                onClick={handleFavoriteClick}
                className={`p-2 rounded-full backdrop-blur-md transition-all duration-300 shadow-lg active:scale-90 ${favorited ? 'bg-white text-accent-pink' : 'bg-black/40 text-white hover:bg-white hover:text-accent-pink'}`}
                >
                {favorited ? <HeartIconSolid className="h-4 w-4"/> : <HeartIconOutline className="h-4 w-4" />}
                </button>

                {/* Sponsored Badge */}
                {cafe.isSponsored && (
                <span className="px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[10px] font-extrabold text-amber-600 tracking-wider uppercase shadow-sm border border-amber-500/20">
                    Featured
                </span>
                )}
            </div>

            {/* Distance Badge */}
            {distance !== undefined && (
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                    <MapPinIcon className="h-3 w-3 text-brand-light" />
                    {distance.toFixed(1)} km
                </div>
            )}
        </div>

        {/* Content Details */}
        <div className="p-4 flex flex-col gap-2 flex-grow">
            {/* Title & Rating */}
            <div className="flex justify-between items-start gap-2">
                <h3 className="text-lg font-bold font-jakarta text-primary dark:text-white leading-tight line-clamp-1 md:group-hover:text-brand transition-colors">
                    {cafe.name}
                </h3>
                <div className="flex items-center gap-1 flex-shrink-0 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-md border border-orange-100 dark:border-orange-500/20">
                    <StarIcon className="h-3 w-3 text-orange-500" />
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{cafe.avgAestheticScore.toFixed(1)}</span>
                </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1 text-xs text-muted">
                <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{cafe.district}, {cafe.city}</span>
            </div>

            {/* Footer: Vibes & Price (Pushed to bottom) */}
            <div className="mt-auto pt-3 border-t border-dashed border-border/50 flex items-center justify-between">
                <div className="flex gap-1 overflow-hidden">
                    {cafe.vibes.slice(0, 2).map(vibe => (
                        <span key={vibe.id} className="text-[10px] px-2 py-0.5 rounded-md bg-soft dark:bg-gray-700 text-muted font-medium whitespace-nowrap">
                            {vibe.name}
                        </span>
                    ))}
                    {cafe.vibes.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-muted font-medium">+{cafe.vibes.length - 2}</span>
                    )}
                </div>

                <div className="flex text-xs font-bold tracking-widest">
                    <span className={getPriceColor(cafe.priceTier)}>{'$'.repeat(cafe.priceTier)}</span>
                    <span className="text-gray-200 dark:text-gray-700">{'$'.repeat(4 - cafe.priceTier)}</span>
                </div>
            </div>
        </div>
      </div>
    </Link>
  );
};

export default React.memo(CafeCard);
