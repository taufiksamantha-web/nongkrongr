
import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { VIBES } from '../constants';
import { CafeContext } from '../context/CafeContext';
import { useFavorites } from '../context/FavoriteContext';
import CafeCard from '../components/CafeCard';
import FeaturedCafeCard from '../components/FeaturedCafeCard';
import ReviewCard from '../components/ReviewCard';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import { settingsService } from '../services/settingsService';
import { HandThumbUpIcon, ArrowLeftIcon, ArrowRightIcon, FireIcon, ChatBubbleBottomCenterTextIcon, HeartIcon } from '@heroicons/react/24/solid';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';

type TopReview = Review & { cafeName: string; cafeSlug: string };

const SectionHeader: React.FC<{ icon?: React.ReactNode; title: string; subtitle: string; }> = ({ icon, title, subtitle }) => (
  <div className="text-center mb-12">
    {icon && <div className="inline-block p-4 bg-brand/10 rounded-3xl mb-4 text-brand">{icon}</div>}
    <h2 className="text-4xl font-bold font-jakarta text-primary dark:text-white mb-2">{title}</h2>
    <p className="text-muted max-w-2xl mx-auto">{subtitle}</p>
  </div>
);


const HomePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading, error, fetchCafes } = cafeContext!;
  const { favoriteIds } = useFavorites();
  
  const [trendingCafes, setTrendingCafes] = useState<Cafe[]>([]);
  const [recommendedCafes, setRecommendedCafes] = useState<Cafe[]>([]);
  const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
  const [currentRecommendedIndex, setCurrentRecommendedIndex] = useState(0);
  const [topReviews, setTopReviews] = useState<TopReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("https://res.cloudinary.com/dovouihq8/image/upload/v1722244300/cover-placeholder-1_pqz5kl.jpg");
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPageData = async () => {
      await fetchCafes();
      const url = await settingsService.getSetting('hero_background_url');
      if (url) {
          setHeroBgUrl(url);
      }
    };
    loadPageData();
  }, [fetchCafes]);

  useEffect(() => {
    if (cafes.length > 0) {
      // Trending
      const sortedByAesthetic = [...cafes].sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
      setTrendingCafes(sortedByAesthetic.slice(0, 4));

      // Recommended
      const calculateRecommendationScore = (cafe: Cafe): number => {
        if (cafe.reviews.filter(r => r.status === 'approved').length === 0) return 0;
        let score = (cafe.avgAestheticScore + cafe.avgWorkScore) / 2;
        if (cafe.spots.length > 0) score += 1.5;
        if (cafe.reviews.length > 3) score += 1.0;
        if (cafe.amenities.length >= 5) score += 0.5;
        if (cafe.isSponsored) score += 10 - (cafe.sponsoredRank * 0.5);
        return score;
      };

      const recommended = cafes
        .map(cafe => ({ cafe, score: calculateRecommendationScore(cafe) }))
        .sort((a, b) => b.score - a.score)
        .filter(item => item.score > 0)
        .map(item => item.cafe);
      
      setRecommendedCafes(recommended.slice(0, 3));

      // Top Reviews
      const allApprovedReviews = cafes.flatMap(cafe =>
        cafe.reviews
          .filter(review => review.status === 'approved' && review.text.length > 20)
          .map(review => ({ ...review, cafeName: cafe.name, cafeSlug: cafe.slug }))
      );
      
      allApprovedReviews.sort((a, b) => {
        const scoreA = a.ratingAesthetic + a.ratingWork;
        const scoreB = b.ratingAesthetic + b.ratingWork;
        if (scoreB !== scoreA) return scoreB - a.ratingWork;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTopReviews(allApprovedReviews.slice(0, 4));
      
      // Favorites
      const userFavorites = cafes.filter(cafe => favoriteIds.includes(cafe.id));
      setFavoriteCafes(userFavorites);
    }
  }, [cafes, favoriteIds]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsResultsVisible(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handlePrevRecommendation = () => setCurrentRecommendedIndex(prev => (prev === 0 ? recommendedCafes.length - 1 : prev - 1));
  const handleNextRecommendation = () => setCurrentRecommendedIndex(prev => (prev === recommendedCafes.length - 1 ? 0 : prev + 1));
  
  if (error) return <DatabaseConnectionError />;
  
  const currentRecommendedCafe = recommendedCafes[currentRecommendedIndex];

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gray-900">
        <div className="absolute inset-0 z-0">
           <img 
              src={optimizeCloudinaryImage(heroBgUrl, 1280, 720)}
              alt="Suasana cafe yang nyaman"
              className="w-full h-full object-cover blur-sm"
            />
            <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 container mx-auto px-6 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-extrabold font-jakarta bg-clip-text text-transparent bg-gradient-to-r from-brand-light to-accent-pink leading-snug drop-shadow-lg">
            Temukan Spot Nongkrong
            <br />
            Estetikmu
          </h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
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
                className="w-full py-4 px-6 text-lg rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm text-white placeholder-gray-300"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand text-white px-6 py-2 rounded-2xl font-bold hover:bg-brand/90 transition-all duration-300">
                Cari
              </button>
            </form>

            {isResultsVisible && (
              <div className="absolute top-full mt-2 w-full bg-card rounded-2xl shadow-lg border border-subtle z-10 max-h-80 overflow-y-auto text-left">
                {searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map(cafe => (
                      <li key={cafe.id} className="border-b border-subtle last:border-b-0">
                        <Link 
                          to={`/cafe/${cafe.slug}`} 
                          className="block px-6 py-4 hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors duration-200"
                          onClick={() => setIsResultsVisible(false)}
                        >
                          <p className="font-bold text-primary dark:text-white">{cafe.name}</p>
                          <p className="text-sm text-muted">{cafe.district}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-6 py-4 text-muted">Cafe tidak ditemukan.</p>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {VIBES.slice(0, 4).map(vibe => (
                  <Link to={`/explore?vibe=${vibe.id}`} key={vibe.id} className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-white hover:bg-white/20 transition-all duration-300 font-semibold">
                      {vibe.name}
                  </Link>
              ))}
            </div>
          </div>
        </div>
      </div>


      {/* Recommended Section */}
      <div className="relative py-16 overflow-hidden transition-all duration-500 bg-gradient-to-br from-brand/10 to-transparent dark:from-brand/20 dark:to-transparent">
        <div className="relative z-10 container mx-auto px-6">
          <SectionHeader 
            icon={<HandThumbUpIcon className="h-8 w-8"/>}
            title="Pilihan Editor Minggu Ini"
            subtitle="Cafe yang wajib banget kamu datengin sekarang!"
          />
          
          {loading ? (
            <div className="bg-gray-200/20 dark:bg-gray-800/50 h-72 rounded-4xl animate-pulse max-w-4xl mx-auto"></div>
          ) : currentRecommendedCafe ? (
            <div className="max-w-4xl mx-auto">
              <FeaturedCafeCard cafe={currentRecommendedCafe} />
              {recommendedCafes.length > 1 && (
                <div className="flex justify-center items-center mt-8 space-x-6">
                  <button onClick={handlePrevRecommendation} className="p-3 rounded-full bg-card/80 hover:bg-card border border-subtle transition-colors text-primary backdrop-blur-sm" aria-label="Previous recommendation">
                    <ArrowLeftIcon className="h-6 w-6"/>
                  </button>

                  <div className="flex items-center space-x-3">
                    {recommendedCafes.map((_, index) => (
                      <button 
                        key={index} 
                        onClick={() => setCurrentRecommendedIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentRecommendedIndex ? 'bg-brand scale-125' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'}`}
                        aria-label={`Go to recommendation ${index + 1}`}
                      ></button>
                    ))}
                  </div>

                  <button onClick={handleNextRecommendation} className="p-3 rounded-full bg-card/80 hover:bg-card border border-subtle transition-colors text-primary backdrop-blur-sm" aria-label="Next recommendation">
                    <ArrowRightIcon className="h-6 w-6"/>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10 text-muted">
                <p>Belum ada rekomendasi yang tersedia saat ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Favorite Cafes Section */}
      {favoriteCafes.length > 0 && (
        <div className="py-16">
          <div className="container mx-auto px-6">
            <SectionHeader 
              icon={<HeartIcon className="h-8 w-8"/>}
              title="Kafe Favoritmu"
              subtitle="Tempat-tempat spesial yang sudah kamu tandai."
            />
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {favoriteCafes.map((cafe, i) => (
                <CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trending Section */}
      <div className="py-16">
        <div className="container mx-auto px-6">
          <SectionHeader 
            icon={<FireIcon className="h-8 w-8"/>}
            title="Lagi Trending Nih!"
            subtitle="Cafe dengan skor aesthetic tertinggi pilihan warga Nongkrongr."
          />
          {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-card h-80 rounded-3xl animate-pulse opacity-50"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {trendingCafes.map((cafe, i) => (
                <CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Top Reviews Section */}
      <div className="py-16 bg-brand/5 dark:bg-brand/10">
        <div className="container mx-auto px-6">
            <SectionHeader 
              icon={<ChatBubbleBottomCenterTextIcon className="h-8 w-8"/>}
              title="Kata Mereka Tentang Cafe Hits"
              subtitle="Review teratas dari para penjelajah cafe di Palembang."
            />
             {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <div key={i} className="bg-card h-64 rounded-3xl animate-pulse opacity-50"></div>)}
             </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {topReviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} animationDelay={`${i * 75}ms`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
