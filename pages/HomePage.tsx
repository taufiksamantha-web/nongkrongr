import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { VIBES } from '../constants';
import { CafeContext } from '../context/CafeContext';
import CafeCard from '../components/CafeCard';
import FeaturedCafeCard from '../components/FeaturedCafeCard';
import ReviewCard from '../components/ReviewCard';

type TopReview = Review & { cafeName: string; cafeSlug: string };

const HomePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading } = cafeContext!;
  
  const [trendingCafes, setTrendingCafes] = useState<Cafe[]>([]);
  const [recommendedCafe, setRecommendedCafe] = useState<Cafe | null>(null);
  const [topReviews, setTopReviews] = useState<TopReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cafes.length > 0) {
      // Trending cafes based on aesthetic score
      const sortedByAesthetic = [...cafes].sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
      setTrendingCafes(sortedByAesthetic.slice(0, 4));

      // Dynamic Recommendation Logic
      const calculateRecommendationScore = (cafe: Cafe): number => {
        if (cafe.reviews.filter(r => r.status === 'approved').length === 0) {
            return 0;
        }
        let score = (cafe.avgAestheticScore + cafe.avgWorkScore) / 2;
        if (cafe.spots.length > 0) score += 1.5;
        if (cafe.reviews.length > 3) score += 1.0;
        if (cafe.amenities.length >= 5) score += 0.5;
        if (cafe.isSponsored) {
            score += 10 - (cafe.sponsoredRank * 0.5);
        }
        return score;
      };

      const recommended = cafes
        .map(cafe => ({ cafe, score: calculateRecommendationScore(cafe) }))
        .sort((a, b) => b.score - a.score);

      if (recommended.length > 0 && recommended[0].score > 0) {
        setRecommendedCafe(recommended[0].cafe);
      } else if (cafes.length > 0) {
        setRecommendedCafe(sortedByAesthetic[0]);
      }

      // --- New Top Reviews Logic ---
      const allApprovedReviews = cafes.flatMap(cafe =>
        cafe.reviews
          .filter(review => review.status === 'approved' && review.text.length > 20)
          .map(review => ({
            ...review,
            cafeName: cafe.name,
            cafeSlug: cafe.slug,
          }))
      );
      
      allApprovedReviews.sort((a, b) => {
        const scoreA = a.ratingAesthetic + a.ratingWork;
        const scoreB = b.ratingAesthetic + b.ratingWork;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTopReviews(allApprovedReviews.slice(0, 4));
    }
  }, [cafes]);

  // Effect for real-time search filtering
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const filtered = cafes.filter(cafe =>
        cafe.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
      setSearchResults(filtered);
      setIsResultsVisible(true);
    } else {
      setSearchResults([]);
      setIsResultsVisible(false);
    }
  }, [searchQuery, cafes]);

  // Effect for closing results on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsResultsVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold font-jakarta bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent-pink leading-snug">
          Temukan Spot Nongkrong
          <br />
          Estetikmu
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Jelajahi cafe-cafe paling hits dan instagramable di Palembang. Dari tempat nugas super cozy sampai spot foto OOTD terbaik.
        </p>
        <div ref={searchContainerRef} className="mt-8 max-w-xl mx-auto relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Cari cafe di Palembang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length > 1 && setIsResultsVisible(true)}
              className="w-full py-4 px-6 text-lg rounded-2xl border-2 border-gray-200 focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all duration-300 shadow-sm text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-white px-6 py-2 rounded-2xl font-bold hover:bg-primary/90 transition-all duration-300">
              Cari
            </button>
          </form>

          {isResultsVisible && (
            <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border dark:border-gray-700 z-10 max-h-80 overflow-y-auto text-left">
              {searchResults.length > 0 ? (
                <ul>
                  {searchResults.map(cafe => (
                    <li key={cafe.id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                      <Link 
                        to={`/cafe/${cafe.slug}`} 
                        className="block px-6 py-4 hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors duration-200"
                        onClick={() => setIsResultsVisible(false)}
                      >
                        <p className="font-bold text-gray-800 dark:text-white">{cafe.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{cafe.district}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 py-4 text-gray-500 dark:text-gray-400">Cafe tidak ditemukan.</p>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {VIBES.slice(0, 4).map(vibe => (
                <Link to={`/explore?vibe=${vibe.id}`} key={vibe.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-2xl text-gray-700 dark:text-gray-300 hover:bg-primary hover:text-white hover:border-primary dark:hover:border-primary transition-all duration-300 font-semibold">
                    {vibe.name}
                </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Pilihan Editor Minggu Ini</h2>
           <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Cafe yang wajib banget kamu datengin sekarang!</p>
          {loading ? (
            <div className="bg-gray-200 dark:bg-gray-800 h-72 rounded-4xl animate-pulse max-w-4xl mx-auto"></div>
          ) : recommendedCafe ? (
            <FeaturedCafeCard cafe={recommendedCafe} />
          ) : null}
        </div>
      </div>


      {/* Trending Section */}
      <div className="bg-primary/5 dark:bg-primary/10 py-16">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Lagi Trending Nih!</h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Cafe dengan skor aesthetic tertinggi pilihan warga Nongkrongr.</p>
          {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-800 h-80 rounded-3xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {trendingCafes.map(cafe => (
                <CafeCard key={cafe.id} cafe={cafe} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Top Reviews Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold font-jakarta text-center mb-2">Kata Mereka Tentang Cafe Hits</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-10">Review teratas dari para penjelajah cafe di Palembang.</p>
             {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-800 h-64 rounded-3xl animate-pulse"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {topReviews.map(review => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;