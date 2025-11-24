
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { ThemeContext } from '../App';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';
import { StarIcon, BriefcaseIcon, UsersIcon, MapPinIcon, ClockIcon, ArrowLeftIcon, HeartIcon, XMarkIcon, BuildingStorefrontIcon, ExclamationTriangleIcon, CalendarDaysIcon, TagIcon, CurrencyDollarIcon, ChevronDownIcon, PhoneIcon, GlobeAltIcon, SparklesIcon, WifiIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import ReviewForm from '../components/ReviewForm';
import FloatingNotification from '../components/common/FloatingNotification';
import ImageWithFallback from '../components/common/ImageWithFallback';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import InteractiveMap from '../components/InteractiveMap';
import ShareButton from '../components/ShareButton';
import EventCard from '../components/EventCard';
import ReviewCard from '../components/ReviewCard';
import TagManager from '../components/TagManager';
import { DEFAULT_COVER_URL } from '../constants';
import { getOpeningStatus } from '../utils/timeUtils';

const INITIAL_REVIEWS_COUNT = 20;

const ScoreDisplay: React.FC<{ label: string, score: number, max: number, color: string }> = ({ label, score, max, color }) => {
    const percentage = max > 0 ? (score / max) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center text-center group w-full">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-all duration-300 ease-in-out transform group-hover:scale-105">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" className="stroke-current text-gray-200 dark:text-gray-700" strokeWidth="10" fill="transparent" />
                    <circle
                        cx="50" cy="50" r="45"
                        className="stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                        style={{ strokeDasharray: circumference, strokeDashoffset, color: color, transition: 'stroke-dashoffset 0.5s ease-out' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg sm:text-xl md:text-2xl font-bold font-jakarta transition-all duration-300" style={{ color }}>{score > 0 ? score.toFixed(1) : 'N/A'}</span>
                    <span className="text-[8px] sm:text-[10px] md:text-xs text-muted">/ {max}</span>
                </div>
            </div>
            <p className="mt-2 text-xs sm:text-sm font-semibold transition-all duration-300">{label}</p>
        </div>
    );
};

const DetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const cafeContext = useContext(CafeContext);
    const { cafes, loading, addReview, error } = cafeContext!;
    const { theme } = useContext(ThemeContext);
    const { currentUser } = useAuth();
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    
    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [visibleReviewsCount, setVisibleReviewsCount] = useState(INITIAL_REVIEWS_COUNT);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [openingStatus, setOpeningStatus] = useState<any>(null);
    const [isAnimatingFavorite, setIsAnimatingFavorite] = useState(false);

    useEffect(() => {
        if (slug && cafes.length > 0) {
            const currentCafe = cafes.find(c => c.slug === slug);
            setCafe(currentCafe || null);
            if (currentCafe?.openingHours) {
                setOpeningStatus(getOpeningStatus(currentCafe.openingHours));
            }
        }
    }, [slug, cafes]);

    // Update status periodically (every minute)
    useEffect(() => {
        if (!cafe?.openingHours) return;
        const interval = setInterval(() => {
            setOpeningStatus(getOpeningStatus(cafe.openingHours));
        }, 60000);
        return () => clearInterval(interval);
    }, [cafe?.openingHours]);

    const openImageModal = (imageUrl: string) => {
        setSelectedImage(imageUrl);
        setIsModalOpen(true);
        document.body.style.overflow = 'hidden';
    };

    const closeImageModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
        document.body.style.overflow = 'unset';
    };

    const handleAddReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => {
        setIsSubmitting(true);
        const { error } = await addReview(review);
        if (error) {
            console.error("Failed to add review:", error);
            setNotification({message: `Gagal mengirim review: ${error.message}`, type: 'error'});
        } else {
            setNotification({message: "Review kamu telah dikirim dan sedang menunggu moderasi. Terima kasih!", type: 'success'});
        }
        setIsSubmitting(false);
    };
    
    const handleLoadMoreReviews = () => {
        setVisibleReviewsCount(prev => prev + INITIAL_REVIEWS_COUNT);
    };

    const getPriceColor = (tier: number) => {
        switch (tier) {
            case 1: return 'text-green-500'; // Murah
            case 2: return 'text-blue-500';   // Standar
            case 3: return 'text-amber-500'; // Premium
            case 4: return 'text-red-600';     // Mewah
            default: return 'text-brand';
        }
    };

    if (error) return <DatabaseConnectionError />;
    if (loading && !cafe) return <div className="text-center py-20">Loading...</div>;
    if (!cafe) return <div className="text-center py-20">Cafe tidak ditemukan.</div>;
    
    const canViewPendingOrRejected = currentUser && (currentUser.role === 'admin' || currentUser.id === cafe.manager_id);

    if (cafe.status !== 'approved' && !canViewPendingOrRejected) {
        return (
            <div className="container mx-auto px-6 py-20 text-center">
                <div className="bg-yellow-50 dark:bg-yellow-500/10 p-8 rounded-2xl max-w-2xl mx-auto">
                    <ExclamationTriangleIcon className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                    <h2 className="text-2xl font-bold font-jakarta text-yellow-800 dark:text-yellow-200">
                        Kafe Belum Tersedia
                    </h2>
                    <p className="mt-2 text-yellow-700 dark:text-yellow-300">
                        Kafe ini sedang dalam proses peninjauan oleh administrator dan belum dapat ditampilkan untuk publik.
                    </p>
                </div>
            </div>
        );
    }

    const favorited = isFavorite(cafe.id);

    const handleFavoriteClick = () => {
        setIsAnimatingFavorite(true);
        if (favorited) {
            removeFavorite(cafe.id);
        } else {
            addFavorite(cafe.id);
        }
        setTimeout(() => setIsAnimatingFavorite(false), 500);
    };

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cafe.coords.lat},${cafe.coords.lng}`;
    const approvedReviews = cafe.reviews?.filter(r => r.status === 'approved').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || [];
    const visibleReviews = approvedReviews.slice(0, visibleReviewsCount);
    const cafeEvents = cafe.events?.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || [];

    // Reusable Buttons for cleaner render logic (Mobile vs Desktop)
    const ActionButtons = ({ isMobile }: { isMobile: boolean }) => {
        // Mobile: Solid gray-900, no blur, no border for cleaner look
        // Desktop: Standard aesthetic
        const shareClass = isMobile 
            ? "p-2 sm:p-3 rounded-full bg-gray-900 text-white hover:bg-black transition-all shadow-sm active:scale-90"
            : "p-2 rounded-xl bg-soft dark:bg-gray-700/30 text-muted hover:text-brand hover:bg-brand/5 border border-border transition-all shadow-sm active:scale-95";
            
        const favClass = isMobile
            ? `p-2 sm:p-3 rounded-full transition-all duration-300 shadow-sm active:scale-75 bg-gray-900 text-white hover:bg-black ${favorited ? 'text-accent-pink' : ''} ${isAnimatingFavorite ? 'animate-subtle-bounce' : ''}`
            : `p-2 rounded-xl transition-all duration-300 shadow-sm active:scale-90 border border-border ${favorited ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/20' : 'bg-soft dark:bg-gray-700/30 text-muted hover:text-accent-pink hover:bg-accent-pink/5'} ${isAnimatingFavorite ? 'animate-subtle-bounce' : ''}`;

        return (
            <div className={`flex gap-2 sm:gap-3 ${isMobile ? 'absolute top-4 right-4 z-10 md:hidden' : 'hidden md:flex items-center gap-2'}`}>
                <ShareButton 
                    cafeName={cafe.name} 
                    cafeDescription={cafe.description} 
                    className={shareClass}
                />
                <button
                    onClick={handleFavoriteClick}
                    className={favClass}
                    aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                    title={favorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                >
                    {favorited ? <HeartIcon className={`w-5 h-5 ${!isMobile ? 'sm:w-5 sm:h-5' : 'sm:w-6 sm:h-6'}`}/> : <HeartIconOutline className={`w-5 h-5 ${!isMobile ? 'sm:w-5 sm:h-5' : 'sm:w-6 sm:h-6'}`} />}
                </button>
            </div>
        );
    };

    return (
        <div className="container mx-auto px-4 sm:px-6 py-6 transition-all duration-300 ease-in-out w-full max-w-6xl">
            <button
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center gap-2 text-muted hover:text-brand dark:hover:text-brand-light font-semibold transition-colors duration-300 group text-sm sm:text-base"
                aria-label="Kembali ke halaman sebelumnya"
            >
                <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 transform group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            
            {/* Cover Image with responsive height */}
            <div className="relative group w-full">
                <ImageWithFallback 
                    src={cafe.coverUrl} 
                    defaultSrc={DEFAULT_COVER_URL}
                    alt={cafe.name} 
                    className="w-full h-48 sm:h-64 md:h-80 lg:h-96 object-cover rounded-3xl mb-6 border border-border shadow-sm transition-all duration-500 ease-in-out"
                    width={1280}
                    height={768}
                />
                {/* Mobile Action Buttons - Hidden on Desktop */}
                <ActionButtons isMobile={true} />
            </div>

            {/* Main Layout - Fluid Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                <div className="lg:col-span-2 space-y-6 md:space-y-8 min-w-0">
                    {/* Header Cafe Improved - Compact & Fluid */}
                    <div className="bg-card border border-border p-4 sm:p-5 md:p-6 rounded-3xl shadow-sm relative transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-5 lg:gap-6"> 
                             {/* Logo - Compact size on desktop (w-28) to reduce density */}
                             <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-24 md:h-24 lg:w-28 lg:h-28 transition-all duration-300 ease-in-out">
                                {cafe.logoUrl ? (
                                    <ImageWithFallback 
                                        src={cafe.logoUrl} 
                                        alt={`${cafe.name} logo`} 
                                        className="w-full h-full rounded-2xl object-contain shadow-md bg-soft p-1 border border-border"
                                        width={128}
                                        height={128}
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-2xl shadow-md border border-border">
                                        <BuildingStorefrontIcon className="w-1/2 h-1/2 text-muted" />
                                    </div>
                                )}
                             </div>

                             {/* Name & Location & Price - Compact Layout */}
                             <div className="flex-grow w-full text-center md:text-left">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                                     <div className="flex-grow min-w-0">
                                        {/* Title shrunk significantly for desktop */}
                                        <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-extrabold font-jakarta leading-tight text-primary dark:text-white break-words transition-all duration-300">
                                            {cafe.name}
                                        </h1>
                                        <div className="flex items-center justify-center md:justify-start gap-1.5 mt-2 text-sm text-muted">
                                           <MapPinIcon className="h-4 w-4 flex-shrink-0"/> 
                                           <span className="truncate max-w-[250px] sm:max-w-md">{cafe.district}, {cafe.city}</span>
                                        </div>
                                     </div>
                                     
                                     {/* Compact Price Badge & Desktop Actions */}
                                     <div className="flex items-center justify-center md:justify-end gap-3 mt-1 md:mt-0 flex-shrink-0">
                                         {/* Desktop Action Buttons */}
                                         <ActionButtons isMobile={false} />
                                         
                                         <div className="bg-soft dark:bg-gray-700/30 px-3 py-1.5 rounded-lg border border-border flex items-center gap-0.5">
                                             <span className={`text-xl sm:text-2xl font-extrabold tracking-wide leading-none ${getPriceColor(cafe.priceTier)}`}>
                                                {'$'.repeat(cafe.priceTier)}
                                             </span>
                                             <span className="text-gray-300 dark:text-gray-600 text-xl sm:text-2xl font-extrabold tracking-wide leading-none">
                                                {'$'.repeat(4 - cafe.priceTier)}
                                             </span>
                                         </div>
                                     </div>
                                </div>
                                
                                {/* Description - Smaller margin */}
                                {cafe.description && (
                                    <div className="mt-4 text-sm sm:text-base text-primary dark:text-gray-300 leading-relaxed border-t border-border pt-3">
                                        {cafe.description}
                                    </div>
                                )}
                             </div>
                        </div>

                        {/* Tags */}
                        {currentUser && (
                             <div className="mt-5 pt-4 border-t border-border">
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                                   <TagIcon className="h-4 w-4 text-brand" />
                                   <h3 className="text-sm font-bold font-jakarta uppercase tracking-wider text-muted">Tag Komunitas</h3>
                                </div>
                                <TagManager cafe={cafe} setNotification={setNotification} />
                            </div>
                        )}

                        {/* Categorized Grid: Vibes & Amenities */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 mt-6">
                            {/* Vibes */}
                            <div className="bg-soft dark:bg-gray-700/30 p-4 rounded-xl border border-border flex flex-col">
                                <div className="flex items-center gap-2 mb-3 border-b border-border/50 pb-2">
                                    <SparklesIcon className="h-5 w-5 text-accent-pink" />
                                    <h3 className="font-bold text-base text-primary dark:text-white">Vibe</h3>
                                </div>
                                {cafe.vibes.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {cafe.vibes.map(v => (
                                            <span key={v.id} className="bg-white dark:bg-gray-800 text-primary dark:text-gray-200 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium border border-border shadow-sm">
                                                {v.name}
                                            </span>
                                        ))}
                                    </div>
                                ) : <p className="text-muted text-xs italic">Belum ada vibe.</p>}
                            </div>

                            {/* Amenities */}
                            <div className="bg-soft dark:bg-gray-700/30 p-4 rounded-xl border border-border flex flex-col">
                                <div className="flex items-center gap-2 mb-3 border-b border-border/50 pb-2">
                                    <WifiIcon className="h-5 w-5 text-brand" />
                                    <h3 className="font-bold text-base text-primary dark:text-white">Fasilitas</h3>
                                </div>
                                {cafe.amenities.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2">
                                        {cafe.amenities.map(a => (
                                            <div key={a.id} className="flex items-center gap-1.5 text-xs sm:text-sm text-primary dark:text-gray-200">
                                                <span>{a.icon}</span>
                                                <span className="truncate">{a.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-muted text-xs italic">Belum ada fasilitas.</p>}
                            </div>
                        </div>

                        {/* Info Grid - Tighter padding */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
                            <div className="space-y-3">
                                <div className="flex items-start p-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/30 transition-colors">
                                    <MapPinIcon className="h-5 w-5 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-primary dark:text-white">Alamat</p>
                                        <p className="text-muted text-xs sm:text-sm leading-snug break-words">{cafe.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-start p-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/30 transition-colors">
                                    <ClockIcon className="h-5 w-5 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-primary dark:text-white">Jam Operasional</p>
                                        <p className="text-muted text-xs sm:text-sm">{cafe.openingHours}</p>
                                        {openingStatus && (
                                            <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 border border-transparent ${openingStatus.color}`}>
                                                {openingStatus.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-start p-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/30 transition-colors">
                                    <PhoneIcon className="h-5 w-5 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-primary dark:text-white">Kontak</p>
                                        {cafe.phoneNumber ? (
                                            <a href={`tel:${cafe.phoneNumber}`} className="text-muted text-xs sm:text-sm hover:text-brand hover:underline transition-colors">{cafe.phoneNumber}</a>
                                        ) : <p className="text-muted text-xs sm:text-sm italic">Tidak tersedia</p>}
                                    </div>
                                </div>
                                <div className="flex items-start p-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/30 transition-colors">
                                    <GlobeAltIcon className="h-5 w-5 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-primary dark:text-white">Website / Sosmed</p>
                                        {cafe.websiteUrl ? (
                                            <a href={cafe.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted text-xs sm:text-sm hover:text-brand hover:underline transition-colors block truncate">
                                                {cafe.websiteUrl.replace(/^https?:\/\//, '')}
                                            </a>
                                        ) : <p className="text-muted text-xs sm:text-sm italic">Tidak tersedia</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Interactive Map */}
                    <div className="space-y-4">
                        <div className="relative z-10 rounded-3xl shadow-md overflow-hidden h-64 sm:h-80 border border-border transition-all duration-300">
                            <InteractiveMap cafe={cafe} theme={theme} showDistanceControl={true} showUserLocation={true} />
                        </div>
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full text-center bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 text-sm sm:text-base">
                            <MapPinIcon className="h-5 w-5" />
                            Buka Navigasi Google Maps
                        </a>
                    </div>
                    
                    {/* Scores */}
                    <div className="bg-card border border-border p-6 rounded-3xl shadow-sm transition-all duration-300">
                        <h2 className="text-xl sm:text-2xl font-bold font-jakarta text-center mb-6">Skor Nongkrongr</h2>
                        <div className="flex flex-row justify-between gap-2 sm:gap-4">
                            <ScoreDisplay label="Aesthetic" score={cafe.avgAestheticScore} max={10} color="#FF4081" />
                            <ScoreDisplay label="Nugas" score={cafe.avgWorkScore} max={10} color="#00E5FF"/>
                            <ScoreDisplay label="Keramaian" score={cafe.avgCrowdEvening} max={5} color="#7C4DFF"/>
                        </div>
                    </div>

                    {/* Events */}
                    {cafeEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <CalendarDaysIcon className="h-6 w-6 text-brand" />
                                <h2 className="text-xl sm:text-2xl font-bold font-jakarta">Event & Promo</h2>
                            </div>
                            <div className="space-y-4">
                                {cafeEvents.map(event => (
                                    <EventCard key={event.id} event={event} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Photo Gallery */}
                    {cafe.spots && cafe.spots.length > 0 && (
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold font-jakarta mb-4">Galeri Foto</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                                {cafe.spots.map((spot) => (
                                    <button
                                        key={spot.id}
                                        onClick={() => openImageModal(spot.photoUrl)}
                                        className="aspect-square block w-full rounded-xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-brand/50"
                                        aria-label={`Lihat foto ${spot.title}`}
                                    >
                                        <ImageWithFallback
                                            src={spot.photoUrl}
                                            alt={spot.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            width={300}
                                            height={300}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews */}
                     <div>
                         <h2 className="text-xl sm:text-2xl font-bold font-jakarta mb-4">Reviews ({approvedReviews.length})</h2>
                         <div className="space-y-4">
                            {approvedReviews.length > 0 ? visibleReviews.map(review => (
                                <ReviewCard 
                                    key={review.id} 
                                    review={{...review, cafeName: cafe.name, cafeSlug: cafe.slug}} 
                                    isDetailView={true}
                                    onImageClick={openImageModal}
                                />
                            )) : <div className="p-6 bg-soft rounded-2xl text-center text-muted">Belum ada review. Jadilah yang pertama!</div>}
                         </div>
                         
                         {visibleReviewsCount < approvedReviews.length && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={handleLoadMoreReviews}
                                    className="bg-brand/10 text-brand font-bold py-3 px-6 rounded-xl hover:bg-brand/20 transition-all duration-300 flex items-center justify-center gap-2 mx-auto text-sm"
                                >
                                    Muat Lebih Banyak
                                    <ChevronDownIcon className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar (Sticky on Large Screens) */}
                <aside className="lg:col-span-1 lg:sticky lg:top-24 self-start w-full min-w-0">
                    <div className="space-y-6">
                        <ReviewForm onSubmit={(review) => handleAddReview({ ...review, cafe_id: cafe.id })} isSubmitting={isSubmitting} cafeId={cafe.id} />
                    </div>
                </aside>
            </div>
            
            {/* Image Modal */}
            {isModalOpen && selectedImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in-up p-4"
                    onClick={closeImageModal}
                >
                    <div 
                        className="relative max-w-5xl w-full max-h-full flex items-center justify-center" 
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <ImageWithFallback
                            src={selectedImage}
                            alt="Tampilan foto spot yang diperbesar"
                            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                            width={1920}
                            height={1080}
                        />
                        <button
                            onClick={closeImageModal}
                            className="absolute -top-12 right-0 sm:top-4 sm:right-4 text-white bg-white/10 backdrop-blur-md rounded-full p-2 hover:bg-white/20 transition-colors"
                            aria-label="Tutup galeri"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DetailPage;
