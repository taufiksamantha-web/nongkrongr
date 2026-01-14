
import React, { useMemo, useState, useEffect } from 'react';
import { Ticket, Copy, MapPin, Percent, Zap, Calendar, Info, Clock, Loader2 } from 'lucide-react';
import { Cafe, Promo, User, AppNotification } from '../types';
import { LazyImage, Button, VerifiedBadge } from '../components/UI';
import { calculateDistance, getOptimizedImageUrl, estimateTime } from '../constants';
import { SEO } from '../components/SEO';
import { fetchPromosByLocation } from '../services/dataService'; 

interface PromoViewProps {
    cafes: Cafe[]; 
    userLocation?: { lat: number; lng: number } | null;
    onCafeClick: (cafe: Cafe) => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    user?: User | null;
    notifications?: AppNotification[];
    isDarkMode?: boolean;
    toggleDarkMode?: () => void;
    selectedCityName?: string;
    setShowLocationModal?: (show: boolean) => void;
    onProfileClick?: () => void;
}

export const PromoView: React.FC<PromoViewProps> = ({ 
    userLocation, onCafeClick, addToast,
    user, selectedCityName, setShowLocationModal
}) => {
    const [promoCafes, setPromoCafes] = useState<Cafe[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadPromos = async () => {
            setIsLoading(true);
            try {
                const isGPSMode = !selectedCityName || selectedCityName === 'Lokasi Saya' || selectedCityName === 'Lokasi Terdeteksi';
                const cityFilter = isGPSMode ? undefined : selectedCityName;
                const data = await fetchPromosByLocation(cityFilter, userLocation || undefined);
                setPromoCafes(data);
            } catch (e) {
                console.error("Promo fetch error", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadPromos();
    }, [selectedCityName, userLocation]);

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        addToast('success', 'Kode promo berhasil disalin!');
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'S&K Berlaku';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] pb-32 transition-colors">
            <SEO title="Promo Cafe Terdekat" description="Cari promo kafe terdekat berdasarkan koordinat lokasi kamu secara akurat." />
            
            <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500 pt-[calc(env(safe-area-inset-top)+5.5rem)] md:pt-[calc(env(safe-area-inset-top)+6.5rem)] px-4 md:px-8">
                <div className="text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full mb-4 text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] border border-rose-200 dark:border-rose-900/40">
                        <Zap size={12} className="fill-current" /> Promo Spesial Untukmu
                    </div>
                    <h1 className="text-3xl md:text-6xl font-display font-black text-gray-900 dark:text-white leading-tight">Berburu Diskon! 🏷️</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-2 md:mt-3 text-xs md:text-lg font-medium">Temukan penawaran terbaik dari kafe favorit di sekitarmu.</p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 gap-6 md:gap-8 pt-4">
                        {[1,2,3].map(i => (
                            <div key={i} className="h-64 bg-gray-200 dark:bg-slate-800 rounded-[2.5rem] md:rounded-[3rem] animate-pulse"></div>
                        ))}
                    </div>
                ) : promoCafes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-20 md:py-24 bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] border-2 border-dashed border-gray-200 dark:border-slate-800 px-8 md:px-10 shadow-sm">
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 rotate-3 shadow-inner">
                            <Ticket size={40} className="text-gray-300 dark:text-slate-700" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-display font-black text-gray-800 dark:text-white uppercase tracking-tight">Belum Ada Promo</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-xs md:text-sm mt-3 max-w-[300px] leading-relaxed font-medium">
                            Belum ada kafe yang mendaftarkan promo di <span className="text-rose-500 font-black">lokasi kamu</span> saat ini.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:gap-10 pt-4">
                        {promoCafes.map((cafe) => {
                            const dist = cafe.dist;
                            return (
                                <div key={cafe.id} className="group relative">
                                    {dist !== undefined && dist < 9999 && (
                                        <div className="absolute -top-3 -right-1 md:-top-4 md:-right-2 z-20 bg-indigo-600 text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black shadow-2xl shadow-indigo-500/30 flex flex-col items-center border-2 border-white dark:border-slate-900 scale-100 md:scale-110">
                                            <span className="leading-none">{dist.toFixed(1)} km</span>
                                        </div>
                                    )}
                                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col md:flex-row transition-all duration-700 md:hover:-translate-y-2">
                                        <div className="w-full md:w-80 h-44 md:h-auto relative shrink-0 overflow-hidden cursor-pointer" onClick={() => onCafeClick(cafe)}>
                                            <LazyImage src={getOptimizedImageUrl(cafe.image, 800)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={cafe.name} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                            <div className="absolute bottom-4 left-5 right-5 md:bottom-6 md:left-6 md:right-6">
                                                <div className="flex items-center gap-2 text-white/70 text-[9px] font-black uppercase tracking-widest mb-1 md:mb-1.5">
                                                    <MapPin size={10} className="text-orange-500" /> {cafe.address.split(',')[0]}
                                                </div>
                                                <h3 className="text-xl md:text-2xl font-display font-black text-white leading-tight drop-shadow-lg truncate">{cafe.name} {cafe.is_verified && <VerifiedBadge size={16} />}</h3>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-5 md:p-10 flex flex-col justify-center bg-white dark:bg-slate-900">
                                            <div className="space-y-4 md:space-y-6">
                                                {cafe.promos?.map((promo: Promo) => (
                                                    <div key={promo.id} className="relative overflow-hidden bg-gray-50/50 dark:bg-slate-800/40 border-2 border-dashed border-gray-200 dark:border-slate-700/50 rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-6 group/promo transition-all duration-500 hover:border-orange-500/50">
                                                        <div className="flex items-center gap-4 md:gap-6 w-full">
                                                            <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[1.8rem] bg-orange-500 text-white shadow-lg shadow-orange-500/10 flex flex-col items-center justify-center shrink-0 border-2 md:border-4 border-white dark:border-slate-800">
                                                                <span className="text-lg md:text-2xl font-black leading-none">{promo.value || '?'}{promo.value?.length && !promo.value.includes('Rp') ? '%' : ''}</span>
                                                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-tighter mt-0.5 md:mt-1">OFF</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-black text-gray-900 dark:text-white text-sm md:text-lg leading-tight uppercase tracking-tight group-hover/promo:text-orange-500 transition-colors truncate">{promo.title}</h4>
                                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                    {promo.description && (
                                                                        <div className="flex items-center gap-1 text-[9px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                                                            <Info size={10} className="text-indigo-500" /> {promo.description}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md">
                                                                        <Clock size={10} /> {formatDate(promo.endDate)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="w-full sm:w-auto shrink-0">
                                                            {promo.code ? (
                                                                <button onClick={() => handleCopy(promo.code!)} className="w-full sm:w-auto px-6 py-3.5 md:px-8 md:py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-mono font-black flex items-center justify-center gap-2.5 active:scale-95 transition-all shadow-md hover:bg-orange-600 hover:text-white dark:hover:bg-orange-600">
                                                                    {promo.code} <Copy size={12} />
                                                                </button>
                                                            ) : (
                                                                <Button size="sm" className="w-full sm:w-auto h-12 md:h-14 px-8 md:px-10 rounded-xl md:rounded-2xl shadow-lg" onClick={() => onCafeClick(cafe)}>Cek Detail</Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="mt-6 md:mt-8 text-[9px] md:text-[10px] text-gray-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em] text-center md:text-left">Tunjukkan kode saat pembayaran di kasir</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
