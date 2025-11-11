
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
    <div className="max-w-4xl mx-auto bg-card/80 dark:bg-card/70 backdrop-blur-md rounded-4xl border-2 border-amber-400/60 shadow-lg shadow-amber-400/20 hover:shadow-xl hover:shadow-amber-400/30 transition-all duration-500 overflow-hidden group transform hover:scale-[1.01] hover:-translate-y-1 animate-fade-in-up">
      <Link to={`/cafe/${cafe.slug}`} className="block">
        <div className="grid md:grid-cols-2">
          <div className="md:col-span-1 aspect-[4/3] md:aspect-auto">
            <ImageWithFallback 
              src={cafe.coverUrl} 
              alt={cafe.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              width={400}
              height={512}
            />
          </div>
          <div className="md:col-span-1 p-6 flex flex-col">
            <div>
              <span className="inline-block bg-accent-amber text-yellow-900 px-4 py-1 rounded-full text-sm font-bold shadow-sm mb-4">
                ✨ Rekomendasi Spesial
              </span>
              <h3 className="text-3xl font-extrabold font-jakarta text-primary dark:text-white mb-2">{cafe.name}</h3>
              <p className="text-base text-muted mb-4 line-clamp-2 min-h-[2.5rem]">
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
              <div className="inline-flex items-center text-brand font-bold group-hover:underline">
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
