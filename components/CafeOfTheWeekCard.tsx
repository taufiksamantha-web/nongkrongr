import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, ArrowRightIcon, TrophyIcon } from '@heroicons/react/24/solid';
import ImageWithFallback from './common/ImageWithFallback';
import { DEFAULT_COVER_URL } from '../constants';

interface CafeOfTheWeekCardProps {
  cafe: Cafe;
}

const CafeOfTheWeekCard: React.FC<CafeOfTheWeekCardProps> = ({ cafe }) => {
  return (
    <div className="relative bg-card rounded-4xl shadow-lg hover:shadow-xl dark:hover:shadow-brand/20 transition-all duration-300 overflow-hidden group transform hover:-translate-y-1 border border-transparent hover:border-brand/30 animate-fade-in-up">
        <div className="grid md:grid-cols-2 items-center">
            <div className="p-8 order-2 md:order-1">
                <div className="flex items-center gap-3 mb-4">
                    <TrophyIcon className="h-8 w-8 text-accent-amber" />
                    <h2 className="text-2xl md:text-3xl font-bold font-jakarta text-primary dark:text-white">Cafe of The Week</h2>
                </div>
                <h3 className="text-4xl md:text-5xl font-extrabold font-jakarta mb-3">{cafe.name}</h3>
                <p className="text-muted mb-6 line-clamp-3">{cafe.description}</p>
                <div className="flex items-center space-x-6 mb-8">
                    <div className="flex items-center space-x-2">
                        <StarIcon className="h-7 w-7 text-accent-pink" />
                        <div>
                            <p className="text-sm text-muted">Aesthetic Score</p>
                            <p className="text-2xl font-bold">{cafe.avgAestheticScore.toFixed(1)}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted">Harga</p>
                        <span className="text-2xl font-bold text-brand">{'$'.repeat(cafe.priceTier)}</span>
                        <span className="text-muted/30">{'$'.repeat(4 - cafe.priceTier)}</span>
                    </div>
                </div>
                 <Link 
                    to={`/cafe/${cafe.slug}`}
                    className="inline-flex items-center gap-2 bg-brand text-white font-bold py-3 px-6 rounded-2xl text-lg hover:bg-brand/90 transition-all duration-300 transform group-hover:scale-105 shadow-lg focus:ring-4 focus:ring-brand/30"
                >
                    Lihat Selengkapnya
                    <ArrowRightIcon className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
             <div className="order-1 md:order-2 h-64 md:h-full min-h-[250px]">
                <ImageWithFallback
                    src={cafe.coverUrl}
                    defaultSrc={DEFAULT_COVER_URL}
                    alt={cafe.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    width={600}
                    height={600}
                />
            </div>
        </div>
    </div>
  );
};

export default CafeOfTheWeekCard;