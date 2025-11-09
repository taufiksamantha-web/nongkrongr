import React from 'react';
import { Link } from 'react-router-dom';
import { Cafe } from '../types';
import { StarIcon, UsersIcon } from '@heroicons/react/24/solid';

interface CafeCardProps {
  cafe: Cafe;
}

const ScoreBadge: React.FC<{ icon: React.ReactNode, score: number, color: string }> = ({ icon, score, color }) => (
    <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-bold text-white ${color}`}>
        {icon}
        <span>{score > 0 ? score.toFixed(1) : 'N/A'}</span>
    </div>
);

const CafeCard: React.FC<CafeCardProps> = ({ cafe }) => {
  return (
    <Link to={`/cafe/${cafe.slug}`} className="block bg-white dark:bg-gray-800 rounded-3xl shadow-lg hover:shadow-2xl dark:hover:shadow-primary/20 transition-all duration-500 overflow-hidden group transform hover:-translate-y-1 dark:border dark:border-transparent hover:dark:border-primary/50">
      <div className="relative">
        <img src={cafe.coverUrl} alt={cafe.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
        {cafe.isSponsored && (
          <div className="absolute top-3 right-3 bg-accent-amber text-yellow-900 px-3 py-1 rounded-full text-xs font-bold shadow-md">
            SPONSORED
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <h3 className="text-white text-2xl font-bold font-jakarta truncate">{cafe.name}</h3>
          <p className="text-gray-200 text-sm">{cafe.district}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
                <ScoreBadge icon={<StarIcon className="h-4 w-4" />} score={cafe.avgAestheticScore} color="bg-accent-pink" />
                <ScoreBadge icon={<UsersIcon className="h-4 w-4" />} score={cafe.avgCrowdEvening} color="bg-primary" />
            </div>
            <div className="text-right">
                <span className="text-xl font-bold text-primary">{'$'.repeat(cafe.priceTier)}</span>
                <span className="text-gray-400 dark:text-gray-600">{'$'.repeat(4 - cafe.priceTier)}</span>
            </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cafe.vibes.slice(0, 2).map(vibe => (
            <span key={vibe.id} className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-semibold">
              {vibe.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
};

export default CafeCard;