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
    <div className="relative max-w-2xl mx-auto bg-card/80 dark:bg-card/70 backdrop-blur-md rounded-4xl border-2 border-amber-400/60 shadow-lg shadow-amber-400/20 hover:shadow-xl hover:shadow-amber-400/30 transition-all duration-500 overflow-hidden group transform hover:scale-[1.01] hover:-translate-y-1 animate-fade-in-up">
      <div className="absolute top-4 left-0 right-0 z-10 flex justify-center">
        <span className="bg-accent-amber text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-md text-center">
          ✨ Rekomendasi Spesial
        </span>
      </div>
      <Link to={`/cafe/${cafe.slug}`} className="block">
        <div className="flex flex-col">
          <div className="w-full">
            <ImageWithFallback 
              src={cafe.coverUrl} 
              defaultSrc={DEFAULT_COVER_URL}
              alt={cafe.name} 
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              width={600}
              height={400}
            />
          </div>
          <div className="p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-3xl font-extrabold font-jakarta text-primary dark:text-white mb-2">{cafe.name}</h3>
              <p className="text-base text-muted mb-6 line-clamp-2 min-h-[3rem]">
                "{displayQuote}"
              </p>
              <div className="flex items-center space-x-6 mb-4">
                <div className="flex items-center space-x-2">
                  <StarIcon className="h-6 w-6 text-accent-pink" />
                  <div>
                    <p className="text-sm text-muted">Aesthetic</p>
                    <p className="text-xl font-bold">{cafe.avgAestheticScore.toFixed(1)}</p>
                  </div>
                </div>
                 <div className="flex items-center space-x-2">
                  <BriefcaseIcon className="h-6 w-6 text-accent-cyan" />
                  <div>
                    <p className="text-sm text-muted">Nugas</p>
                    <p className="text-xl font-bold">{cafe.avgWorkScore.toFixed(1)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-auto pt-4">
              <div className="inline-flex items-center text-brand font-bold group-hover:underline text-lg">
                Lihat Detail
                <ArrowRightIcon className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default FeaturedCafeCard;