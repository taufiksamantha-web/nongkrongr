
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { ThemeContext } from '../App';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';
import { StarIcon, BriefcaseIcon, UsersIcon, MapPinIcon, ClockIcon, ArrowLeftIcon, HeartIcon, XMarkIcon, BuildingStorefrontIcon, ExclamationTriangleIcon, CalendarDaysIcon, TagIcon, CurrencyDollarIcon, ChevronDownIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/solid';
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

const INITIAL_REVIEWS_COUNT = 20;

const ScoreDisplay: React.FC<{ label: string, score: number, max: number, color: string }> = ({ label, score, max, color }) => {
    const percentage = max > 0 ? (score / max) * 100 : 0;
    const circumference = 2 * Math.PI * 45;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative w-20 h-20 sm:w-28 sm:h-28">
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
                    <span className="text-lg sm:text-2xl font-bold font-jakarta" style={{ color }}>{score > 0 ? score.toFixed(1) : 'N/A'}</span>
                    <span className="text-xs text-muted">/ {max}</span>
                </div>
            </div>
            <p className="mt-2 sm:mt-4 text-sm font-semibold">{label}</p>
        </div>
    );
};

const checkCafeOpenStatus = (openingHours: string): boolean => {
    if (!openingHours || openingHours.toLowerCase().includes('24')) {
        return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const parts = openingHours.split(' - ');
    if (parts.length !== 2) {
        return false;
    }

    const [openTimeStr, closeTimeStr] = parts;
    
    const parseTime = (timeStr: string): number | null => {
        const timeParts = timeStr.trim().split(':');
        if (timeParts.length !== 2) return null;
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
        return hours * 60 + minutes;
    };

    const openTime = parseTime(openTimeStr);
    const closeTime = parseTime(closeTimeStr);

    if (openTime === null || closeTime === null) {
        return false;
    }

    if (closeTime < openTime) {
        return !(currentTime >= openTime || currentTime < closeTime);
    } else {
        return !(currentTime >= openTime && currentTime < closeTime);
    }
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
    const [isClosed, setIsClosed] = useState(false);
    const [isAnimatingFavorite, setIsAnimatingFavorite] = useState(false);

    useEffect(() => {
        if (slug && cafes.length > 0) {
            const currentCafe = cafes.find(c => c.slug === slug);
            setCafe(currentCafe || null);
            if (currentCafe?.openingHours) {
                setIsClosed(checkCafeOpenStatus(currentCafe.openingHours));
            }
        }
    }, [slug, cafes]);

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
    const approvedReviews = cafe.reviews?.filter(r => r.status === 'approved') || [];
    const visibleReviews = approvedReviews.slice(0, visibleReviewsCount);
    const cafeEvents = cafe.events?.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()) || [];


    return (
        <div className="container mx-auto px-4 sm:px-6 py-8">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center gap-2 text-muted hover:text-brand dark:hover:text-brand-light font-semibold transition-colors duration-300 group"
                aria-label="Kembali ke halaman sebelumnya"
            >
                <ArrowLeftIcon className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            
            <div className="relative group">
                <ImageWithFallback 
                    src={cafe.coverUrl} 
                    defaultSrc={DEFAULT_COVER_URL}
                    alt={cafe.name} 
                    className="w-full h-56 md:h-96 object-cover rounded-4xl mb-8 border border-border shadow-sm"
                    width={1280}
                    height={768}
                />
                <div className="absolute top-4 right-4 flex gap-3 z-10">
                     <ShareButton 
                        cafeName={cafe.name} 
                        cafeDescription={cafe.description} 
                        className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all shadow-sm active:scale-90"
                    />
                     <button
                        onClick={handleFavoriteClick}
                        className={`p-3 rounded-full transition-all duration-300 shadow-sm active:scale-75 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 ${favorited ? 'text-accent-pink' : ''} ${isAnimatingFavorite ? 'animate-subtle-bounce' : ''}`}
                        aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                        title={favorited ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                     >
                        {favorited ? <HeartIcon className="h-6 w-6 text-accent-pink"/> : <HeartIconOutline className="h-6 w-6" />}
                     </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Cafe Improved */}
                    <div className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-sm relative">
                        <div className="flex flex-col sm:flex-row items-start gap-5"> 
                             {/* Logo */}
                             <div className="flex-shrink-0">
                                {cafe.logoUrl ? (
                                    <ImageWithFallback 
                                        src={cafe.logoUrl} 
                                        alt={`${cafe.name} logo`} 
                                        className="w-20 h-20 md:w-28 md:h-28 rounded-3xl object-contain shadow-md bg-soft p-1 border border-border"
                                        width={112}
                                        height={112}
                                    />
                                ) : (
                                    <div className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-3xl shadow-md border border-border">
                                        <BuildingStorefrontIcon className="h-10 w-10 text-muted" />
                                    </div>
                                )}
                             </div>

                             {/* Name & Badges */}
                             <div className="flex-grow w-full">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                                     <h1 className="text-3xl md:text-4xl font-extrabold font-jakarta leading-tight text-primary dark:text-white break-words">
                                        {cafe.name}
                                    </h1>
                                    <div className="flex items-center flex-shrink-0 bg-soft dark:bg-gray-700/50 px-3 py-1.5 rounded-xl border border-border">
                                        {[1, 2, 3, 4].map((tier) => (
                                            <CurrencyDollarIcon
                                                key={tier}
                                                aria-hidden="true"
                                                className={`h-5 w-5 ${
                                                    tier <= cafe.priceTier ? 'text-brand' : 'text-gray-300 dark:text-gray-600'
                                                }`}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {cafe.vibes.map(v => <span key={v.id} className="bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-semibold dark:bg-brand/20 border border-brand/20">{v.name}</span>)}
                                    {cafe.amenities.map(a => <span key={a.id} className="bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full text-sm text-muted border border-border">{a.icon} {a.name}</span>)}
                                </div>
                             </div>
                        </div>

                        {/* Responsive Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-6 border-t border-border">
                            <div className="space-y-4">
                                <div className="flex items-start p-3 rounded-xl bg-soft dark:bg-gray-700/30">
                                    <MapPinIcon className="h-6 w-6 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-primary dark:text-white mb-0.5">Alamat</p>
                                        <p className="text-muted text-sm">{cafe.address}, {cafe.city}</p>
                                    </div>
                                </div>
                                <div className="flex items-start p-3 rounded-xl bg-soft dark:bg-gray-700/30">
                                    <ClockIcon className="h-6 w-6 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-primary dark:text-white mb-0.5">Jam Operasional</p>
                                        <p className="text-muted text-sm">{cafe.openingHours}</p>
                                        {isClosed && <p className="text-xs text-amber-600 font-bold mt-1">⚠️ Mungkin Tutup</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start p-3 rounded-xl bg-soft dark:bg-gray-700/30">
                                    <PhoneIcon className="h-6 w-6 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-sm text-primary dark:text-white mb-0.5">Kontak</p>
                                        {cafe.phoneNumber ? (
                                            <a href={`tel:${cafe.phoneNumber}`} className="text-muted text-sm hover:text-brand hover:underline transition-colors">{cafe.phoneNumber}</a>
                                        ) : <p className="text-muted text-sm italic">Tidak tersedia</p>}
                                    </div>
                                </div>
                                <div className="flex items-start p-3 rounded-xl bg-soft dark:bg-gray-700/30">
                                    <GlobeAltIcon className="h-6 w-6 mr-3 text-brand flex-shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="font-bold text-sm text-primary dark:text-white mb-0.5">Website / Sosmed</p>
                                        {cafe.websiteUrl ? (
                                            <a href={cafe.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted text-sm hover:text-brand hover:underline transition-colors block truncate">
                                                {cafe.websiteUrl.replace(/^https?:\/\//, '')}
                                            </a>
                                        ) : <p className="text-muted text-sm italic">Tidak tersedia</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {cafe.description && (
                            <div className="mt-6 pt-6 border-t border-border">
                                <h3 className="font-bold text-lg mb-2 font-jakarta">Tentang {cafe.name}</h3>
                                <p className="text-primary dark:text-gray-300 leading-relaxed">
                                    {cafe.description}
                                </p>
                            </div>
                        )}
                    </div>
                    
                    {/* Tags */}
                    {currentUser && (
                         <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                               <TagIcon className="h-6 w-6 text-brand" />
                               <h2 className="text-2xl font-bold font-jakarta">Tag Komunitas</h2>
                            </div>
                            <TagManager cafe={cafe} setNotification={setNotification} />
                        </div>
                    )}

                    {/* Interactive Map & Action Button */}
                    <div className="space-y-4">
                        <div className="relative z-10 rounded-3xl shadow-md overflow-hidden h-72 md:h-96 border border-border">
                            <InteractiveMap cafe={cafe} theme={theme} showDistanceControl={true} showUserLocation={true} />
                        </div>
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full text-center bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20">
                            <MapPinIcon className="h-5 w-5" />
                            Buka Navigasi Google Maps
                        </a>
                    </div>
                    
                    {/* Scores */}
                    <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                        <h2 className="text-3xl font-bold font-jakarta text-center mb-8">Skor Nongkrongr</h2>
                        <div className="flex flex-row justify-around items-start gap-2 sm:gap-4">
                            <ScoreDisplay label="Aesthetic" score={cafe.avgAestheticScore} max={10} color="#FF4081" />
                            <ScoreDisplay label="Nugas" score={cafe.avgWorkScore} max={10} color="#00E5FF"/>
                            <ScoreDisplay label="Keramaian" score={cafe.avgCrowdEvening} max={5} color="#7C4DFF"/>
                        </div>
                    </div>

                    {/* Events */}
                    {cafeEvents.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <CalendarDaysIcon className="h-8 w-8 text-brand" />
                                <h2 className="text-3xl font-bold font-jakarta">Event & Promo</h2>
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
                            <h2 className="text-3xl font-bold font-jakarta mb-4">Galeri Foto</h2>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {cafe.spots.map((spot) => (
                                    <button
                                        key={spot.id}
                                        onClick={() => openImageModal(spot.photoUrl)}
                                        className="aspect-square block w-full rounded-2xl overflow-hidden group focus:outline-none focus:ring-4 focus:ring-brand/50"
                                        aria-label={`Lihat foto ${spot.title} lebih besar`}
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
                         <h2 className="text-3xl font-bold font-jakarta mb-4">Reviews ({approvedReviews.length})</h2>
                         <div className="space-y-4">
                            {approvedReviews.length > 0 ? visibleReviews.map(review => (
                                <ReviewCard 
                                    key={review.id} 
                                    review={{...review, cafeName: cafe.name, cafeSlug: cafe.slug}} 
                                />
                            )) : <div className="p-6 bg-soft rounded-2xl text-center text-muted">Belum ada review. Jadilah yang pertama!</div>}
                         </div>
                         
                         {visibleReviewsCount < approvedReviews.length && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={handleLoadMoreReviews}
                                    className="bg-brand/10 text-brand font-bold py-3 px-8 rounded-2xl hover:bg-brand/20 transition-all duration-300 flex items-center justify-center gap-2 mx-auto"
                                >
                                    Muat Lebih Banyak
                                    <ChevronDownIcon className="h-5 w-5" />
                                </button>
                                <p className="text-xs text-muted mt-2">
                                    Menampilkan {visibleReviews.length} dari {approvedReviews.length} ulasan
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="lg:sticky lg:top-24 self-start">
                    <div className="space-y-8">
                        <ReviewForm onSubmit={(review) => handleAddReview({ ...review, cafe_id: cafe.id })} isSubmitting={isSubmitting} cafeId={cafe.id} />
                    </div>
                </aside>
            </div>
            
            {/* Image Modal */}
            {isModalOpen && selectedImage && (
                <div
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[1000] animate-fade-in-up"
                    onClick={closeImageModal}
                >
                    <div 
                        className="relative max-w-4xl w-full max-h-[90vh] p-4" 
                        onClick={(e) => e.stopPropagation()} 
                    >
                        <ImageWithFallback
                            src={selectedImage}
                            alt="Tampilan foto spot yang diperbesar"
                            className="w-full h-auto max-h-[90vh] object-contain rounded-2xl shadow-2xl"
                            width={1920}
                            height={1080}
                        />
                        <button
                            onClick={closeImageModal}
                            className="absolute -top-2 -right-2 sm:top-4 sm:right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
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
