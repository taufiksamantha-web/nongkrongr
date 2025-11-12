
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
import AiRecommenderModal from '../components/AiRecommenderModal';
import { settingsService } from '../services/settingsService';
import { FireIcon, ChatBubbleBottomCenterTextIcon, HeartIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';
import SkeletonCard from '../components/SkeletonCard';
import SkeletonFeaturedCard from '../components/SkeletonFeaturedCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';

type TopReview = Review & { cafeName: string; cafeSlug: string };

const SectionHeader: React.FC<{ icon?: React.ReactNode; title: string; subtitle: string; }> = ({ icon, title, subtitle }) => (
  <div className="text-center mb-10">
    {icon && <div className="inline-block p-4 bg-brand/10 rounded-3xl mb-4 text-brand">{icon}</div>}
    <h2 className="text-4xl font-bold font-jakarta text-primary dark:text-white mb-2">{title}</h2>
    <p className="text-muted max-w-2xl mx-auto">{subtitle}</p>
  </div>
);

const rotatingPlaceholders = [
  "Mau nongkrong di mana hari ini?",
  "Cari cafe buat nugas...",
  "Spot foto OOTD estetik...",
  "Kopi enak di Palembang...",
  "Tempat nongkrong sore yang adem...",
];

const HomePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading, error } = cafeContext!;
  const { favoriteIds } = useFavorites();
  
  const [trendingCafes, setTrendingCafes] = useState<Cafe[]>([]);
  const [recommendedCafes, setRecommendedCafes] = useState<Cafe[]>([]);
  const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
  const [topReviews, setTopReviews] = useState<TopReview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [heroBgUrl, setHeroBgUrl] = useState<string>("https://res.cloudinary.com/dovouihq8/image/upload/v1722244300/cover-placeholder-1_pqz5kl.jpg");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const url = await settingsService.getSetting('hero_background_url');
      if (url) {
          setHeroBgUrl(url);
      }
    };
    loadSettings();
  }, []);
  
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPlaceholderIndex(prevIndex => (prevIndex + 1) % rotatingPlaceholders.length);
    }, 2000); // Ganti setiap 2 detik

    return () => clearInterval(intervalId); // Bersihkan interval saat komponen unmount
  }, []);

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
      
      setRecommendedCafes(recommended.slice(0, 5));

      // Top Reviews
      const allApprovedReviews = cafes.flatMap(cafe =>
        cafe.reviews
          .filter(review => review.status === 'approved' && review.text.length > 20)
          .map(review => ({ ...review, cafeName: cafe.name, cafeSlug: cafe.slug }))
      );
      
      allApprovedReviews.sort((a, b) => {
        const scoreA = a.ratingAesthetic + a.ratingWork;
        const scoreB = b.ratingAesthetic + b.ratingWork;
        // Primary sort: combined score (descending)
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Tie-breaker: review text length (descending) to prioritize more detailed reviews
        return b.text.length - a.text.length;
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

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === recommendedCafes.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? recommendedCafes.length - 1 : prev - 1));
  };
  
  if (error) return <DatabaseConnectionError />;

  return (
    <div>
      {isAiModalOpen && <AiRecommenderModal onClose={() => setIsAiModalOpen(false)} />}
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
          <h1 className="text-5xl md:text-7xl font-extrabold font-jakarta text-white leading-snug drop-shadow-lg">
            Temukan Spot Nongkrong
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-accent-pink to-brand-light">
              Estetikmu
            </span>
          </h1>
          <p className="mt-4 text-lg text-gray-200 max-w-2xl mx-auto">
            Jelajahi cafe-cafe paling hits dan instagramable di Palembang. Dari tempat nugas super cozy sampai spot foto OOTD terbaik.
          </p>
          <div className="mt-8 max-w-xl mx-auto space-y-4">
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <SparklesIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-yellow-300 pointer-events-none" />
                <input
                  type="text"
                  placeholder={rotatingPlaceholders[placeholderIndex]}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.trim().length > 1 && setIsResultsVisible(true)}
                  className="w-full py-4 pl-14 pr-32 text-lg rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm text-white placeholder-gray-300"
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
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <hr className="w-full border-white/20"/>
              <span className="text-gray-300 font-semibold">ATAU</span>
              <hr className="w-full border-white/20"/>
            </div>

            <div className="text-center">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-3 bg-gradient-to-r from-brand to-accent-pink text-white font-bold py-3 px-6 rounded-2xl text-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 shadow-lg focus:ring-4 focus:ring-brand/30"
              >
                <SparklesIcon className="h-6 w-6" />
                Coba Asisten AI
              </button>
            </div>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-3">
              {VIBES.slice(0, 4).map(vibe => (
                  <Link to={`/explore?vibe=${vibe.id}`} key={vibe.id} className="bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 rounded-2xl text-white hover:bg-white/20 transition-all duration-300 font-semibold">
                      {vibe.name}
                  </Link>
              ))}
          </div>
        </div>
      </div>


      {/* Recommended Section */}
      <div className="relative py-12 overflow-hidden transition-all duration-500 bg-gradient-to-br from-brand/10 to-transparent dark:from-brand/20 dark:to-transparent">
        <div className="relative z-10 container mx-auto px-6">
          {loading ? (
            <div className="max-w-4xl mx-auto">
              <SkeletonFeaturedCard />
            </div>
          ) : recommendedCafes.length > 0 ? (
            <div className="max-w-4xl mx-auto relative">
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-500 ease-in-out" 
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {recommendedCafes.map(cafe => (
                    <div key={cafe.id} className="w-full flex-shrink-0">
                      <FeaturedCafeCard cafe={cafe} />
                    </div>
                  ))}
                </div>
              </div>

              {recommendedCafes.length > 1 && (
                <>
                  <button 
                    onClick={prevSlide}
                    className="absolute top-1/2 -translate-y-1/2 left-0 md:-left-16 p-3 bg-card/80 backdrop-blur-sm rounded-full text-primary hover:bg-card transition-all duration-300 shadow-md z-20"
                    aria-label="Previous recommendation"
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="absolute top-1/2 -translate-y-1/2 right-0 md:-right-16 p-3 bg-card/80 backdrop-blur-sm rounded-full text-primary hover:bg-card transition-all duration-300 shadow-md z-20"
                    aria-label="Next recommendation"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                </>
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
        <div className="py-12">
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
      <div className="py-12">
        <div className="container mx-auto px-6">
          <SectionHeader 
            icon={<FireIcon className="h-8 w-8"/>}
            title="Lagi Trending Nih!"
            subtitle="Cafe dengan skor aesthetic tertinggi pilihan warga Nongkrongr."
          />
          {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
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
      <div className="py-12 bg-brand/5 dark:bg-brand/10">
        <div className="container mx-auto px-6">
            <SectionHeader 
              icon={<ChatBubbleBottomCenterTextIcon className="h-8 w-8"/>}
              title="Kata Mereka Tentang Cafe Hits"
              subtitle="Review teratas dari para penjelajah cafe di Palembang."
            />
             {loading ? (
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <SkeletonReviewCard key={i} />)}
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
