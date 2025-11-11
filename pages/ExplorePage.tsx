
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cafe, PriceTier } from '../types';
import { CafeContext } from '../context/CafeContext';
import { ThemeContext } from '../App';
import { DISTRICTS, VIBES, AMENITIES } from '../constants';
import CafeCard from '../components/CafeCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import InteractiveMap from '../components/InteractiveMap';

const ITEMS_PER_PAGE = 12;

const ExplorePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading, error } = cafeContext!;
  const { theme } = useContext(ThemeContext);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const observerRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    district: searchParams.get('district') || 'all',
    vibes: searchParams.getAll('vibe') || [],
    amenities: searchParams.getAll('amenity') || [],
    priceTier: parseInt(searchParams.get('price_tier') || '4', 10) as PriceTier,
    crowd: parseInt(searchParams.get('crowd') || '5', 10),
  });
  
  const handleFilterChange = <K extends keyof typeof filters,>(key: K, value: (typeof filters)[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set('search', filters.search);
    if (filters.district !== 'all') newParams.set('district', filters.district);
    filters.vibes.forEach(vibe => newParams.append('vibe', vibe));
    filters.amenities.forEach(amenity => newParams.append('amenity', amenity));
    if (filters.priceTier < 4) newParams.set('price_tier', String(filters.priceTier));
    if (filters.crowd < 5) newParams.set('crowd', String(filters.crowd));
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);

  const filteredCafes = useMemo(() => {
    return cafes.filter(cafe => {
      if (filters.search && !cafe.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.district !== 'all' && cafe.district !== filters.district) return false;
      if (filters.vibes.length > 0 && !filters.vibes.every(v => cafe.vibes.some(cv => cv.id === v))) return false;
      if (filters.amenities.length > 0 && !filters.amenities.every(a => cafe.amenities.some(ca => ca.id === a))) return false;
      if (cafe.priceTier > filters.priceTier) return false;
      if (cafe.avgCrowdEvening > filters.crowd) return false;
      return true;
    });
  }, [cafes, filters]);

  const visibleCafes = useMemo(() => {
    return filteredCafes.slice(0, visibleCount);
  }, [filteredCafes, visibleCount]);

  // Reset list when filters change
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && visibleCount < filteredCafes.length) {
          setVisibleCount((prevCount) => prevCount + ITEMS_PER_PAGE);
        }
      },
      { threshold: 1.0 }
    );

    const currentObserverRef = observerRef.current;
    if (currentObserverRef) {
      observer.observe(currentObserverRef);
    }

    return () => {
      if (currentObserverRef) {
        observer.unobserve(currentObserverRef);
      }
    };
  }, [visibleCount, filteredCafes.length]);


  const toggleMultiSelect = (key: 'vibes' | 'amenities', value: string) => {
    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    handleFilterChange(key, newValues);
  };

  if (error) return <DatabaseConnectionError />;

  return (
    <div className="container mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
      {/* Filters Sidebar */}
      <aside className="lg:w-1/4 xl:w-1/5 space-y-6 bg-card p-6 rounded-3xl shadow-sm self-start border border-border">
        <h3 className="text-2xl font-bold font-jakarta">Filters</h3>

        {/* District */}
        <div>
          <label className="font-semibold">Kecamatan</label>
          <select value={filters.district} onChange={e => handleFilterChange('district', e.target.value)} className="mt-2 w-full p-2 border border-border rounded-xl bg-soft dark:bg-gray-700 text-primary dark:text-white">
            <option value="all">Semua Kecamatan</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Vibes */}
        <div>
          <label className="font-semibold">Vibes</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map(vibe => (
              <button key={vibe.id} onClick={() => toggleMultiSelect('vibes', vibe.id)} className={`px-3 py-1 text-sm rounded-full border-2 transition-all ${filters.vibes.includes(vibe.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50'}`}>
                {vibe.name}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className="font-semibold">Fasilitas</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {AMENITIES.map(amenity => (
              <button key={amenity.id} onClick={() => toggleMultiSelect('amenities', amenity.id)} className={`px-3 py-1 text-sm rounded-full border-2 transition-all ${filters.amenities.includes(amenity.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50'}`}>
                {amenity.icon} {amenity.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Price Tier */}
        <div>
            <label className="font-semibold block mb-2">Harga (Maks.)</label>
            <div className="flex justify-between text-muted text-sm">
                <span>Murah</span>
                <span>Sultan</span>
            </div>
            <input type="range" min="1" max="4" value={filters.priceTier} onChange={e => handleFilterChange('priceTier', parseInt(e.target.value))} className="w-full mt-1 accent-brand"/>
        </div>

        {/* Crowd Level */}
        <div>
            <label className="font-semibold block mb-2">Keramaian Malam (Maks.)</label>
            <div className="flex justify-between text-muted text-sm">
                <span>Sepi</span>
                <span>Penuh</span>
            </div>
            <input type="range" min="1" max="5" value={filters.crowd} onChange={e => handleFilterChange('crowd', parseInt(e.target.value))} className="w-full mt-1 accent-accent-pink"/>
        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <div className="relative mb-8">
            <MagnifyingGlassIcon className="h-6 w-6 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                placeholder="Cari berdasarkan nama cafe..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full p-4 pl-12 text-lg rounded-2xl border-2 border-border focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm bg-card text-primary dark:text-white dark:placeholder-muted"
            />
        </div>
        <div className="rounded-3xl mb-8 overflow-hidden shadow-md h-96 border border-border">
            <InteractiveMap cafes={filteredCafes} theme={theme} showUserLocation={true} />
        </div>
        <h2 className="text-3xl font-bold font-jakarta mb-6">{filteredCafes.length} Cafe Ditemukan</h2>
        {loading && visibleCafes.length === 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-card h-80 rounded-3xl animate-pulse opacity-50"></div>)}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {visibleCafes.map((cafe, i) => <CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />)}
            </div>
            
            {/* Infinite Scroll Trigger & Loading Indicator */}
            {visibleCount < filteredCafes.length && (
              <div ref={observerRef} className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-brand"></div>
                <span className="sr-only">Loading more cafes...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
