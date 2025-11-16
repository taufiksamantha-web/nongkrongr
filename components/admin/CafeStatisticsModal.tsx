import React, { useMemo } from 'react';
import { Cafe } from '../../types';
import { XMarkIcon, StarIcon, BriefcaseIcon, UsersIcon, CurrencyDollarIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';

interface CafeStatisticsModalProps {
    cafe: Cafe;
    onClose: () => void;
}

const StatDisplay: React.FC<{ icon: React.ReactNode; label: string; value: string | number; colorClass: string; }> = ({ icon, label, value, colorClass }) => (
    <div className="flex flex-col items-center text-center p-4 bg-soft dark:bg-gray-700/50 rounded-2xl border border-border">
        <div className={`mb-2 ${colorClass}`}>{icon}</div>
        <p className="text-3xl font-bold font-jakarta">{value}</p>
        <p className="text-sm text-muted font-semibold">{label}</p>
    </div>
);

const PriceDistributionChart: React.FC<{ reviews: Cafe['reviews'] }> = ({ reviews }) => {
    const priceData = useMemo(() => {
        const distribution = {
            low: reviews.filter(r => r.priceSpent <= 25000).length,
            mid: reviews.filter(r => r.priceSpent > 25000 && r.priceSpent <= 50000).length,
            high: reviews.filter(r => r.priceSpent > 50000).length,
        };
        const total = distribution.low + distribution.mid + distribution.high;
        return {
            low: total > 0 ? (distribution.low / total) * 100 : 0,
            mid: total > 0 ? (distribution.mid / total) * 100 : 0,
            high: total > 0 ? (distribution.high / total) * 100 : 0,
        };
    }, [reviews]);

    return (
        <div>
            <h3 className="font-bold font-jakarta text-lg mb-3 text-center">Distribusi Pengeluaran</h3>
            <div className="w-full bg-soft dark:bg-gray-700/50 rounded-full h-8 flex overflow-hidden border border-border">
                <div className="bg-green-500 h-full" style={{ width: `${priceData.low}%` }} title={`< 25rb: ${priceData.low.toFixed(1)}%`}></div>
                <div className="bg-yellow-500 h-full" style={{ width: `${priceData.mid}%` }} title={`25-50rb: ${priceData.mid.toFixed(1)}%`}></div>
                <div className="bg-red-500 h-full" style={{ width: `${priceData.high}%` }} title={`> 50rb: ${priceData.high.toFixed(1)}%`}></div>
            </div>
            <div className="flex justify-between text-xs mt-2 text-muted font-semibold">
                <span>&lt; 25rb</span>
                <span>25-50rb</span>
                <span>&gt; 50rb</span>
            </div>
        </div>
    );
};


const CafeStatisticsModal: React.FC<CafeStatisticsModalProps> = ({ cafe, onClose }) => {
    const approvedReviews = useMemo(() => cafe.reviews.filter(r => r.status === 'approved'), [cafe.reviews]);

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in-up" 
            onClick={onClose}
        >
            <div 
                className="bg-card rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-border">
                    <div>
                        <p className="text-muted text-sm">Statistik untuk</p>
                        <h2 className="text-2xl font-bold font-jakarta text-primary">{cafe.name}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-soft dark:hover:bg-gray-700" aria-label="Tutup">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>

                <main className="p-6 space-y-6 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatDisplay icon={<ChatBubbleBottomCenterTextIcon className="h-8 w-8"/>} label="Total Reviews" value={approvedReviews.length} colorClass="text-brand" />
                        <StatDisplay icon={<StarIcon className="h-8 w-8"/>} label="Avg. Aesthetic" value={cafe.avgAestheticScore.toFixed(1)} colorClass="text-accent-pink" />
                        <StatDisplay icon={<BriefcaseIcon className="h-8 w-8"/>} label="Avg. Nugas" value={cafe.avgWorkScore.toFixed(1)} colorClass="text-accent-cyan" />
                        <StatDisplay icon={<UsersIcon className="h-8 w-8"/>} label="Avg. Crowd" value={cafe.avgCrowdEvening.toFixed(1)} colorClass="text-muted" />
                    </div>
                    
                    {approvedReviews.length > 0 && (
                        <div className="bg-card border border-border p-4 rounded-2xl">
                             <PriceDistributionChart reviews={approvedReviews} />
                        </div>
                    )}

                    <div className="text-center pt-4">
                         <p className="text-muted text-sm">Fitur statistik yang lebih detail akan segera hadir!</p>
                    </div>

                </main>
            </div>
        </div>
    );
};

export default CafeStatisticsModal;