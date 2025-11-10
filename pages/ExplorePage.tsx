import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Cafe, PriceTier } from '../types';
import { CafeContext } from '../context/CafeContext';
import { DISTRICTS, VIBES, AMENITIES } from '../constants';
import CafeCard from '../components/CafeCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

const ExplorePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading } = cafeContext!;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

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

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const toggleMultiSelect = (key: 'vibes' | 'amenities', value: string) => {
    const currentValues = filters[key];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(item => item !== value)
      : [...currentValues, value];
    handleFilterChange(key, newValues);
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredCafes.length / ITEMS_PER_PAGE);
  const paginatedCafes = filteredCafes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const paginationButtonClass = "px-4 py-2 rounded-xl font-semibold transition-colors duration-200";
    const activePaginationButtonClass = "bg-primary text-white";
    const inactivePaginationButtonClass = "bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-primary/10 dark:hover:bg-primary/20";
    const arrowButtonClass = "px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-600 font-semibold transition-colors";

    return (
      <div className="mt-12 flex justify-center items-center space-x-2">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className={arrowButtonClass}
          aria-label="Go to previous page"
        >
          &larr;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            className={`${paginationButtonClass} ${currentPage === page ? activePaginationButtonClass : inactivePaginationButtonClass}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className={arrowButtonClass}
          aria-label="Go to next page"
        >
          &rarr;
        </button>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-6 py-8 flex flex-col lg:flex-row gap-8">
      {/* Filters Sidebar */}
      <aside className="lg:w-1/4 xl:w-1/5 space-y-6 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm self-start">
        <h3 className="text-2xl font-bold font-jakarta">Filters</h3>

        {/* District */}
        <div>
          <label className="font-semibold">Kecamatan</label>
          <select value={filters.district} onChange={e => handleFilterChange('district', e.target.value)} className="mt-2 w-full p-2 border rounded-xl dark:bg-gray-700 dark:border-gray-600">
            <option value="all">Semua Kecamatan</option>
            {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Vibes */}
        <div>
          <label className="font-semibold">Vibes</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {VIBES.map(vibe => (
              <button key={vibe.id} onClick={() => toggleMultiSelect('vibes', vibe.id)} className={`px-3 py-1 text-sm rounded-full border-2 transition-all ${filters.vibes.includes(vibe.id) ? 'bg-primary text-white border-primary' : 'bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>
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
              <button key={amenity.id} onClick={() => toggleMultiSelect('amenities', amenity.id)} className={`px-3 py-1 text-sm rounded-full border-2 transition-all ${filters.amenities.includes(amenity.id) ? 'bg-primary text-white border-primary' : 'bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300'}`}>
                {amenity.icon} {amenity.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Price Tier */}
        <div>
            <label className="font-semibold block mb-2">Harga (Maks.)</label>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Murah</span>
                <span>Sultan</span>
            </div>
            <input type="range" min="1" max="4" value={filters.priceTier} onChange={e => handleFilterChange('priceTier', parseInt(e.target.value))} className="w-full mt-1 accent-primary"/>
        </div>

        {/* Crowd Level */}
        <div>
            <label className="font-semibold block mb-2">Keramaian Malam (Maks.)</label>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Sepi</span>
                <span>Penuh</span>
            </div>
            <input type="range" min="1" max="5" value={filters.crowd} onChange={e => handleFilterChange('crowd', parseInt(e.target.value))} className="w-full mt-1 accent-accent-pink"/>
        </div>

      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <div className="relative mb-8">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
                type="text"
                placeholder="Cari berdasarkan nama cafe..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="w-full p-4 pl-12 text-lg rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400"
            />
        </div>
        <div className="bg-gray-200 dark:bg-gray-800 h-64 rounded-3xl mb-8 text-center flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">Interactive Map Placeholder</p>
        </div>
        <h2 className="text-3xl font-bold font-jakarta mb-6">{filteredCafes.length} Cafe Ditemukan</h2>
        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-800 h-80 rounded-3xl animate-pulse"></div>)}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
              {paginatedCafes.map(cafe => <CafeCard key={cafe.id} cafe={cafe} />)}
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
