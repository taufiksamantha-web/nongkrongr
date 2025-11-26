
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cafe, Review, User } from '../types';
import { VIBES } from '../constants';
import { CafeContext } from '../context/CafeContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';
import CafeCard from '../components/CafeCard';
import FeaturedCafeCard from '../components/FeaturedCafeCard';
import ReviewCard from '../components/ReviewCard';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import { FireIcon, HeartIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, InboxIcon, ArrowRightIcon, MapPinIcon, RocketLaunchIcon, TrophyIcon, ChatBubbleBottomCenterTextIcon, GlobeAltIcon, StarIcon } from '@heroicons/react/24/solid';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';
import SkeletonCard from '../components/SkeletonCard';
import SkeletonFeaturedCard from '../components/SkeletonFeaturedCard';
import SkeletonReviewCard from '../components/SkeletonReviewCard';
import { calculateDistance } from '../utils/geolocation';
import { settingsService } from '../services/settingsService';
import CafeOfTheWeekCard from '../components/CafeOfTheWeekCard';

type TopReview = Review & { cafeName: string; cafeSlug: string };
type CafeWithDistance = Cafe & { distance: number };


const SectionHeader: React.FC<{ icon?: React.ReactNode; title: string; subtitle?: string; link?: string; className?: string; center?: boolean }> = ({ icon, title, subtitle, link, className, center = true }) => (
  <div className={`mb-5 sm:mb-6 relative z-10 ${center ? 'text-center flex flex-col items-center' : ''} ${className}`}>
    <div className={`flex items-center gap-2 mb-1.5 ${center ? 'justify-center' : ''}`}>
      {icon && <div className="text-brand animate-pulse">{icon}</div>}
      <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta text-primary dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
    {center && <div className="h-1.5 w-20 bg-gradient-to-r from-brand to-accent-pink rounded-full mb-2 shadow-sm"></div>}
    {subtitle && <p className="text-muted text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
    {link && (
      <div className="mt-2">
        <Link 
          to={link} 
          className="inline-flex items-center gap-1 text-brand font-bold hover:underline text-xs sm:text-sm transition-all hover:translate-x-1"
        >
          Lihat Semua
          <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
        </Link>
      </div>
    )}
  </div>
);

const rotatingPlaceholders = [
  "Mau nongkrong di mana hari ini?",
  "Cari cafe buat nugas di Prabumulih...",
  "Spot foto OOTD estetik di Lahat...",
  "Kopi enak di Sumatera Selatan...",
  "Tempat nongkrong sore yang adem...",
  "Kafe dengan WiFi kencang di Pagar Alam?",
  "Tempat meeting santai di Lubuklinggau...",
  "Kafe industrial di Muara Enim...",
  "Cari yang ada outdoor areanya...",
  "Tempat ngopi murah meriah di Banyuasin...",
  "Kafe klasik dengan suasana vintage...",
  "Spot OOTD dengan lighting bagus...",
  "Tempat yang cocok buat kerja remote...",
  "Kafe tropical di Ogan Ilir...",
  "Cari tempat yang kids-friendly...",
  "Kopi susu gula aren terenak di mana?",
  "Tempat yang buka sampai malam...",
  "Rekomendasi kafe baru di Palembang...",
  "Kafe dengan parkir luas...",
  "Tempat yang gak terlalu ramai...",
];

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
    <div className="text-center py-10 bg-card dark:bg-card/50 rounded-3xl border border-border col-span-full shadow-sm h-full flex flex-col justify-center items-center relative z-10">
        <InboxIcon className="mx-auto h-12 w-12 text-muted/50" />
        <p className="mt-4 text-xl font-bold font-jakarta">{title}</p>
        <p className="text-muted mt-2 max-w-xs mx-auto">{message}</p>
    </div>
);

const HomePage: React.FC = () => {
  const cafeContext = useContext(CafeContext);
  const { cafes, loading, error, getAllReviews } = cafeContext!;
  const { currentUser } = useAuth();
  const { favoriteIds } = useFavorites();
  
  const [trendingCafes, setTrendingCafes] = useState<Cafe[]>([]);
  const [recommendedCafes, setRecommendedCafes] = useState<Cafe[]>([]);
  const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
  const [newcomerCafes, setNewcomerCafes] = useState<Cafe[]>([]);
  const [nearestCafes, setNearestCafes] = useState<CafeWithDistance[]>([]);
  const [recentReviews, setRecentReviews] = useState<TopReview[]>([]);
  const [cafeOfTheWeek, setCafeOfTheWeek] = useState<Cafe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Cafe[]>([]);
  const [isResultsVisible, setIsResultsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);
  
  // Visibility Settings
  const [showSectionRecs, setShowSectionRecs] = useState(true);
  const [showSectionCOTW, setShowSectionCOTW] = useState(true);

  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const slideIntervalRef = useRef<number | null>(null);
  const parallaxRef = useRef<HTMLImageElement>(null); // Ref for Parallax Image

  const defaultHeroBgUrl = "https://res.cloudinary.com/dovouihq8/image/upload/v1762917599/mg7uygdmahzogqrzlayx.png";

  useEffect(() => {
    const fetchSettings = async () => {
        const [url, showRecs, showCotw] = await Promise.all([
            settingsService.getSetting('hero_background_url'),
            settingsService.getSetting('show_recommendations_section'),
            settingsService.getSetting('show_cotw_section')
        ]);
        setHeroBgUrl(url || defaultHeroBgUrl);
        setShowSectionRecs(showRecs !== 'false');
        setShowSectionCOTW(showCotw !== 'false');
    };
    fetchSettings();
  }, []);
  
  // --- PARALLAX EFFECT LOGIC ---
  useEffect(() => {
    const handleScroll = () => {
      if (parallaxRef.current) {
        const scrollY = window.scrollY;
        parallaxRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setPlaceholderIndex(prevIndex => (prevIndex + 1) % rotatingPlaceholders.length);
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            setLocationError(null);
            setIsLocating(false);
        },
        (error) => {
            console.warn("Geolocation error:", error);
            setLocationError("Gagal mendapatkan lokasimu. Fitur kafe terdekat tidak akan aktif.");
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  useEffect(() => {
    const approvedCafes = cafes.filter(c => c.status === 'approved');

    if (approvedCafes.length > 0) {
      // Cafe of the week
      const fetchCafeOfTheWeek = async () => {
          const cafeId = await settingsService.getSetting('cafe_of_the_week_id');
          if (cafeId) {
              const foundCafe = approvedCafes.find(c => c.id === cafeId);
              setCafeOfTheWeek(foundCafe || null);
          }
      };
      fetchCafeOfTheWeek();

      // Trending
      const sortedByAesthetic = [...approvedCafes].sort((a, b) => b.avgAestheticScore - a.avgAestheticScore);
      setTrendingCafes(sortedByAesthetic.slice(0, 4));

      // Recent Reviews
      const allReviewsData = getAllReviews(); 
      const validReviews = allReviewsData.filter(r => approvedCafes.some(c => c.id === r.cafeId && c.status === 'approved'));
      setRecentReviews(validReviews.slice(0, 3));

      // --- Smart Recommendations ---
      const calculateSmartScore = (cafe: Cafe, user: User | null, allUserReviews: Review[], location: { lat: number; lng: number } | null): number => {
          let score = (cafe.avgAestheticScore + cafe.avgWorkScore) / 2;
          if (cafe.spots.length > 0) score += 1.5;
          if (cafe.reviews.filter(r => r.status === 'approved').length > 3) score += 1.0;
          if (cafe.amenities.length >= 5) score += 0.5;
          if (cafe.isSponsored) score += 10 - (cafe.sponsoredRank * 0.5);

          if (user && allUserReviews.length > 0) {
              const positiveReviews = allUserReviews.filter(r => (r.ratingAesthetic + r.ratingWork) >= 15);
              const preferenceProfile = {
                  vibes: new Map<string, number>(),
                  amenities: new Map<string, number>(),
              };

              positiveReviews.forEach(review => {
                  const reviewedCafe = cafes.find(c => c.id === review.cafe_id);
                  reviewedCafe?.vibes.forEach(vibe => preferenceProfile.vibes.set(vibe.id, (preferenceProfile.vibes.get(vibe.id) || 0) + 1));
                  reviewedCafe?.amenities.forEach(amenity => preferenceProfile.amenities.set(amenity.id, (preferenceProfile.amenities.get(amenity.id) || 0) + 1));
              });

              cafe.vibes.forEach(vibe => { if (preferenceProfile.vibes.has(vibe.id)) score += 2.0; });
              cafe.amenities.forEach(amenity => { if (preferenceProfile.amenities.has(amenity.id)) score += 1.5; });
          }
          else if (!user && location) {
              const distance = calculateDistance(location.lat, location.lng, cafe.coords.lat, cafe.coords.lng);
              const distanceBonus = 5 / (distance + 1);
              score += distanceBonus;
          }
          
          return score;
      };

      const allUserReviews = currentUser ? approvedCafes.flatMap(c => c.reviews.filter(r => r.author === currentUser.username)) : [];

      const recommended = approvedCafes
        .map(cafe => ({ cafe, score: calculateSmartScore(cafe, currentUser, allUserReviews, userLocation) }))
        .sort((a, b) => b.score - a.score)
        .filter(item => item.score > 0)
        .map(item => item.cafe);
      
      setRecommendedCafes(recommended.slice(0, 5));


      // Newcomers
      const sortedByNew = [...approvedCafes].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setNewcomerCafes(sortedByNew.slice(0, 4));

      // Nearest Cafes
      if (userLocation) {
          const cafesWithDistance = approvedCafes.map(cafe => ({
              ...cafe,
              distance: calculateDistance(userLocation.lat, userLocation.lng, cafe.coords.lat, cafe.coords.lng)
          })).sort((a, b) => a.distance - b.distance);
          setNearestCafes(cafesWithDistance.slice(0, 4));
      }
      
      // Favorites
      const userFavorites = approvedCafes.filter(cafe => favoriteIds.includes(cafe.id));
      setFavoriteCafes(userFavorites);
    } else {
        setTrendingCafes([]);
        setRecommendedCafes([]);
        setNewcomerCafes([]);
        setNearestCafes([]);
        setFavoriteCafes([]);
        setRecentReviews([]);
        setCafeOfTheWeek(null);
    }
  }, [cafes, favoriteIds, userLocation, currentUser, getAllReviews]);
  
  const resetInterval = useCallback(() => {
    if (slideIntervalRef.current) clearInterval(slideIntervalRef.current);
    slideIntervalRef.current = window.setInterval(() => {
      setCurrentSlide(prev => (prev === recommendedCafes.length - 1 ? 0 : prev + 1));
    }, 5000);
  }, [recommendedCafes.length]);

  useEffect(() => {
    if (recommendedCafes.length > 1) resetInterval();
    return () => { if (slideIntervalRef.current) clearInterval(slideIntervalRef.current); };
  }, [recommendedCafes.length, resetInterval]);

  const nextSlide = () => { setCurrentSlide(prev => (prev === recommendedCafes.length - 1 ? 0 : prev + 1)); resetInterval(); };
  const prevSlide = () => { setCurrentSlide(prev => (prev === 0 ? recommendedCafes.length - 1 : prev - 1)); resetInterval(); };

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const approvedCafes = cafes.filter(c => c.status === 'approved');
      const term = searchQuery.trim().toLowerCase();
      
      const filtered = approvedCafes.filter(cafe => 
          cafe.name.toLowerCase().includes(term) ||
          cafe.description?.toLowerCase().includes(term) ||
          cafe.city?.toLowerCase().includes(term) ||
          cafe.district?.toLowerCase().includes(term) ||
          cafe.vibes.some(v => v.name.toLowerCase().includes(term)) ||
          cafe.amenities.some(a => a.name.toLowerCase().includes(term)) ||
          cafe.tags.some(t => t.name.toLowerCase().includes(term))
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
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) setIsResultsVisible(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchContainerRef]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/explore?search=${encodeURIComponent(searchQuery.trim())}`);
  };
  
  if (error) return <DatabaseConnectionError />;

  const hasFeaturedSection = showSectionRecs || showSectionCOTW;
  
  // DYNAMIC GRID CONFIGURATION
  let gridClass = '';
  let containerMaxWidth = 'max-w-6xl';
  let activeDecoration = null;

  if (showSectionRecs && showSectionCOTW) {
      // Both Active: Equal split, distinct separation
      gridClass = 'lg:grid-cols-2 gap-8 lg:gap-12';
      activeDecoration = (
          <>
             {/* Dual Glow */}
             <div className="absolute left-0 top-10 w-1/2 h-64 bg-brand/5 rounded-full blur-3xl pointer-events-none"></div>
             <div className="absolute right-0 bottom-10 w-1/2 h-64 bg-accent-amber/5 rounded-full blur-3xl pointer-events-none"></div>
          </>
      );
  } else if (showSectionRecs) {
      // Only Recommendations: Wider but centered
      gridClass = 'lg:grid-cols-1';
      containerMaxWidth = 'max-w-4xl'; // Optimal for slider
      activeDecoration = (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-3xl bg-brand/5 rounded-full blur-3xl pointer-events-none"></div>
      );
  } else if (showSectionCOTW) {
      // Only COTW: Narrow, focused
      gridClass = 'lg:grid-cols-1';
      containerMaxWidth = 'max-w-lg'; // Don't stretch the card too much
      activeDecoration = (
          <>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent-amber/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute top-4 right-[20%] text-accent-amber/10 pointer-events-none transform rotate-12">
                <TrophyIcon className="w-48 h-48" />
            </div>
          </>
      );
  }

  return (
    <div className="relative bg-soft dark:bg-gray-900/50">
      {/* Hero Section */}
      <div className="relative bg-gray-900 overflow-hidden -mt-32 w-full h-[600px] sm:h-[650px] lg:h-[550px]">
        {/* DECORATION: Floating Particles in Hero */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[15%] left-[10%] w-2 h-2 bg-white rounded-full animate-pulse opacity-60 blur-[1px]"></div>
            <div className="absolute top-[25%] right-[20%] w-1.5 h-1.5 bg-accent-pink rounded-full animate-pulse delay-300 opacity-70 blur-[1px]"></div>
            <div className="absolute bottom-[40%] left-[30%] w-3 h-3 bg-brand-light rounded-full animate-pulse delay-700 opacity-50 blur-[2px]"></div>
            <div className="absolute top-[10%] right-[10%] w-32 h-32 bg-brand/20 rounded-full blur-3xl opacity-40"></div>
            <div className="absolute bottom-[20%] left-[5%] w-48 h-48 bg-accent-pink/10 rounded-full blur-3xl opacity-30"></div>
        </div>

        <div className="absolute inset-0 z-0">
           {heroBgUrl ? (
                <img 
                    ref={parallaxRef} // Apply Ref here
                    src={optimizeCloudinaryImage(heroBgUrl, 1920, 1080)}
                    alt="Suasana cafe yang nyaman"
                    className="w-full h-[120%] object-cover object-center will-change-transform"
                    style={{ transformOrigin: 'center top' }}
                    decoding="async"
                />
           ) : (
                <div className="w-full h-full bg-gray-800"></div>
           )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-gray-900"></div>
        </div>
        
        {/* Content Overlay */}
        <div className="relative z-10 container mx-auto px-4 sm:px-6 h-full flex flex-col justify-center items-center text-center pt-48 lg:pt-28 pb-16 lg:pb-0">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold font-jakarta text-white leading-tight sm:leading-snug drop-shadow-2xl">
            Temukan Spot Nongkrong<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-accent-pink to-brand-light">Estetikmu</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-200 max-w-2xl mx-auto px-4 drop-shadow-md font-medium">Jelajahi cafe-cafe paling hits dan instagramable di Sumatera Selatan.</p>
          
          <div className="mt-6 sm:mt-8 max-w-xl w-full mx-auto space-y-4 px-2">
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative group">
                <SparklesIcon className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-yellow-300 pointer-events-none group-hover:animate-pulse" />
                <input 
                    type="text" 
                    placeholder={rotatingPlaceholders[placeholderIndex]} 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onFocus={() => searchQuery.trim().length > 1 && setIsResultsVisible(true)} 
                    className="w-full py-3 sm:py-4 pl-12 sm:pl-14 pr-24 sm:pr-32 text-base sm:text-lg rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-xl focus:ring-4 focus:ring-brand/30 focus:border-brand focus:bg-white/20 transition-all duration-300 shadow-2xl text-white placeholder-gray-300" 
                />
                <button type="submit" className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-brand text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-full font-bold hover:bg-brand/90 transition-all duration-300 text-sm sm:text-base shadow-lg hover:shadow-brand/50">Cari</button>
              </form>
              {isResultsVisible && (
                <div className="absolute top-full mt-4 w-full bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 z-50 max-h-80 overflow-y-auto text-left custom-scrollbar animate-fade-in-up">
                  {searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map(cafe => (<li key={cafe.id} className="border-b border-border/50 last:border-b-0"><Link to={`/cafe/${cafe.slug}`} className="block px-6 py-4 hover:bg-brand/10 transition-colors duration-200 group"><p className="font-bold text-primary dark:text-white group-hover:text-brand transition-colors">{cafe.name}</p><p className="text-sm text-muted flex items-center gap-1"><MapPinIcon className="h-3 w-3"/> {cafe.city}</p></Link></li>))}
                    </ul>
                  ) : (<div className="px-6 py-8 text-center text-muted"><p>Cafe tidak ditemukan.</p></div>)}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4 px-2 w-full max-w-3xl pb-4">
            {VIBES.slice(0, 4).map(vibe => (
                <Link 
                    to={`/explore?vibe=${vibe.id}`} 
                    key={vibe.id} 
                    className="bg-black/60 sm:bg-black/40 border border-white/10 sm:backdrop-blur-md px-5 py-2.5 sm:px-6 sm:py-2 rounded-full text-white hover:bg-white hover:text-brand transition-all duration-300 font-bold text-xs sm:text-sm shadow-lg hover:scale-105 tracking-wide"
                >
                    {vibe.name}
                </Link>
            ))}
          </div>
        </div>

        {/* DECORATION: Stylish Wave Divider at Bottom of Hero */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
            <svg className="relative block w-full h-[40px] sm:h-[60px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-gray-900 dark:fill-gray-900 opacity-50"></path>
                <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" className="fill-gray-900 dark:fill-gray-900"></path>
            </svg>
        </div>
      </div>

      {/* Featured & COTW Split Section - Conditionally Rendered */}
      {hasFeaturedSection && (
        <div className="py-6 sm:py-8 relative -mt-10 sm:-mt-16 z-30">
            {/* Contextual Decorations */}
            {activeDecoration}

            <div className={`container mx-auto px-4 sm:px-6 ${containerMaxWidth} relative`}>
                <div className={`grid grid-cols-1 ${gridClass} items-stretch transition-all duration-500`}>
                    
                    {/* Left Column: Recommended Slider */}
                    {showSectionRecs && (
                        <div className="w-full flex flex-col min-w-0">
                            <div className="flex-grow relative rounded-3xl h-full min-h-[450px]">
                                {loading ? (<SkeletonFeaturedCard />) : recommendedCafes.length > 0 ? (
                                    <div className="relative h-full shadow-2xl rounded-3xl border border-white/20 dark:border-white/10">
                                        <div className="overflow-hidden h-full rounded-3xl bg-card/80 backdrop-blur-sm">
                                            <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                                {recommendedCafes.map(cafe => (
                                                    <div key={cafe.id} className="w-full flex-shrink-0 px-0 h-full">
                                                        <FeaturedCafeCard cafe={cafe} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {recommendedCafes.length > 1 && (
                                            <>
                                                <button onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-4 p-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-brand hover:border-brand transition-all shadow-lg z-20 group">
                                                    <ChevronLeftIcon className="h-6 w-6 group-hover:-translate-x-0.5 transition-transform" />
                                                </button>
                                                <button onClick={nextSlide} className="absolute top-1/2 -translate-y-1/2 right-4 p-3 bg-black/30 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-brand hover:border-brand transition-all shadow-lg z-20 group">
                                                    <ChevronRightIcon className="h-6 w-6 group-hover:translate-x-0.5 transition-transform" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyState title="Belum Ada Rekomendasi" message="Data rekomendasi belum tersedia." />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Right Column: Cafe of The Week */}
                    {showSectionCOTW && (
                        <div className="w-full flex flex-col min-w-0">
                            <div className="flex-grow h-full min-h-[450px] relative">
                                {!loading && cafeOfTheWeek ? (
                                    <CafeOfTheWeekCard cafe={cafeOfTheWeek} />
                                ) : loading ? (
                                    <SkeletonFeaturedCard />
                                ) : (
                                    <EmptyState title="Coming Soon" message="Cafe of The Week belum dipilih minggu ini." />
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
      )}

      {/* Center Content Header & Sections - Render conditionally based on featured presence */}
      {hasFeaturedSection && (
          <div className="text-center my-8 sm:my-10 px-4 max-w-3xl mx-auto relative z-10">
             <h2 className="text-3xl sm:text-4xl font-bold font-jakarta">Eksplorasi Lebih Jauh</h2>
             <div className="h-1.5 w-20 bg-brand rounded-full mx-auto my-3"></div>
             <p className="text-muted text-base sm:text-lg">Temukan lebih banyak tempat seru di sekitarmu berdasarkan lokasi dan preferensi komunitas.</p>
          </div>
      )}
      
      {/* Compact spacer if no featured section */}
      <div className={!hasFeaturedSection ? "mt-8" : ""}></div>

      {!isLocating && userLocation && nearestCafes.length > 0 && (
        <div className="py-6 sm:py-8 bg-gradient-to-b from-transparent to-gray-50 dark:to-white/5 relative overflow-hidden">
            {/* DECORATION: Map Watermark */}
            <div className="absolute -left-10 top-10 text-gray-100 dark:text-gray-800 opacity-60 transform rotate-12 pointer-events-none">
                <GlobeAltIcon className="w-64 h-64" />
            </div>
            
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
                <SectionHeader center icon={<MapPinIcon className="h-6 w-6 sm:h-8 sm:w-8" />} title="Terdekat Denganmu" subtitle="Kafe-kafe paling dekat dari lokasimu saat ini." />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">
                    {nearestCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} distance={cafe.distance} animationDelay={`${i * 75}ms`} />))}
                </div>
            </div>
        </div>
      )}

      <div className="py-6 sm:py-8 bg-brand/5 dark:bg-brand/10 relative overflow-hidden">
        {/* DECORATION: Sparkles & Dots */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>
        <div className="absolute bottom-10 left-10 text-brand/10 pointer-events-none animate-pulse">
            <SparklesIcon className="w-32 h-32" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
          <SectionHeader center icon={<RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8" />} title="Pendatang Baru" subtitle="Kafe-kafe paling fresh yang baru aja gabung." />
            {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : newcomerCafes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">
                    {newcomerCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}
                </div>
            ) : ( <EmptyState title="Belum Ada Cafe Baru" message="Saat ini belum ada data cafe baru. Cek lagi nanti ya!" />)}
        </div>
      </div>

      {favoriteIds.length > 0 && !loading && (
        <div className="py-6 sm:py-8 relative overflow-hidden">
          {/* DECORATION: Subtle Heart Pattern */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-accent-pink/5 pointer-events-none">
              <HeartIcon className="w-64 h-64 transform rotate-12" />
          </div>

          <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <SectionHeader center icon={<HeartIcon className="h-6 w-6 sm:h-8 sm:w-8"/>} title="Kafe Favoritmu" subtitle="Tempat-tempat spesial yang sudah kamu tandai." link="/explore?favorites=true" />
            {favoriteCafes.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">{favoriteCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}</div>) : (<div className="text-center py-10 text-muted"><p>Kafe favoritmu akan muncul di sini setelah kamu menambahkannya.</p></div>)}
          </div>
        </div>
      )}

      <div className="py-6 sm:py-8 bg-gradient-to-b from-transparent to-yellow-50 dark:to-yellow-900/5 relative overflow-hidden">
        {/* DECORATION: Warm Glow Blobs */}
        <div className="absolute left-1/4 top-10 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/4 bottom-10 w-64 h-64 bg-orange-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
          <SectionHeader center icon={<FireIcon className="h-6 w-6 sm:h-8 sm:w-8"/>} title="Lagi Trending Nih!" subtitle="Cafe dengan skor aesthetic tertinggi." link="/explore?sort=trending" />
            {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : trendingCafes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">{trendingCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}
                </div>
            ) : (<EmptyState title="Belum Ada Cafe" message="Saat ini belum ada data cafe yang bisa ditampilkan. Cek lagi nanti ya!" />)}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="py-6 sm:py-8 border-t border-border/50 bg-gradient-to-b from-soft to-transparent relative overflow-hidden">
        {/* DECORATION: Giant Quote Mark */}
        <div className="absolute top-0 left-4 font-serif text-9xl text-brand/5 pointer-events-none leading-none select-none">“</div>
        <div className="absolute bottom-0 right-4 font-serif text-9xl text-brand/5 pointer-events-none leading-none select-none transform rotate-180">“</div>

        <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
            <SectionHeader center icon={<ChatBubbleBottomCenterTextIcon className="h-6 w-6 sm:h-8 sm:w-8"/>} title="Kata Mereka" subtitle="Apa kata para Nongkrongers tentang tempat favorit mereka?" />
             {loading ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <SkeletonReviewCard key={i} />)}</div>
             ) : recentReviews.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {recentReviews.map((review, i) => (
                         <ReviewCard key={review.id} review={review} animationDelay={`${i * 75}ms`} />
                     ))}
                 </div>
             ) : (
                 <EmptyState title="Belum Ada Review" message="Jadilah yang pertama memberikan ulasan!" />
             )}
        </div>
      </div>

      {/* Floating Explore Button */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center z-50 xl:hidden pointer-events-none">
        <Link 
          to="/explore" 
          className="pointer-events-auto flex items-center gap-2.5 px-6 py-3.5 bg-gray-900/80 dark:bg-white/80 backdrop-blur-xl border border-white/10 dark:border-black/5 text-white dark:text-gray-900 rounded-full shadow-2xl shadow-brand/25 hover:scale-105 active:scale-95 transition-all duration-300 group animate-fade-in-up ring-1 ring-white/20 dark:ring-black/10"
        >
          <GlobeAltIcon className="h-5 w-5 text-brand group-hover:animate-spin" />
          <span className="font-bold text-sm tracking-wide">Mulai Jelajah</span>
        </Link>
      </div>

    </div>
  );
};

export default HomePage;
