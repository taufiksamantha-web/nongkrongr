import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { ThemeContext } from '../App';
import { useFavorites } from '../context/FavoriteContext';
import { StarIcon, BriefcaseIcon, UsersIcon, MapPinIcon, ClockIcon, ArrowLeftIcon, HeartIcon } from '@heroicons/react/24/solid';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import ReviewForm from '../components/ReviewForm';
import FloatingNotification from '../components/common/FloatingNotification';
import ImageWithFallback from '../components/common/ImageWithFallback';
import DatabaseConnectionError from '../components/common/DatabaseConnectionError';
import InteractiveMap from '../components/InteractiveMap';
import ShareButton from '../components/ShareButton';

const ScoreDisplay: React.FC<{ label: string, score: number, max: number, color: string }> = ({ label, score, max, color }) => {
    const percentage = max > 0 ? (score / max) * 100 : 0;
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center text-center">
            <div className="relative w-28 h-28">
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
                    <span className="text-2xl font-bold font-jakarta" style={{ color }}>{score > 0 ? score.toFixed(1) : 'N/A'}</span>
                    <span className="text-xs text-muted">/ {max}</span>
                </div>
            </div>
            <p className="mt-4 font-semibold">{label}</p>
        </div>
    );
};

const DetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const cafeContext = useContext(CafeContext);
    const { cafes, loading, addReview, error } = cafeContext!;
    const { theme } = useContext(ThemeContext);
    const { isFavorite, addFavorite, removeFavorite } = useFavorites();
    
    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [reviewsExpanded, setReviewsExpanded] = useState(false);

    useEffect(() => {
        if (slug && cafes.length > 0) {
            const currentCafe = cafes.find(c => c.slug === slug);
            setCafe(currentCafe || null);
        }
    }, [slug, cafes]);

    const handleAddReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status'> & { cafe_id: string }) => {
        setIsSubmitting(true);
        try {
            await addReview(review);
            setNotification("Review kamu telah dikirim dan sedang menunggu moderasi. Terima kasih!");
        } catch (error: any) {
            console.error("Failed to add review:", error);
            alert(`Gagal mengirim review: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (error) return <DatabaseConnectionError />;
    if (loading && !cafe) return <div className="text-center py-20">Loading...</div>;
    if (!cafe) return <div className="text-center py-20">Cafe tidak ditemukan.</div>;
    
    const favorited = isFavorite(cafe.id);
    const nameWordCount = cafe.name.split(' ').length;
    const faviconUrl = "https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png";

    const handleFavoriteClick = () => {
        if (favorited) {
            removeFavorite(cafe.id);
        } else {
            addFavorite(cafe.id);
        }
    };

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cafe.coords.lat},${cafe.coords.lng}`;
    const approvedReviews = cafe.reviews?.filter(r => r.status === 'approved') || [];
    const visibleReviews = reviewsExpanded ? approvedReviews : approvedReviews.slice(0, 10);


    return (
        <div className="container mx-auto px-6 py-8">
            <button
                onClick={() => navigate(-1)}
                className="mb-6 inline-flex items-center gap-2 text-muted hover:text-brand dark:hover:text-brand-light font-semibold transition-colors duration-300 group"
                aria-label="Kembali ke halaman sebelumnya"
            >
                <ArrowLeftIcon className="h-5 w-5 transform group-hover:-translate-x-1 transition-transform" />
                Kembali
            </button>
            {notification && <FloatingNotification message={notification} type="success" onClose={() => setNotification(null)} />}
            <ImageWithFallback 
                src={cafe.coverUrl} 
                alt={cafe.name} 
                className="w-full h-96 object-cover rounded-4xl mb-8 border border-border"
                width={1280}
                height={768}
            />
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
                             <div className="flex flex-col items-center sm:flex-row sm:items-start text-center sm:text-left flex-1 min-w-0">
                                <ImageWithFallback 
                                    src={cafe.logoUrl || faviconUrl} 
                                    alt={`${cafe.name} logo`} 
                                    className="w-16 h-16 rounded-2xl object-contain mb-4 sm:mb-0 sm:mr-4 shadow-md bg-soft p-1 border border-border"
                                    width={100}
                                    height={100}
                                />
                                <h1 className={`text-3xl md:text-4xl font-extrabold font-jakarta ${nameWordCount <= 2 ? 'sm:whitespace-nowrap' : ''}`}>
                                    {cafe.name}
                                </h1>
                             </div>
                             <div className="flex-shrink-0 flex items-center justify-center sm:justify-start gap-2 w-full sm:w-auto">
                                 <ShareButton cafeName={cafe.name} cafeDescription={cafe.description} />
                                 <button
                                    onClick={handleFavoriteClick}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold border-2 transition-all duration-300 ${favorited ? 'bg-accent-pink/10 text-accent-pink border-accent-pink/20' : 'bg-soft border-border hover:border-accent-pink/50'}`}
                                    aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                                 >
                                    {favorited ? <HeartIcon className="h-6 w-6"/> : <HeartIconOutline className="h-6 w-6" />}
                                    {favorited ? 'Favorit' : 'Favoritkan'}
                                 </button>
                            </div>
                        </div>
                        <div className="flex items-center text-muted mb-2">
                            <MapPinIcon className="h-5 w-5 mr-2 text-brand flex-shrink-0" />
                            <span>{cafe.address}</span>
                        </div>
                        <div className="flex items-center text-muted mb-4">
                             <ClockIcon className="h-5 w-5 mr-2 text-brand flex-shrink-0" />
                            <span>Buka: {cafe.openingHours}</span>
                        </div>
                        {cafe.description && (
                            <p className="my-4 text-primary dark:text-gray-300 italic text-lg border-l-4 border-brand/50 pl-4">
                                {cafe.description}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {cafe.vibes.map(v => <span key={v.id} className="bg-brand/10 text-brand px-3 py-1 rounded-full text-sm font-semibold dark:bg-brand/20">{v.name}</span>)}
                            {cafe.amenities.map(a => <span key={a.id} className="bg-gray-100 dark:bg-gray-700/50 px-3 py-1 rounded-full text-sm">{a.icon} {a.name}</span>)}
                        </div>
                    </div>
                    
                    {/* Scores */}
                    <div className="bg-card border border-border p-8 rounded-3xl shadow-sm">
                        <h2 className="text-3xl font-bold font-jakarta text-center mb-8">Skor Nongkrongr</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <ScoreDisplay label="Aesthetic" score={cafe.avgAestheticScore} max={10} color="#FF4081" />
                            <ScoreDisplay label="Nugas" score={cafe.avgWorkScore} max={10} color="#00E5FF"/>
                            <ScoreDisplay label="Keramaian Malam" score={cafe.avgCrowdEvening} max={5} color="#7C4DFF"/>
                        </div>
                    </div>

                    {/* Photo Spots */}
                    <div>
                         <h2 className="text-3xl font-bold font-jakarta mb-4">Galeri Spot Foto</h2>
                         <div className="grid md:grid-cols-2 gap-6">
                            {cafe.spots.map(spot => (
                                <div key={spot.id} className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
                                    <ImageWithFallback 
                                        src={spot.photoUrl} 
                                        alt={spot.title} 
                                        className="w-full h-48 object-cover"
                                        width={500}
                                        height={300}
                                    />
                                    <div className="p-4">
                                        <h4 className="font-bold">{spot.title}</h4>
                                        <p className="text-sm text-muted italic">"{spot.tip}"</p>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* Reviews */}
                     <div>
                         <h2 className="text-3xl font-bold font-jakarta mb-4">Reviews ({approvedReviews.length})</h2>
                         <div className="space-y-4">
                            {approvedReviews.length > 0 ? visibleReviews.map(review => (
                                <div key={review.id} className="bg-card border border-border p-4 rounded-2xl shadow-sm">
                                    <p className="font-bold">{review.author}</p>
                                    <p className="text-muted my-2">"{review.text}"</p>
                                    {review.photos && review.photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {review.photos.map((photo, index) => (
                                                <a href={photo} target="_blank" rel="noopener noreferrer" key={index}>
                                                    <ImageWithFallback 
                                                        src={photo} 
                                                        alt={`Review photo by ${review.author}`} 
                                                        className="h-24 w-24 object-cover rounded-lg hover:scale-105 transition-transform"
                                                        width={150}
                                                        height={150}
                                                    />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : <p className="text-muted">Belum ada review untuk cafe ini.</p>}
                         </div>
                         {approvedReviews.length > 10 && !reviewsExpanded && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => setReviewsExpanded(true)}
                                    className="bg-brand/10 text-brand font-bold py-3 px-8 rounded-2xl hover:bg-brand/20 transition-all duration-300"
                                >
                                    Lebih Banyak ({approvedReviews.length - 10} lagi)
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="lg:sticky lg:top-24 self-start">
                    <div className="space-y-8">
                        <div className="rounded-3xl shadow-md overflow-hidden h-64 border border-border">
                            <InteractiveMap cafe={cafe} theme={theme} showUserLocation={true} />
                        </div>
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-500 text-white font-bold py-3 rounded-2xl hover:bg-green-600 transition-all">
                            Buka di Google Maps
                        </a>
                        <ReviewForm onSubmit={(review) => handleAddReview({ ...review, cafe_id: cafe.id })} isSubmitting={isSubmitting} cafeId={cafe.id} />
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default DetailPage;