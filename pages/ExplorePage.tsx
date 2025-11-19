
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cafe, PriceTier, Tag, User } from '../types';
import { CafeContext } from '../context/CafeContext';
import { ThemeContext } from '../App';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';
import { SOUTH_SUMATRA_CITIES, VIBES, AMENITIES } from '../constants';
import CafeCard from '../components/CafeCard';
import { MagnifyingGlassIcon, ChevronDownIcon, AdjustmentsHorizontalIcon, XMarkIcon, InboxIcon, FireIcon } from '@heroicons/react/24/solid';
import { MapPinIcon } from '@heroicons/react/24/outline';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import InteractiveMap from '../components/InteractiveMap';
import { calculateDistance } from '../utils/geolocation';
import { checkIfOpen, checkIfOpenLate } from '../utils/timeUtils';
import SkeletonCard from '../components/SkeletonCard';

type CafeWithDistance = Cafe & { distance?: number };
type OpeningStatus = 'all' | 'open_now' | 'open_late' | 'closed';

const FilterPanelContent: React.FC<{
    filters: any;
    handleFilterChange: (key: string, value: any) => void;
    toggleMultiSelect: (key: 'vibes' | 'amenities' | 'tags', value: string) => void;
    setOpeningStatus: (status: OpeningStatus) => void;
    sortBy: 'default' | 'distance';
    isLocating: boolean;
    locationError: string | null;
    handleSortByDistance: () => void;
    allTags: Tag[];
    currentUser: User | null;
}> = ({ filters, handleFilterChange, toggleMultiSelect, setOpeningStatus, sortBy, isLocating, locationError, handleSortByDistance, allTags, currentUser }) => {
    
    const openingStatusOptions: { value: OpeningStatus; label: string }[] = [
        { value: 'all', label: 'Semua' },
        { value: 'open_now', label: 'Buka Sekarang' },
        { value: 'open_late', label: 'Buka Sampai Malam' },
        { value: 'closed', label: 'Tutup' },
    ];
    
    return (
        <>
            {/* City */}
            <div className="py-2">
                <label className="font-semibold block text-primary dark:text-white">Kota/Kabupaten</label>
                <div className="mt-2">
                    <select value={filters.city} onChange={e => handleFilterChange('city', e.target.value)} className="w-full p-2 border border-border rounded-xl bg-soft dark:bg-gray-700 text-primary dark:text-white focus:ring-2 focus:ring-brand">
                        <option value="all">Semua Kota/Kabupaten</option>
                        {SOUTH_SUMATRA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Sort by distance */}
            <div className="py-4 border-t border-border">
                <button
                    onClick={handleSortByDistance}
                    disabled={isLocating}
                    className={`w-full flex items-center justify-center gap-2 p-3 text-sm rounded-xl border-2 font-bold transition-all ${
                        sortBy === 'distance'
                            ? 'bg-brand text-white border-brand'
                            : 'bg-soft border-border text-primary hover:border-brand/50 dark:text-white dark:bg-gray-700'
                    } disabled:opacity-50 disabled:cursor-wait`}
                >
                    {isLocating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-current"></div>
                            Mencari Lokasi...
                        </>
                    ) : (
                        <>
                            <MapPinIcon className="h-5 w-5" />
                            {sortBy === 'distance' ? 'Reset Urutan' : 'Urutkan Terdekat'}
                        </>
                    )}
                </button>
                {locationError && <p className="text-xs text-accent-pink mt-1">{locationError}</p>}
            </div>

            {/* Opening Status */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-primary dark:text-white">
                    Status Buka
                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-2">
                    {openingStatusOptions.map(({ value, label }) => (
                        <label key={value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                            <input
                                type="radio"
                                name="openingStatus"
                                value={value}
                                checked={filters.openingStatus === value}
                                onChange={() => setOpeningStatus(value)}
                                className="h-4 w-4 text-brand focus:ring-brand focus:ring-2 border-gray-300 dark:border-gray-500 bg-soft dark:bg-gray-700"
                            />
                            <span className="font-medium text-primary dark:text-white">{label}</span>
                        </label>
                    ))}
                </div>
            </details>
            
            {/* Price Tier */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-primary dark:text-white">
                    Harga
                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-4 grid grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as const).map(tier => (
                        <button
                            key={tier}
                            onClick={() => handleFilterChange('priceTier', tier)}
                            className={`py-2 text-sm rounded-lg border-2 font-bold transition-all ${
                                filters.priceTier === tier
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'
                            }`}
                        >
                            {'$'.repeat(tier)}
                        </button>
                    ))}
                </div>
            </details>

            {/* Vibes */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-primary dark:text-white">
                    Vibe
                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-4 flex flex-wrap gap-2">
                    {VIBES.map(vibe => (
                        <button
                            key={vibe.id}
                            onClick={() => toggleMultiSelect('vibes', vibe.id)}
                            className={`px-3 py-1.5 text-sm rounded-full border-2 font-bold transition-all ${
                                filters.vibes.includes(vibe.id)
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'
                            }`}
                        >
                            {vibe.name}
                        </button>
                    ))}
                </div>
            </details>

            {/* Amenities */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-primary dark:text-white">
                    Fasilitas
                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-4 grid grid-cols-4 gap-2">
                    {AMENITIES.map(amenity => (
                        <button 
                            key={amenity.id} 
                            onClick={() => toggleMultiSelect('amenities', amenity.id)} 
                            title={amenity.name}
                            className={`p-3 text-2xl rounded-lg border-2 transition-all flex items-center justify-center ${filters.amenities.includes(amenity.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'}`}
                        >
                            {amenity.icon}
                        </button>
                    ))}
                </div>
            </details>

            {/* Crowd Level */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-semibold cursor-pointer list-none text-primary dark:text-white">
                    Tingkat Keramaian (Maks.)
                    <ChevronDownIcon className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="text-sm font-medium text-muted">Pagi ({filters.crowdMorning})</label>
                        <input type="range" min="1" max="5" value={filters.crowdMorning} onChange={e => handleFilterChange('crowdMorning', parseInt(e.target.value))} className="w-full mt-1 accent-accent-amber"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-muted">Siang ({filters.crowdAfternoon})</label>
                        <input type="range" min="1" max="5" value={filters.crowdAfternoon} onChange={e => handleFilterChange('crowdAfternoon', parseInt(e.target.value))} className="w-full mt-1 accent-brand/75"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-muted">Malam ({filters.crowdEvening})</label>
                        <input type="range" min="1" max="5" value={filters.crowdEvening} onChange={e => handleFilterChange('crowdEvening', parseInt(e.target.value))} className="w-full mt-1 accent-brand"/>
                    </div>
                </div>
            </details>

            {/* Tags */}
            {currentUser && (
                <div className="py-2 border-t border-border">
                    <label className="font-semibold block text-primary dark:text-white">Tag Komunitas</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button 
                                key={tag.id} 
                                onClick={() => toggleMultiSelect('tags', tag.id)} 
                                className={`px-3 py-1.5 text-xs rounded-full border-2 font-bold transition-all ${filters.tags.includes(tag.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'}`}
                            >
                               #{tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
};

const ExplorePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading, error, getAllTags, fetchNextPage, hasNextPage, isFetchingNextPage } = cafeContext!;
  const { theme } = useContext(ThemeContext);
  const { favoriteIds } = useFavorites();
  const { currentUser } = useAuth();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const loaderRef = useRef<HTMLDivElement>(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  const isFavoritesView = searchParams.get('favorites') === 'true';
  const sortParam = searchParams.get('sort');

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    city: searchParams.get('city') || 'all',
    vibes: searchParams.getAll('vibe') || [],
    amenities: searchParams.getAll('amenity') || [],
    tags: searchParams.getAll('tag') || [],
    priceTier: parseInt(searchParams.get('price_tier') || '4', 10) as PriceTier,
    crowdMorning: parseInt(searchParams.get('crowd_morning') || '5', 10),
    crowdAfternoon: parseInt(searchParams.get('crowd_afternoon') || '5', 10),
    crowdEvening: parseInt(searchParams.get('crowd_evening') || '5', 10),
    openingStatus: 'all' as OpeningStatus,
  });
  
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'distance'>('default');
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
        const tagsData = await getAllTags();
        setAllTags(tagsData);
    };
    fetchTags();
  }, [getAllTags]);

  useEffect(() => {
    if (isFiltersOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, [isFiltersOpen]);

  const handleFilterChange = <K extends keyof typeof filters,>(key: K, value: (typeof filters)[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (sortBy === 'distance') {
        setSortBy('default');
    }
  };

  const setOpeningStatus = (status: OpeningStatus) => {
    setFilters(prev => ({ ...prev, openingStatus: status }));
  };

  const handleSortByDistance = () => {
    if (sortBy === 'distance') {
      setSortBy('default');
      setUserLocation(null);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            setSortBy('distance');
            setIsLocating(false);
        },
        (error) => {
            console.error("Geolocation error:", error);
            setLocationError("Gagal mendapatkan lokasi. Pastikan izin lokasi sudah diaktifkan di browsermu.");
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    // Jangan update URL jika sedang dalam mode 'favorites' atau 'sort' khusus
    if (isFavoritesView || sortParam) return;

    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('search', filters.search);
    if (filters.city !== 'all') newParams.set('city', filters.city);
    filters.vibes.forEach(vibe => newParams.append('vibe', vibe));
    filters.amenities.forEach(amenity => newParams.append('amenity', amenity));
    filters.tags.forEach(tag => newParams.append('tag', tag));
    if (filters.priceTier < 4) newParams.set('price_tier', String(filters.priceTier));
    if (filters.crowdMorning < 5) newParams.set('crowd_morning', String(filters.crowdMorning));
    if (filters.crowdAfternoon < 5) newParams.set('crowd_afternoon', String(filters.crowdAfternoon));
    if (filters.crowdEvening < 5) newParams.set('crowd_evening', String(filters.crowdEvening));
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams, isFavoritesView, sortParam]);

  // Filtering Logic (Applies to all loaded cafes from React Query)
  const sortedCafes: CafeWithDistance[] = useMemo(() => {
    let baseCafes = cafes.filter(c => c.status === 'approved');
    let processedCafes: Cafe[];
    
    if (isFavoritesView) {
        const favoriteSet = new Set(favoriteIds);
        processedCafes = baseCafes.filter(cafe => favoriteSet.has(cafe.id));
    } else {
        processedCafes = baseCafes.filter(cafe => {
            if (filters.search && !cafe.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.city !== 'all' && cafe.city !== filters.city) return false;
            if (filters.vibes.length > 0 && !filters.vibes.every(v => cafe.vibes.some(cv => cv.id === v))) return false;
            if (filters.amenities.length > 0 && !filters.amenities.every(a => cafe.amenities.some(ca => ca.id === a))) return false;
            if (filters.tags.length > 0 && !filters.tags.every(t => cafe.tags.some(ct => ct.id === t))) return false;
            if (cafe.priceTier > filters.priceTier) return false;
            if (cafe.avgCrowdMorning > filters.crowdMorning) return false;
            if (cafe.avgCrowdAfternoon > filters.crowdAfternoon) return false;
            if (cafe.avgCrowdEvening > filters.crowdEvening) return false;
            if (filters.openingStatus === 'open_now' && !checkIfOpen(cafe.openingHours)) return false;
            if (filters.openingStatus === 'open_late' && !checkIfOpenLate(cafe.openingHours)) return false;
            if (filters.openingStatus === 'closed' && checkIfOpen(cafe.openingHours)) return false;
            return true;
        });
    }

    if (sortBy === 'distance' && userLocation) {
        return processedCafes
            .map(cafe => ({
                ...cafe,
                distance: calculateDistance(userLocation.lat, userLocation.lng, cafe.coords.lat, cafe.coords.lng),
            }))
            .sort((a, b) => a.distance! - b.distance!);
    }
    
    if (sortParam === 'trending') {
        return [...processedCafes].sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
    }
    
    // Default Sort: Sponsored first, then Rating, then Review Count
    return [...processedCafes].sort((a, b) => {
        if (a.isSponsored && !b.isSponsored) return -1;
        if (!a.isSponsored && b.isSponsored) return 1;
        if (b.avgAestheticScore !== a.avgAestheticScore) {
            return b.avgAestheticScore - a.avgAestheticScore;
        }
        const aReviewCount = a.reviews?.filter(r => r.status === 'approved').length || 0;
        const bReviewCount = b.reviews?.filter(r => r.status === 'approved').length || 0;
        return bReviewCount - aReviewCount;
    });
  }, [cafes, filters, sortBy, userLocation, isFavoritesView, favoriteIds, sortParam]);

  // Infinite Scroll Trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        },
        { rootMargin: "0px 0px 200px 0px" }
    );
    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
        observer.observe(currentLoaderRef);
    }
    return () => {
        if (currentLoaderRef) {
            observer.unobserve(currentLoaderRef);
        }
    };
}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleMultiSelect = (key: 'vibes' | 'amenities' | 'tags', value: string) => {
    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    handleFilterChange(key, newValues as any);
  };

  if (error) return <DatabaseConnectionError />;

  const filterPanelProps = {
    filters, handleFilterChange, toggleMultiSelect, setOpeningStatus, sortBy, isLocating, locationError, handleSortByDistance, allTags, currentUser
  };
  
  const isSpecialView = isFavoritesView || sortParam === 'trending';

  return (
    <div className="container mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
      {/* Filter Modal for Mobile */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] lg:hidden transition-opacity duration-300 ${isFiltersOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFiltersOpen(false)}>
          <div 
              className={`bg-card dark:bg-gray-800 p-6 h-full w-4/5 max-w-sm overflow-y-auto shadow-2xl transform transition-transform duration-300 ${isFiltersOpen ? 'translate-x-0' : '-translate-x-full'}`}
              onClick={e => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold font-jakarta text-primary dark:text-white">Filters</h3>
                  <button onClick={() => setIsFiltersOpen(false)} className="p-2 rounded-full hover:bg-soft dark:hover:bg-gray-700">
                      <XMarkIcon className="h-6 w-6 text-primary dark:text-white" />
                  </button>
              </div>
              <FilterPanelContent {...filterPanelProps} />
          </div>
      </div>

      {/* Filters Sidebar for Desktop */}
      <aside className={`hidden lg:block lg:w-1/4 xl:w-1/5 bg-card dark:bg-gray-800 p-6 rounded-3xl shadow-sm self-start border border-border lg:sticky lg:top-24 transition-opacity ${isSpecialView ? 'opacity-50 pointer-events-none' : ''}`}>
        <FilterPanelContent {...filterPanelProps} />
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-6">
            <button 
                onClick={() => setIsFiltersOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-card dark:bg-gray-800 border border-border rounded-2xl font-bold shadow-sm active:scale-95 transition-transform disabled:opacity-50 text-primary dark:text-white"
                disabled={isSpecialView}
            >
                <AdjustmentsHorizontalIcon className="h-6 w-6 text-brand" />
                <span>Filter & Urutkan</span>
            </button>
        </div>
        <div className="relative mb-8">
            <MagnifyingGlassIcon className="h-6 w-6 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                placeholder="Cari berdasarkan nama cafe..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full p-4 pl-12 text-lg rounded-2xl border-2 border-border focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm bg-card dark:bg-gray-800 text-primary dark:text-white dark:placeholder-muted disabled:opacity-50"
                disabled={isSpecialView}
            />
        </div>
        <div className="relative z-10 rounded-3xl mb-8 overflow-hidden shadow-md h-64 md:h-96 border border-border">
            <InteractiveMap cafes={sortedCafes.slice(0, 12)} theme={theme} showUserLocation={true} showHeatmap={showHeatmap} />
            <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className="absolute top-4 left-4 z-[1000] flex items-center gap-2 bg-card/80 dark:bg-gray-800/80 backdrop-blur-sm text-primary dark:text-white font-bold py-2 px-4 rounded-full shadow-lg hover:bg-card transition-colors"
            >
                <FireIcon className={`h-5 w-5 transition-colors ${showHeatmap ? 'text-red-500' : 'text-muted'}`} />
                {showHeatmap ? 'Heatmap: On' : 'Heatmap: Off'}
            </button>
        </div>
        
        <h2 className="text-3xl font-bold font-jakarta mb-6 text-primary dark:text-white">
            {loading ? 'Mencari cafe...' : 
             isFavoritesView ? `Kafe Favoritmu (${sortedCafes.length})` :
             sortParam === 'trending' ? `Kafe Paling Trending (${sortedCafes.length})` :
             `${sortedCafes.length} Cafe Ditemukan`}
        </h2>

        {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
        ) : sortedCafes.length > 0 ? (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {sortedCafes.map((cafe, i) => <CafeCard key={cafe.id} cafe={cafe} distance={cafe.distance} animationDelay={`${(i % 12) * 50}ms`} />)}
                </div>
                
                {/* Loader trigger element */}
                <div ref={loaderRef} className="py-8 flex justify-center w-full">
                     {isFetchingNextPage && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
                             {[...Array(3)].map((_, i) => <SkeletonCard key={`skel-next-${i}`} />)}
                        </div>
                     )}
                </div>
            </>
        ) : (
            <div className="text-center py-10 bg-card dark:bg-gray-800 rounded-3xl border border-border">
                <p className="text-4xl mb-4">😕</p>
                <p className="text-xl font-bold font-jakarta text-primary dark:text-white">Yah, cafe yang kamu cari tidak ditemukan.</p>
                <p className="text-muted mt-2">Coba ganti kata kuncimu atau kurangi kriteria pencarian ya.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
