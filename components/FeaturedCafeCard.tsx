import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, BriefcaseIcon, ArrowRightIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';

interface FeaturedCafeCardProps {
  cafe: Cafe;
}

const FeaturedCafeCard: React.FC<FeaturedCafeCardProps> = ({ cafe }) => {
  const displayQuote = cafe.description || cafe.reviews.find(r => r.status === 'approved')?.text || `Jelajahi suasana unik dan kopi terbaik di ${cafe.name}.`;

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-4xl shadow-xl hover:shadow-2xl dark:hover:shadow-primary/20 transition-all duration-500 overflow-hidden group transform hover:scale-[1.02] hover:-translate-y-2 animate-fade-in-up">
      <Link to={`/cafe/${cafe.slug}`} className="block">
        <div className="grid md:grid-cols-5">
          <div className="md:col-span-2">
            <ImageWithFallback 
              src={cafe.coverUrl} 
              alt={cafe.name} 
              className="w-full h-64 md:h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
          </div>
          <div className="md:col-span-3 p-8">
            <span className="inline-block bg-accent-amber text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-sm mb-4">
              ✨ Rekomendasi Spesial
            </span>
            <h3 className="text-4xl font-extrabold font-jakarta text-gray-800 dark:text-white mb-3">{cafe.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">
              "{displayQuote}"
            </p>
            <div className="flex items-center space-x-6 mb-8">
              <div className="flex items-center space-x-2">
                <StarIcon className="h-8 w-8 text-accent-pink" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Aesthetic</p>
                  <p className="text-2xl font-bold">{cafe.avgAestheticScore.toFixed(1)}</p>
                </div>
              </div>
               <div className="flex items-center space-x-2">
                <BriefcaseIcon className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nugas</p>
                  <p className="text-2xl font-bold">{cafe.avgWorkScore.toFixed(1)}</p>
                </div>
              </div>
            </div>
            <div className="inline-flex items-center text-primary font-bold group-hover:underline">
              Lihat Detail
              <ArrowRightIcon className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default FeaturedCafeCard;