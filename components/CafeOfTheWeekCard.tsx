
import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, ArrowRightIcon, TrophyIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';
import { DEFAULT_COVER_URL } from '../constants';

interface CafeOfTheWeekCardProps {
  cafe: Cafe;
}

const getPriceColor = (tier: number) => {
    switch (tier) {
        case 1: return 'text-green-500 dark:text-green-400'; 
        case 2: return 'text-blue-500 dark:text-blue-400';   
        case 3: return 'text-amber-500 dark:text-amber-400'; 
        case 4: return 'text-red-500 dark:text-red-400';     
        default: return 'text-brand';
    }
};

const CafeOfTheWeekCard: React.FC<CafeOfTheWeekCardProps> = ({ cafe }) => {
  return (
    <div className="relative h-full bg-card rounded-3xl shadow-lg hover:shadow-xl dark:hover:shadow-brand/20 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 border border-transparent hover:border-brand/30 flex flex-col">
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10">
             <div className="bg-brand text-white px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-md flex items-center gap-1">
                <TrophyIcon className="h-4 w-4 text-accent-amber" />
                Cafe of The Week
            </div>
        </div>
        
        <div className="w-full h-64 sm:h-72 relative flex-shrink-0">
            <ImageWithFallback
                src={cafe.coverUrl}
                defaultSrc={DEFAULT_COVER_URL}
                alt={cafe.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                width={600}
                height={600}
            />
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
             <h3 className="absolute bottom-3 left-4 text-2xl font-extrabold font-jakarta text-white md:hidden drop-shadow-md">{cafe.name}</h3>
        </div>

        <div className="p-5 sm:p-6 flex flex-col flex-grow">
            <div>
                <h3 className="hidden md:block text-2xl lg:text-3xl font-extrabold font-jakarta text-primary dark:text-white mb-2 sm:mb-3 truncate">{cafe.name}</h3>
                <p className="text-sm sm:text-base text-muted mb-4 sm:mb-6 line-clamp-3 leading-relaxed">{cafe.description}</p>
            </div>

            <div className="mt-auto">
                <div className="flex items-center justify-between mb-4 border-t border-border/50 pt-4">
                    <div className="flex items-center space-x-2">
                        <StarIcon className="h-6 w-6 text-accent-pink" />
                        <div>
                            <p className="text-[10px] text-muted font-bold uppercase">Score</p>
                            <p className="text-lg font-bold">{cafe.avgAestheticScore.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                         <p className="text-[10px] text-muted font-bold uppercase">Harga</p>
                        <span className={`text-lg font-bold ${getPriceColor(cafe.priceTier)}`}>{'$'.repeat(cafe.priceTier)}</span>
                        <span className="text-muted/30 text-lg font-bold">{'$'.repeat(4 - cafe.priceTier)}</span>
                    </div>
                </div>
                 <Link 
                    to={`/cafe/${cafe.slug}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-brand text-white font-bold py-2.5 px-6 rounded-xl text-base hover:bg-brand/90 transition-all duration-300 shadow-lg focus:ring-4 focus:ring-brand/30"
                >
                    Lihat Selengkapnya
                    <ArrowRightIcon className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    </div>
  );
};

export default CafeOfTheWeekCard;
