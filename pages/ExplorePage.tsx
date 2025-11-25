
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
import { calculateDistance, getDrivingDistance } from '../utils/geolocation';
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
    
    // Style untuk input yang lebih kontras di mobile/desktop
    const inputClass = "w-full p-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-primary dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-colors text-sm font-medium";

    return (
        <>
            {/* City */}
            <div className="py-2">
                <label className="font-bold block text-sm text-primary dark:text-gray-200 mb-1.5">Kota/Kabupaten</label>
                <div>
                    <select value={filters.city} onChange={e => handleFilterChange('city', e.target.value)} className={inputClass}>
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
                            ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-primary hover:border-brand/50 dark:text-white'
                    } disabled:opacity-50 disabled:cursor-wait`}
                >
                    {isLocating ? (
                        <>
                            <div className="w-4 h-4 border-2 border-dashed rounded-full animate-spin border-current"></div>
                            Hitung Rute...
                        </>
                    ) : (
                        <>
                            <MapPinIcon className="h-5 w-5" />
                            {sortBy === 'distance' ? 'Reset Urutan' : 'Urutkan Terdekat (Rute)'}
                        </>
                    )}
                </button>
                {locationError && <p className="text-xs text-accent-pink mt-1">{locationError}</p>}
            </div>

            {/* Opening Status */}
            <details className="py-2 border-t border-border group" open>
                <summary className="flex justify-between items-center font-bold text-sm cursor-pointer list-none text-primary dark:text-gray-200 mb-2">
                    Status Buka
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-2">
                    {openingStatusOptions.map(({ value, label }) => (
                        <label key={value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                            <input
                                type="radio"
                                name="openingStatus"
                                value={value}
                                checked={filters.openingStatus === value}
                                onChange={() => setOpeningStatus(value)}
                                className="h-4 w-4 text-brand focus:ring-brand focus:ring-2 border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800"
                            />
                            <span className="text-sm font-medium text-primary dark:text-gray-300">{label}</span>
                        </label>
                    ))}
                </div>
            </details>
            
            {/* Price Tier */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-bold text-sm cursor-pointer list-none text-primary dark:text-gray-200 mb-2">
                    Harga
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-2 grid grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as const).map(tier => (
                        <button
                            key={tier}
                            onClick={() => handleFilterChange('priceTier', tier)}
                            className={`py-2 text-sm rounded-lg border font-bold transition-all ${
                                filters.priceTier === tier
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-muted hover:border-brand/50 dark:text-gray-300'
                            }`}
                        >
                            {'$'.repeat(tier)}
                        </button>
                    ))}
                </div>
            </details>

            {/* Vibes */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-bold text-sm cursor-pointer list-none text-primary dark:text-gray-200 mb-2">
                    Vibe
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-2 flex flex-wrap gap-2">
                    {VIBES.map(vibe => (
                        <button
                            key={vibe.id}
                            onClick={() => toggleMultiSelect('vibes', vibe.id)}
                            className={`px-3 py-1.5 text-xs rounded-full border font-bold transition-all ${
                                filters.vibes.includes(vibe.id)
                                    ? 'bg-brand text-white border-brand'
                                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-muted hover:border-brand/50 dark:text-gray-300'
                            }`}
                        >
                            {vibe.name}
                        </button>
                    ))}
                </div>
            </details>

            {/* Amenities */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-bold text-sm cursor-pointer list-none text-primary dark:text-gray-200 mb-2">
                    Fasilitas
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-2 grid grid-cols-4 gap-2">
                    {AMENITIES.map(amenity => (
                        <button 
                            key={amenity.id} 
                            onClick={() => toggleMultiSelect('amenities', amenity.id)} 
                            title={amenity.name}
                            className={`p-3 text-xl rounded-lg border transition-all flex items-center justify-center ${filters.amenities.includes(amenity.id) ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-muted hover:border-brand/50 dark:text-gray-300'}`}
                        >
                            {amenity.icon}
                        </button>
                    ))}
                </div>
            </details>

            {/* Crowd Level */}
            <details className="py-2 border-t border-border group">
                <summary className="flex justify-between items-center font-bold text-sm cursor-pointer list-none text-primary dark:text-gray-200 mb-2">
                    Tingkat Keramaian (Maks.)
                    <ChevronDownIcon className="h-4 w-4 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="mt-2 space-y-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-border">
                    <div>
                        <label className="text-xs font-bold text-muted uppercase mb-1 block">Pagi ({filters.crowdMorning})</label>
                        <input type="range" min="1" max="5" value={filters.crowdMorning} onChange={e => handleFilterChange('crowdMorning', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-accent-amber"/>
                    </div>
                     <div>
                        <label className="text-xs font-bold text-muted uppercase mb-1 block">Siang ({filters.crowdAfternoon})</label>
                        <input type="range" min="1" max="5" value={filters.crowdAfternoon} onChange={e => handleFilterChange('crowdAfternoon', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand/75"/>
                    </div>
                     <div>
                        <label className="text-xs font-bold text-muted uppercase mb-1 block">Malam ({filters.crowdEvening})</label>
                        <input type="range" min="1" max="5" value={filters.crowdEvening} onChange={e => handleFilterChange('crowdEvening', parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand"/>
                    </div>
                </div>
            </details>

            {/* Tags */}
            {currentUser && (
                <div className="py-2 border-t border-border">
                    <label className="font-bold block text-sm text-primary dark:text-gray-200 mb-1.5">Tag Komunitas</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {allTags.map(tag => (
                            <button 
                                key={tag.id} 
                                onClick={() => toggleMultiSelect('tags', tag.id)} 
                                className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border font-bold transition-all ${filters.tags.includes(tag.id) ? 'bg-brand text-white border-brand' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-muted hover:border-brand/50 dark:text-gray-300'}`}
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
  const [drivingDistances, setDrivingDistances] = useState<Map<string, number>>(new Map());

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
        setDrivingDistances(new Map());
    }
  };

  const setOpeningStatus = (status: OpeningStatus) => {
    setFilters(prev => ({ ...prev, openingStatus: status }));
  };

  // FIX: Ensure "Trending" overrides "Distance" sort when the URL param changes
  useEffect(() => {
      if (sortParam === 'trending') {
          setSortBy('default');
      }
  }, [sortParam]);

  const handleSortByDistance = () => {
    if (sortBy === 'distance' && !locationError) {
        if (sortParam !== 'distance') {
             setSortBy('default');
             setUserLocation(null);
             setDrivingDistances(new Map());
             return;
        }
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            const userLoc = { lat: latitude, lng: longitude };
            setUserLocation(userLoc);

            const baseCafes = cafes.filter(c => c.status === 'approved');
            const processedCafes = baseCafes.filter(cafe => {
                 if (filters.city !== 'all' && cafe.city !== filters.city) return false;
                 return true;
            });

            const newDistances = new Map<string, number>();

            await Promise.all(processedCafes.map(async (cafe) => {
                if (cafe.coords) {
                    const dist = await getDrivingDistance(userLoc, cafe.coords);
                    if (dist !== null) {
                        newDistances.set(cafe.id, dist);
                    } else {
                        const straightDist = calculateDistance(userLoc.lat, userLoc.lng, cafe.coords.lat, cafe.coords.lng);
                        newDistances.set(cafe.id, straightDist);
                    }
                }
            }));

            setDrivingDistances(newDistances);
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
      if (sortParam === 'distance' && sortBy !== 'distance' && !isLocating && !userLocation) {
          handleSortByDistance();
      }
  }, [sortParam]);

  useEffect(() => {
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

  // Filtering Logic
  const sortedCafes: CafeWithDistance[] = useMemo(() => {
    let baseCafes = cafes.filter(c => c.status === 'approved');
    let processedCafes: Cafe[];
    
    if (isFavoritesView) {
        const favoriteSet = new Set(favoriteIds);
        processedCafes = baseCafes.filter(cafe => favoriteSet.has(cafe.id));
    } else {
        processedCafes = baseCafes.filter(cafe => {
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const matchesSearch = 
                    cafe.name.toLowerCase().includes(term) ||
                    cafe.description?.toLowerCase().includes(term) ||
                    cafe.city?.toLowerCase().includes(term) ||
                    cafe.district?.toLowerCase().includes(term) ||
                    cafe.vibes.some(v => v.name.toLowerCase().includes(term)) ||
                    cafe.amenities.some(a => a.name.toLowerCase().includes(term)) ||
                    cafe.tags.some(t => t.name.toLowerCase().includes(term));

                if (!matchesSearch) return false;
            }

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
            .map(cafe => {
                const dist = drivingDistances.has(cafe.id) 
                    ? drivingDistances.get(cafe.id) 
                    : calculateDistance(userLocation.lat, userLocation.lng, cafe.coords.lat, cafe.coords.lng);
                return { ...cafe, distance: dist };
            })
            .sort((a, b) => (a.distance || 99999) - (b.distance || 99999));
    }
    
    if (sortParam === 'trending') {
        // FIX: Better sorting algorithm. Use Average of Aesthetic + Work score for general rating.
        return [...processedCafes].sort((a, b) => {
            const scoreA = (a.avgAestheticScore + a.avgWorkScore) / 2;
            const scoreB = (b.avgAestheticScore + b.avgWorkScore) / 2;
            
            if (scoreB !== scoreA) return scoreB - scoreA;
            // Tie breaker: Review count
            const reviewsA = a.reviews?.filter(r => r.status === 'approved').length || 0;
            const reviewsB = b.reviews?.filter(r => r.status === 'approved').length || 0;
            return reviewsB - reviewsA;
        });
    }
    
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
  }, [cafes, filters, sortBy, userLocation, isFavoritesView, favoriteIds, sortParam, drivingDistances]);

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
    <div className="container mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-6xl">
      {/* Filter Modal for Mobile */}
      <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] lg:hidden transition-opacity duration-300 ${isFiltersOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFiltersOpen(false)}>
          <div 
              className={`bg-card dark:bg-gray-800 p-6 h-full w-4/5 max-w-sm overflow-y-auto shadow-2xl transform transition-transform duration-300 ${isFiltersOpen ? 'translate-x-0' : '-translate-x-full'}`}
              onClick={e => e.stopPropagation()}
          >
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                  <h3 className="text-2xl font-bold font-jakarta text-primary dark:text-white">Filters</h3>
                  <button onClick={() => setIsFiltersOpen(false)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <XMarkIcon className="h-6 w-6 text-primary dark:text-white" />
                  </button>
              </div>
              <div className="space-y-4">
                <FilterPanelContent {...filterPanelProps} />
              </div>
          </div>
      </div>

      {/* Filters Sidebar for Desktop - Fluid width */}
      <aside className={`hidden lg:block lg:w-1/4 xl:w-1/5 min-w-[250px] bg-card dark:bg-gray-800 p-6 rounded-3xl shadow-sm self-start border border-border lg:sticky lg:top-32 transition-opacity ${isSpecialView ? 'opacity-50 pointer-events-none' : ''}`}>
        <FilterPanelContent {...filterPanelProps} />
      </aside>

      {/* Main Content - Fluid width */}
      <div className="flex-1 w-full min-w-0 pb-20">
        {/* Mobile Filter Floating Button */}
        <button 
            onClick={() => setIsFiltersOpen(true)}
            className="lg:hidden fixed bottom-28 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-6 py-3.5 bg-gray-900/80 dark:bg-white/80 backdrop-blur-xl border border-white/10 dark:border-black/5 text-white dark:text-gray-900 rounded-full shadow-2xl shadow-brand/25 hover:scale-105 active:scale-95 transition-all duration-300 ring-1 ring-white/20 dark:ring-black/10 disabled:opacity-50"
            disabled={isSpecialView}
        >
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-brand" />
            <span className="font-bold text-sm tracking-wide">Filter & Urutkan</span>
        </button>

        <div className="relative mb-8">
            <MagnifyingGlassIcon className="h-6 w-6 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                placeholder="Cari nama, lokasi, vibes, fasilitas, atau tag..."
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
