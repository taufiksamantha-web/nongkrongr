
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
import { FireIcon, HeartIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, InboxIcon, ArrowRightIcon, MapPinIcon, RocketLaunchIcon, TrophyIcon, ChatBubbleBottomCenterTextIcon, GlobeAltIcon } from '@heroicons/react/24/solid';
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
  <div className={`mb-8 ${center ? 'text-center flex flex-col items-center' : ''} ${className}`}>
    <div className={`flex items-center gap-2 mb-2 ${center ? 'justify-center' : ''}`}>
      {icon && <div className="text-brand animate-pulse">{icon}</div>}
      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-jakarta text-primary dark:text-white tracking-tight">
        {title}
      </h2>
    </div>
    {center && <div className="h-1.5 w-24 bg-gradient-to-r from-brand to-accent-pink rounded-full mb-3 shadow-sm"></div>}
    {subtitle && <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
    {link && (
      <div className="mt-3">
        <Link 
          to={link} 
          className="inline-flex items-center gap-1 text-brand font-bold hover:underline text-sm transition-all hover:translate-x-1"
        >
          Lihat Semua
          <ArrowRightIcon className="h-4 w-4" />
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
    <div className="text-center py-10 bg-card dark:bg-card/50 rounded-3xl border border-border col-span-full shadow-sm h-full flex flex-col justify-center items-center">
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
  
  // PERFORMANCE FIX: Removed scrollY state and listener

  // Visibility Settings
  const [showSectionRecs, setShowSectionRecs] = useState(true);
  const [showSectionCOTW, setShowSectionCOTW] = useState(true);

  const navigate = useNavigate();
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const slideIntervalRef = useRef<number | null>(null);

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
  
  // PERFORMANCE FIX: Removed scroll event listener

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

  // Logic to determine layout
  const hasFeaturedSection = showSectionRecs || showSectionCOTW;
  
  // Grid layout logic:
  // Both active: 2 columns (lg:grid-cols-2)
  // One active: Full width for the active one, max-width restricted for aesthetics
  const gridClass = (showSectionRecs && showSectionCOTW) 
      ? 'lg:grid-cols-2' 
      : 'lg:grid-cols-1 max-w-5xl mx-auto';

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="relative bg-gray-900 overflow-hidden -mt-32">
        <div className="absolute inset-0 z-0">
           {heroBgUrl ? (
                <img 
                    src={optimizeCloudinaryImage(heroBgUrl, 1280, 720)}
                    alt="Suasana cafe yang nyaman"
                    // PERFORMANCE: Disable animation on mobile, use will-change
                    className="w-full h-full object-cover md:animate-ken-burns will-change-transform"
                    decoding="async"
                />
           ) : (
                <div className="w-full h-full bg-gray-800"></div>
           )}
            <div className="absolute inset-0 bg-black/60"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 sm:px-6 pt-40 sm:pt-48 pb-16 sm:pb-20 text-center max-w-6xl">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold font-jakarta text-white leading-tight sm:leading-snug drop-shadow-lg">
            Temukan Spot Nongkrong<br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 via-accent-pink to-brand-light">Estetikmu</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-200 max-w-2xl mx-auto px-4">Jelajahi cafe-cafe paling hits dan instagramable di Sumatera Selatan. Dari tempat nugas super cozy sampai spot foto OOTD terbaik.</p>
          <div className="mt-8 max-w-xl mx-auto space-y-4 px-2">
            <div ref={searchContainerRef} className="relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <SparklesIcon className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-yellow-300 pointer-events-none" />
                <input type="text" placeholder={rotatingPlaceholders[placeholderIndex]} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => searchQuery.trim().length > 1 && setIsResultsVisible(true)} className="w-full py-3 sm:py-4 pl-12 sm:pl-14 pr-24 sm:pr-32 text-base sm:text-lg rounded-2xl border-2 border-white/30 bg-white/10 backdrop-blur-sm focus:ring-4 focus:ring-brand/20 focus:border-brand transition-all duration-300 shadow-sm text-white placeholder-gray-300" />
                <button type="submit" className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-brand text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl font-bold hover:bg-brand/90 transition-all duration-300 text-sm sm:text-base">Cari</button>
              </form>
              {isResultsVisible && (
                <div className="absolute top-full mt-2 w-full bg-card rounded-2xl shadow-lg border border-subtle z-10 max-h-80 overflow-y-auto text-left">
                  {searchResults.length > 0 ? (
                    <ul>
                      {searchResults.map(cafe => (<li key={cafe.id} className="border-b border-subtle last:border-b-0"><Link to={`/cafe/${cafe.slug}`} className="block px-6 py-4 hover:bg-brand/10 dark:hover:bg-brand/20 transition-colors duration-200" onClick={() => setIsResultsVisible(false)}><p className="font-bold text-primary dark:text-white">{cafe.name}</p><p className="text-sm text-muted">{cafe.city}</p></Link></li>))}
                    </ul>
                  ) : (<p className="px-6 py-4 text-muted">Cafe tidak ditemukan.</p>)}
                </div>
              )}
            </div>
          </div>
          <div className="mt-10 sm:mt-16 flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
            {VIBES.slice(0, 4).map(vibe => (<Link to={`/explore?vibe=${vibe.id}`} key={vibe.id} className="bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-white hover:bg-white/20 transition-all duration-300 font-semibold text-sm sm:text-base">{vibe.name}</Link>))}
          </div>
        </div>
      </div>

      {/* Featured & COTW Split Section - Conditionally Rendered */}
      {hasFeaturedSection && (
        <div className="py-10 overflow-hidden transition-all duration-500 bg-gradient-to-b from-brand/5 to-transparent">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                <div className={`grid grid-cols-1 ${gridClass} gap-8 items-stretch`}>
                    
                    {/* Left Column: Recommended Slider */}
                    {showSectionRecs && (
                        <div className="w-full h-full flex flex-col min-w-0">
                            <SectionHeader 
                                icon={<SparklesIcon className="h-6 w-6"/>} 
                                title="Rekomendasi Spesial" 
                                subtitle="Pilihan cerdas berdasarkan popularitas dan rating."
                                center
                            />
                            
                            <div className="flex-grow relative rounded-3xl h-full min-h-[450px]">
                                {loading ? (<SkeletonFeaturedCard />) : recommendedCafes.length > 0 ? (
                                    <div className="relative h-full">
                                        <div className="overflow-hidden h-full rounded-3xl">
                                            <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                                {recommendedCafes.map(cafe => (
                                                    <div key={cafe.id} className="w-full flex-shrink-0 px-1 h-full">
                                                        <FeaturedCafeCard cafe={cafe} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        {recommendedCafes.length > 1 && (
                                            <>
                                                <button onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-2 sm:-left-4 p-2 bg-card/80 backdrop-blur-sm rounded-full text-primary hover:bg-card transition-all shadow-md z-20">
                                                    <ChevronLeftIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={nextSlide} className="absolute top-1/2 -translate-y-1/2 right-2 sm:-right-4 p-2 bg-card/80 backdrop-blur-sm rounded-full text-primary hover:bg-card transition-all shadow-md z-20">
                                                    <ChevronRightIcon className="h-5 w-5" />
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
                        <div className="w-full h-full flex flex-col min-w-0">
                            <SectionHeader 
                                icon={<TrophyIcon className="h-6 w-6 text-accent-amber"/>} 
                                title="Cafe of The Week" 
                                subtitle="Sorotan minggu ini. Wajib dikunjungi!"
                                center
                            />
                            
                            <div className="flex-grow h-full min-h-[450px]">
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
          <div className="text-center my-10 px-4 max-w-3xl mx-auto">
             <h2 className="text-3xl sm:text-4xl font-bold font-jakarta">Eksplorasi Lebih Jauh</h2>
             <div className="h-1 w-20 bg-brand rounded-full mx-auto my-4"></div>
             <p className="text-muted text-lg">Temukan lebih banyak tempat seru di sekitarmu berdasarkan lokasi dan preferensi komunitas.</p>
          </div>
      )}
      
      {/* If header is hidden, add top margin to first list to separate from hero */}
      <div className={!hasFeaturedSection ? "mt-12" : ""}></div>

      {!isLocating && userLocation && nearestCafes.length > 0 && (
        <div className="py-10 bg-gradient-to-b from-transparent to-gray-50 dark:to-white/5">
            <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                <SectionHeader center icon={<MapPinIcon className="h-6 w-6 sm:h-8 sm:w-8" />} title="Terdekat Denganmu" subtitle="Kafe-kafe paling dekat dari lokasimu saat ini." />
                {/* PERFORMANCE: Added 'content-visibility-auto' class for list optimization */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">
                    {nearestCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} distance={cafe.distance} animationDelay={`${i * 75}ms`} />))}
                </div>
            </div>
        </div>
      )}

      <div className="py-10 bg-brand/5 dark:bg-brand/10">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <SectionHeader center icon={<RocketLaunchIcon className="h-6 w-6 sm:h-8 sm:w-8" />} title="Pendatang Baru" subtitle="Kafe-kafe paling fresh yang baru aja gabung." />
            {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : newcomerCafes.length > 0 ? (
                // PERFORMANCE: Added 'content-visibility-auto' class
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">
                    {newcomerCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}
                </div>
            ) : ( <EmptyState title="Belum Ada Cafe Baru" message="Saat ini belum ada data cafe baru. Cek lagi nanti ya!" />)}
        </div>
      </div>

      {favoriteIds.length > 0 && !loading && (
        <div className="py-10">
          <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
            <SectionHeader center icon={<HeartIcon className="h-6 w-6 sm:h-8 sm:w-8"/>} title="Kafe Favoritmu" subtitle="Tempat-tempat spesial yang sudah kamu tandai." link="/explore?favorites=true" />
            {favoriteCafes.length > 0 ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">{favoriteCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}</div>) : (<div className="text-center py-10 text-muted"><p>Kafe favoritmu akan muncul di sini setelah kamu menambahkannya.</p></div>)}
          </div>
        </div>
      )}

      <div className="py-10 bg-gradient-to-b from-transparent to-yellow-50 dark:to-yellow-900/5">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <SectionHeader center icon={<FireIcon className="h-6 w-6 sm:h-8 sm:w-8"/>} title="Lagi Trending Nih!" subtitle="Cafe dengan skor aesthetic tertinggi." link="/explore?sort=trending" />
            {loading ? (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
            ) : trendingCafes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 content-visibility-auto">{trendingCafes.map((cafe, i) => (<CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />))}
                </div>
            ) : (<EmptyState title="Belum Ada Cafe" message="Saat ini belum ada data cafe yang bisa ditampilkan. Cek lagi nanti ya!" />)}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="py-10 border-t border-border/50 bg-gradient-to-b from-soft to-transparent">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
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
