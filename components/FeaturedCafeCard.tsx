import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, BriefcaseIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';
import { DEFAULT_COVER_URL } from '../constants';

interface FeaturedCafeCardProps {
  cafe: Cafe;
}

const FeaturedCafeCard: React.FC<FeaturedCafeCardProps> = ({ cafe }) => {
  const displayQuote = cafe.description || cafe.reviews.find(r => r.status === 'approved')?.text || `Jelajahi suasana unik dan kopi terbaik di ${cafe.name}.`;

  return (
    <div className="relative max-w-full lg:max-w-4xl mx-auto bg-card/80 dark:bg-card/70 backdrop-blur-md rounded-3xl sm:rounded-4xl border-2 border-amber-400/60 shadow-lg shadow-amber-400/20 hover:shadow-xl hover:shadow-amber-400/30 transition-all duration-500 overflow-hidden group transform hover:scale-[1.01] hover:-translate-y-1 animate-fade-in-up">
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
        <span className="bg-accent-amber text-yellow-900 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-md flex items-center gap-1">
          ✨ Rekomendasi Spesial
        </span>
      </div>
      <Link to={`/cafe/${cafe.slug}`} className="block">
        <div className="flex flex-col md:flex-row h-full">
          <div className="w-full md:w-1/2 h-48 sm:h-64 md:h-auto relative">
            <ImageWithFallback 
              src={cafe.coverUrl} 
              defaultSrc={DEFAULT_COVER_URL}
              alt={cafe.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              width={600}
              height={400}
            />
            {/* Gradient overlay for mobile text readability if needed, mostly handled by flex layout */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
             <h3 className="absolute bottom-3 left-4 text-2xl font-extrabold font-jakarta text-white md:hidden drop-shadow-md">{cafe.name}</h3>
          </div>
          <div className="p-5 sm:p-6 md:p-8 flex flex-col justify-center w-full md:w-1/2">
            <div>
              <h3 className="hidden md:block text-2xl lg:text-3xl xl:text-4xl font-extrabold font-jakarta text-primary dark:text-white mb-2 sm:mb-3">{cafe.name}</h3>
              <p className="text-sm sm:text-base text-muted mb-4 sm:mb-6 line-clamp-3 md:line-clamp-4 leading-relaxed">
                "{displayQuote}"
              </p>
              <div className="flex items-center space-x-4 sm:space-x-6 mb-4">
                <div className="flex items-center space-x-2">
                  <StarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-pink" />
                  <div>
                    <p className="text-xs text-muted font-bold uppercase">Aesthetic</p>
                    <p className="text-lg sm:text-xl font-bold">{cafe.avgAestheticScore.toFixed(1)}</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-2">
                  <BriefcaseIcon className="h-5 w-5 sm:h-6 sm:w-6 text-accent-cyan" />
                  <div>
                    <p className="text-xs text-muted font-bold uppercase">Nugas</p>
                    <p className="text-lg sm:text-xl font-bold">{cafe.avgWorkScore.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-2 sm:mt-auto pt-2 sm:pt-4">
              <div className="inline-flex items-center text-brand font-bold group-hover:underline text-base sm:text-lg transition-all">
                Lihat Detail
                <ArrowRightIcon className="h-4 w-4 sm:h-5 sm:w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default FeaturedCafeCard;