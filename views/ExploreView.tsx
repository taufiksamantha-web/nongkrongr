
import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { Search, Star, MapPin, ChevronDown, Check, X, Loader2, Sparkles, MapPinned, ListFilter, Coffee, Globe, ArrowRight, TrendingUp, Ghost, RotateCcw } from 'lucide-react';
import { Cafe } from '../types';
import { getOptimizedImageUrl, formatRating, getCafeStatus } from '../constants';
import { LazyImage, Badge, VerifiedBadge, Button } from '../components/UI';
import { fetchCafesPaginated } from '../services/dataService';
import { SEO } from '../components/SEO';

const SORT_OPTIONS = [
    { id: 'distance', label: 'Terdekat', icon: MapPin },
    { id: 'popularity', label: 'Paling Populer', icon: TrendingUp },
    { id: 'rating', label: 'Rating Tertinggi', icon: Star },
    { id: 'newest', label: 'Terbaru', icon: Sparkles }
];

const ExploreCafeCard = React.memo(({ cafe, onClick, userLocation }: { 
    cafe: Cafe, 
    onClick: (c: Cafe) => void, 
    userLocation: { lat: number, lng: number } | null 
}) => {
    const status = useMemo(() => getCafeStatus(cafe.openingHours), [cafe.openingHours]);
    const optimizedImg = useMemo(() => getOptimizedImageUrl(cafe.image, 400), [cafe.image]); 
    const rating = useMemo(() => formatRating(cafe.rating), [cafe.rating]);
    const address = useMemo(() => cafe.address.split(',')[0], [cafe.address]);
    const shouldShowDistance = cafe.dist !== undefined && cafe.dist !== null && cafe.dist < 9999;

    return (
        <div 
            className="optimize-scrolling gpu-accelerated group relative aspect-[3.5/4.8] bg-slate-100 dark:bg-slate-800 rounded-[2rem] overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border border-black/5 dark:border-white/5 active:scale-[0.98] flex flex-col will-change-transform"
            onClick={() => onClick(cafe)}
        >
            <LazyImage src={optimizedImg} alt={cafe.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-80 md:group-hover:opacity-100 transition-opacity"></div>
            
            <div className="absolute top-3 right-3 bg-white border border-gray-100 px-2 py-0.5 rounded-lg font-black flex items-center gap-1 z-20 text-black text-[10px] shadow-sm">
                <Star size={10} fill="#F97316" className="text-orange-500" /> {rating}
            </div>

            {shouldShowDistance && (
                <div className="absolute top-3 left-3 bg-green-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-black z-20 flex items-center gap-1 shadow-md">
                    <MapPin size={10} className="text-white" />
                    ~{Number(cafe.dist).toFixed(1)} km
                </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 z-10">
                <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-xs md:text-sm text-white leading-tight line-clamp-1 transition-colors uppercase tracking-tight">
                        {cafe.name}
                    </h3>
                    {cafe.is_verified && <VerifiedBadge size={12} />}
                </div>
                
                <div className="flex items-center justify-between pt-1.5 border-t border-white/10">
                    <div className="flex items-center gap-1 text-white/50 text-[9px] font-medium truncate flex-1">
                        <MapPin size={9} className="text-orange-500 shrink-0" />
                        <span className="truncate tracking-tight uppercase">{address}</span>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase ${status.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                        {status.isOpen ? 'Buka' : 'Tutup'}
                    </span>
                </div>
            </div>
        </div>
    );
});
ExploreCafeCard.displayName = "ExploreCafeCard";

interface ExploreViewProps {
    onCafeClick: (cafe: Cafe) => void;
    initialFilter: string | null;
    userLocation: { lat: number, lng: number } | null;
    selectedCityName: string;
    onReset: () => void; 
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onCafeClick, initialFilter, userLocation, selectedCityName, onReset }) => {
    const [query, setQuery] = useState('');
    const [sortBy, setSortBy] = useState(initialFilter === 'Terdekat Buka' ? 'distance' : (initialFilter ? 'popularity' : 'distance'));
    const [onlyOpen, setOnlyOpen] = useState(initialFilter === 'Buka' || initialFilter === 'Terdekat Buka');
    const [page, setPage] = useState(1);
    const [results, setResults] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    
    const sortMenuRef = useRef<HTMLDivElement>(null);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialFilter === 'Terdekat') {
            setQuery('');
            setSortBy('distance');
            setOnlyOpen(false);
        } else if (initialFilter === 'Buka' || initialFilter === 'Terdekat Buka') {
            setQuery('');
            setSortBy('distance');
            setOnlyOpen(true);
        } else if (initialFilter === 'Populer') {
            setQuery('');
            setSortBy('popularity');
            setOnlyOpen(false);
        } else if (initialFilter === 'Terbaru') {
            setQuery('');
            setSortBy('newest');
            setOnlyOpen(false);
        } else {
            setQuery(initialFilter || '');
            if (initialFilter) setSortBy('popularity');
            setOnlyOpen(false);
        }
    }, [initialFilter]);

    useEffect(() => {
        setResults([]);
        setPage(1);
        setHasMore(true);
    }, [query, sortBy, selectedCityName, userLocation, onlyOpen]);

    const loadData = useCallback(async (pageNum: number) => {
        setLoading(true);
        try {
            const isLocalSort = sortBy === 'newest' || sortBy === 'distance';
            const cleanCity = selectedCityName.replace(/(Kota|Kabupaten|Kab\.|Kec\.|Mencari Lokasi...|Lokasi Terdeteksi)/gi, '').trim();
            const effectiveCity = (isLocalSort && cleanCity) ? cleanCity : '';
            const maxDist = (query.trim().length > 0) ? 9999 : (sortBy === 'newest' ? 200 : 50);
            const limit = 24; 
            const { data } = await fetchCafesPaginated(pageNum, limit, query, 'active', effectiveCity, userLocation, sortBy, maxDist);
            let filteredData = data || [];
            if (onlyOpen) {
                filteredData = filteredData.filter(c => getCafeStatus(c.openingHours).isOpen);
            }
            if (filteredData.length > 0) {
                setResults(prev => pageNum === 1 ? filteredData : [...prev, ...filteredData]);
                setHasMore(data.length === limit); 
            } else {
                if (pageNum === 1) setResults([]);
                setHasMore(false);
            }
        } catch (e) {
            console.error("Explore Fetch Error:", e instanceof Error ? e.message : e);
        } finally {
            setLoading(false);
        }
    }, [query, sortBy, selectedCityName, userLocation, onlyOpen]);

    useEffect(() => {
        loadData(page);
    }, [page, loadData]);

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting && hasMore && !loading) {
                setPage(prev => prev + 1);
            }
        }, { threshold: 0.1, rootMargin: '200px' });
        if (loaderRef.current) { observer.observe(loaderRef.current); }
        return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
    }, [hasMore, loading]);

    const handleResetSearch = () => {
        setQuery('');
        setSortBy('distance');
        setOnlyOpen(false);
        onReset(); 
    };

    const getStatusText = () => {
        if (onlyOpen) return "Buka";
        if (query) return `"${query}"`;
        const activeOption = SORT_OPTIONS.find(o => o.id === sortBy);
        return activeOption?.label || 'Pilihan';
    };

    const activeSortLabel = SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Urutkan';

    const renderGrid = (items: Cafe[]) => (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {items.map((cafe) => (
                <ExploreCafeCard key={cafe.id} cafe={cafe} onClick={onCafeClick} userLocation={userLocation} />
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-white dark:bg-[#0F172A] pb-32 pt-[calc(env(safe-area-inset-top)+5.5rem)] md:pt-24 transition-colors">
            <SEO title="Jelajah Kafe Indonesia" />
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                
                {/* DESKTOP HEADER */}
                <div className="hidden md:flex items-center justify-between gap-4 mb-10">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                            {onlyOpen ? "Spot Kopi Terdekat Yang Buka ☕" : (query ? `Kafe di "${query}"` : (userLocation ? `Kafe Pilihan Untukmu` : 'Jelajahi Kafe Terbaik'))}
                        </h1>
                        <div className="flex items-center gap-1.5 mt-2.5 text-gray-400 dark:text-slate-500 font-bold text-xs tracking-tight">
                            <MapPinned size={14} /> Lokasi GPS: {selectedCityName}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {(query || onlyOpen) && (
                            <button onClick={handleResetSearch} className="flex items-center gap-2 px-5 py-3.5 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all active:scale-95 border border-red-100">
                                <X size={16} /> Hapus Filter
                            </button>
                        )}
                        <div className="relative" ref={sortMenuRef}>
                            <button onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} className="flex items-center gap-4 bg-gray-50 dark:bg-slate-800 px-6 py-3.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-all hover:bg-white dark:hover:bg-slate-700 active:scale-95">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Urutkan:</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{activeSortLabel}</span>
                                <ChevronDown size={16} className={`text-orange-500 transition-transform duration-300 ${isSortMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isSortMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-2 z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    {SORT_OPTIONS.map((option) => (
                                        <button key={option.id} onClick={() => { setSortBy(option.id); setIsSortMenuOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-colors ${sortBy === option.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
                                            <div className="flex items-center gap-3">
                                                <option.icon size={16} className={sortBy === option.id ? 'text-white' : 'text-gray-400'} />
                                                {option.label}
                                            </div>
                                            {sortBy === option.id && <Check size={16} />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MOBILE HEADER - RE-ENABLED DROPDOWN */}
                <div className="md:hidden flex flex-col gap-3 mb-8">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1 mb-0.5">
                                <MapPinned size={12} className="text-orange-500" />
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">{selectedCityName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{getStatusText()}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 relative" ref={sortMenuRef}>
                            {(query || onlyOpen) && (
                                <button onClick={handleResetSearch} className="bg-red-50 text-red-500 p-2.5 rounded-xl border border-red-100 active:scale-90 transition-transform">
                                    <RotateCcw size={18} />
                                </button>
                            )}
                            <button 
                                onClick={() => setIsSortMenuOpen(!isSortMenuOpen)} 
                                className="bg-orange-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-orange-500/20 flex items-center gap-2 active:scale-90 transition-transform"
                            >
                                <ListFilter size={18} />
                                <span className="text-[10px] font-black uppercase">Filter</span>
                            </button>

                            {isSortMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-[1px]" onClick={() => setIsSortMenuOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 p-2 z-[9999] animate-in slide-in-from-top-4 duration-300">
                                        {SORT_OPTIONS.map((option) => (
                                            <button
                                                key={option.id}
                                                onClick={() => { setSortBy(option.id); setIsSortMenuOpen(false); }}
                                                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs font-bold transition-all mb-1 last:mb-0 ${sortBy === option.id ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-600 dark:text-gray-300 active:bg-gray-50'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <option.icon size={14} className={sortBy === option.id ? 'text-white' : 'text-orange-500'} />
                                                    <span className="tracking-tight">{option.label}</span>
                                                </div>
                                                {sortBy === option.id && <Check size={14} strokeWidth={4} />}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {results.length === 0 && !loading ? (
                    <div className="max-w-lg mx-auto py-24 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                        <div className="w-32 h-32 bg-orange-100 dark:bg-slate-800 rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/10 rotate-3 border-4 border-white dark:border-slate-700">
                            <Ghost size={64} className="text-orange-500 animate-bounce" />
                        </div>
                        <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">Yah, Kopinya Habis! ☕</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4 leading-relaxed font-medium px-6">Kami belum menemukan kafe yang sesuai di lokasi ini. Coba ganti filter atau cari area lain ya!</p>
                        <div className="mt-12 w-full px-10">
                            <Button onClick={handleResetSearch} variant="primary" className="w-full h-16 rounded-[2rem] shadow-2xl shadow-orange-500/30 text-base font-black uppercase tracking-widest active:scale-95 transition-all">Reset Pencarian</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-16">
                        {renderGrid(results)}
                        <div ref={loaderRef} className="py-16 flex justify-center items-center gap-4">
                            {loading && (
                                <>
                                    <Loader2 className="animate-spin text-orange-500" size={28} />
                                    <p className="text-xs font-bold text-gray-400 tracking-tight">Menyiapkan data...</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
