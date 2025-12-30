
import React, { useMemo } from 'react';
import { Star, MapPin, ArrowLeft, VerifiedBadge as VerifiedIcon, Sparkles, ChevronRight, Clock } from 'lucide-react';
import { Cafe, CollectionItem } from '../types';
import { getOptimizedImageUrl, formatRating, getCafeStatus, COLLECTION_TAG_MAPPING } from '../constants';
import { LazyImage, VerifiedBadge, Badge } from '../components/UI';
import { SEO } from '../components/SEO';

const CollectionCafeCard = React.memo(({ cafe, onClick }: { cafe: Cafe, onClick: (c: Cafe) => void }) => {
    const status = useMemo(() => getCafeStatus(cafe.openingHours), [cafe.openingHours]);
    const rating = useMemo(() => formatRating(cafe.rating), [cafe.rating]);
    const address = useMemo(() => cafe.address?.split(',')[0] || 'Lokasi tidak tersedia', [cafe.address]);
    
    return (
        <div 
            className="gpu-accelerated group relative aspect-[4/5.2] bg-slate-100 dark:bg-slate-800 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden shadow-lg transition-all duration-700 cursor-pointer border border-white/10 active:scale-[0.97] will-change-transform"
            onClick={() => onClick(cafe)}
        >
            <LazyImage 
                src={getOptimizedImageUrl(cafe.image, 600)} 
                alt={cafe.name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out md:group-hover:scale-110" 
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-500"></div>

            {/* Rating Badge: White BG, Orange Icon, Black Text */}
            <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-white border border-gray-100 px-2 py-0.5 md:px-3 md:py-1.5 rounded-lg md:rounded-2xl font-black flex items-center gap-1 z-20 text-black text-[10px] md:text-[11px] shadow-xl">
                <Star size={10} fill="#F97316" className="text-orange-500" /> {rating}
            </div>

            {/* Distance Badge: Green BG, White Icon, White Text */}
            {cafe.dist !== undefined && cafe.dist < 9999 && (
                <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-green-600 text-white px-2 py-0.5 md:px-3 md:py-1.5 rounded-lg md:rounded-2xl text-[9px] md:text-[10px] font-black shadow-lg z-20 flex items-center gap-1">
                    <MapPin size={10} className="text-white" />
                    {cafe.dist.toFixed(1)} km
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 z-10">
                {/* Status Indicator */}
                <div className="mb-2 md:mb-3">
                    <span className={`
                        inline-flex items-center gap-1 md:gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest border
                        ${status.isOpen 
                            ? 'bg-green-500/30 text-green-400 border-green-500/40' 
                            : 'bg-red-500/30 text-red-400 border-red-500/40'
                        }
                    `}>
                        <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full animate-pulse ${status.isOpen ? 'bg-green-400' : 'bg-red-400'}`}></span>
                        {status.isOpen ? 'Buka' : 'Tutup'}
                    </span>
                </div>

                {/* Name - Adjusted size for Mobile (Proporsional text-xs) */}
                <div className="flex items-center gap-1.5 mb-1 md:mb-2">
                    <h3 className="font-display font-black text-xs md:text-xl text-white leading-tight transition-colors duration-300 md:group-hover:text-orange-400 line-clamp-1 uppercase tracking-tight">
                        {cafe.name}
                    </h3>
                    {cafe.is_verified && <VerifiedBadge size={12} />}
                </div>

                {/* Footer Info */}
                <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-white/10">
                    <div className="flex items-center gap-1 text-white/50 text-[8px] md:text-[10px] font-bold truncate max-w-[85%]">
                        <MapPin size={8} className="text-orange-500 shrink-0" />
                        <span className="truncate uppercase tracking-wider">{address}</span>
                    </div>
                    <div className="text-white/30 md:group-hover:text-orange-500 transition-colors">
                        <ChevronRight size={10} strokeWidth={3} />
                    </div>
                </div>
            </div>
        </div>
    );
});
CollectionCafeCard.displayName = "CollectionCafeCard";

interface CollectionViewProps {
    collectionId: string;
    cafes: Cafe[];
    collections: CollectionItem[];
    onBack: () => void;
    onCafeClick: (cafe: Cafe) => void;
    userLocation: { lat: number, lng: number } | null;
    selectedCityName: string;
}

export const CollectionView: React.FC<CollectionViewProps> = ({ collectionId, cafes, collections, onBack, onCafeClick, userLocation, selectedCityName }) => {
    const collection = useMemo(() => collections.find(c => c.id === collectionId), [collections, collectionId]);

    const filteredCafes = useMemo(() => {
        if (!collection) return [];
        const tags = COLLECTION_TAG_MAPPING[collection.id] || [collection.filterTag];
        return cafes.filter(cafe => {
            const hasTag = cafe.tags && Array.isArray(cafe.tags) && 
                cafe.tags.some(tag => tags.some(t => t.toLowerCase() === tag.toLowerCase()));
            
            const isLocal = !selectedCityName || 
                           selectedCityName === 'Lokasi Saya' || 
                           selectedCityName === 'Lokasi Terdeteksi' || 
                           selectedCityName === 'Mencari Lokasi...' || 
                           (cafe.address && cafe.address.toLowerCase().includes(selectedCityName.toLowerCase().replace(/(Kota|Kabupaten|Kab\.|Kec\.)/gi, '').trim()));
            
            return hasTag && isLocal;
        }).sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }, [cafes, collection, selectedCityName]);

    if (!collection) return null;

    return (
        <div className="min-h-screen bg-white dark:bg-[#0F172A] pb-32 transition-colors duration-500">
            <SEO title={collection.title} />
            
            <div className="relative h-[40vh] md:h-[55vh] w-full overflow-hidden">
                <LazyImage src={collection.image} className="w-full h-full object-cover" alt={collection.title} />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-white dark:to-[#0F172A]"></div>
                
                <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-6 z-30">
                    <button 
                        onClick={onBack} 
                        className="p-2.5 md:p-3 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white hover:text-gray-900 transition-all shadow-2xl active:scale-90 border border-white/20"
                    >
                        <ArrowLeft size={22} strokeWidth={3} />
                    </button>
                </div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-10 z-20">
                    <div className="bg-orange-600 border border-white/20 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 shadow-2xl">
                        Koleksi Pilihan
                    </div>
                    {/* FIXED: Title Hero sizing reduced for mobile */}
                    <h1 className="text-2xl md:text-8xl font-display font-black text-white mb-3 tracking-tighter drop-shadow-2xl uppercase">
                        {collection.title}
                    </h1>
                    {/* FIXED: Description text sizing reduced for mobile */}
                    <p className="text-white/90 max-w-xl text-xs md:text-xl font-medium drop-shadow-lg leading-relaxed px-4">
                        {collection.description}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-5 md:px-8 mt-10 animate-in fade-in duration-1000">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 border-b border-gray-100 dark:border-slate-800 pb-6">
                    <div>
                        <h2 className="text-xl md:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight uppercase">Daftar Tempat ✨</h2>
                        <p className="text-gray-400 dark:text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-[0.2em] mt-1.5">
                            Menampilkan <span className="text-orange-600">{filteredCafes.length}</span> Kafe Terkurasi
                        </p>
                    </div>
                </div>

                {filteredCafes.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                        {filteredCafes.map((cafe) => (
                            <CollectionCafeCard key={cafe.id} cafe={cafe} onClick={onCafeClick} />
                        ))}
                    </div>
                ) : (
                    <div className="py-40 flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
                            <Sparkles size={48} className="text-gray-200 dark:text-slate-700" />
                        </div>
                        <h3 className="text-lg font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest">Maaf, Area ini belum terjangkau</h3>
                    </div>
                )}
            </div>
        </div>
    );
};
