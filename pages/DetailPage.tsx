import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { CafeContext } from '../context/CafeContext';
import { StarIcon, BriefcaseIcon, UsersIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/solid';
import ReviewForm from '../components/ReviewForm';
import FloatingNotification from '../components/common/FloatingNotification';
import ImageWithFallback from '../components/common/ImageWithFallback';

const ScoreDisplay: React.FC<{ icon: React.ReactNode, label: string, score: number, max: number, color: string }> = ({ icon, label, score, max, color }) => (
    <div className="text-center">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center bg-opacity-20 text-4xl`}>{icon}</div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold font-jakarta" style={{color: color}}>
            {score > 0 ? score.toFixed(1) : 'N/A'} <span className="text-lg text-gray-400 dark:text-gray-500">/ {max}</span>
        </p>
    </div>
);

const DetailPage: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const cafeContext = useContext(CafeContext);
    const { cafes, loading, addReview } = cafeContext!;
    
    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
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

    if (loading && !cafe) return <div className="text-center py-20">Loading...</div>;
    if (!cafe) return <div className="text-center py-20">Cafe tidak ditemukan.</div>;

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cafe.coords.lat},${cafe.coords.lng}`;
    const approvedReviews = cafe.reviews?.filter(r => r.status === 'approved') || [];

    return (
        <div className="container mx-auto px-6 py-8">
            {notification && <FloatingNotification message={notification} type="success" onClose={() => setNotification(null)} />}
            <ImageWithFallback src={cafe.coverUrl} alt={cafe.name} className="w-full h-96 object-cover rounded-4xl mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm mb-8">
                        <div className="flex items-center mb-2">
                            <ImageWithFallback src={cafe.logoUrl} alt={`${cafe.name} logo`} className="w-16 h-16 rounded-2xl object-contain mr-4 shadow-md bg-gray-50 dark:bg-gray-700 p-1" />
                            <h1 className="text-5xl font-extrabold font-jakarta">{cafe.name}</h1>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                            <MapPinIcon className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                            <span>{cafe.address}</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                             <ClockIcon className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                            <span>Buka: {cafe.openingHours}</span>
                        </div>
                        {cafe.description && (
                            <p className="my-4 text-gray-700 dark:text-gray-300 italic text-lg border-l-4 border-primary/50 pl-4">
                                {cafe.description}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {cafe.vibes.map(v => <span key={v.id} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold dark:bg-primary/20">{v.name}</span>)}
                            {cafe.amenities.map(a => <span key={a.id} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm">{a.icon} {a.name}</span>)}
                        </div>
                    </div>
                    
                    {/* Scores */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm mb-8">
                        <h2 className="text-3xl font-bold font-jakarta text-center mb-6">Skor Nongkrongr</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <ScoreDisplay icon={<StarIcon className="text-accent-pink"/>} label="Aesthetic" score={cafe.avgAestheticScore} max={10} color="#FF4081" />
                            <ScoreDisplay icon={<BriefcaseIcon className="text-secondary"/>} label="Nugas" score={cafe.avgWorkScore} max={10} color="#00E5FF"/>
                            <ScoreDisplay icon={<UsersIcon className="text-primary"/>} label="Keramaian Malam" score={cafe.avgCrowdEvening} max={5} color="#7C4DFF"/>
                        </div>
                    </div>

                    {/* Photo Spots */}
                    <div className="mb-8">
                         <h2 className="text-3xl font-bold font-jakarta mb-4">Galeri Spot Foto</h2>
                         <div className="grid md:grid-cols-2 gap-6">
                            {cafe.spots.map(spot => (
                                <div key={spot.id} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm overflow-hidden">
                                    <ImageWithFallback src={spot.photoUrl} alt={spot.title} className="w-full h-48 object-cover" />
                                    <div className="p-4">
                                        <h4 className="font-bold">{spot.title}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">"{spot.tip}"</p>
                                    </div>
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* Reviews */}
                     <div>
                         <h2 className="text-3xl font-bold font-jakarta mb-4">Reviews ({approvedReviews.length})</h2>
                         <div className="space-y-4">
                            {approvedReviews.length > 0 ? approvedReviews.map(review => (
                                <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
                                    <p className="font-bold">{review.author}</p>
                                    <p className="text-gray-600 dark:text-gray-300 my-2">"{review.text}"</p>
                                    {review.photos && review.photos.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {review.photos.map((photo, index) => (
                                                <a href={photo} target="_blank" rel="noopener noreferrer" key={index}>
                                                    <ImageWithFallback src={photo} alt={`Review photo by ${review.author}`} className="h-24 w-24 object-cover rounded-lg hover:scale-105 transition-transform"/>
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )) : <p className="text-gray-500 dark:text-gray-400">Belum ada review untuk cafe ini.</p>}
                         </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    <div className="rounded-3xl shadow-md overflow-hidden">
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" title="Buka di Google Maps">
                            <img src={`https://res.cloudinary.com/dovouihq8/image/upload/v1722158935/map_placeholder.webp`} alt={`Map location for ${cafe.name}`} className="w-full h-64 object-cover" />
                        </a>
                    </div>
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-500 text-white font-bold py-3 rounded-2xl hover:bg-green-600 transition-all">
                        Buka di Google Maps
                    </a>
                    <ReviewForm onSubmit={(review) => handleAddReview({ ...review, cafe_id: cafe.id })} isSubmitting={isSubmitting} cafeId={cafe.id} />
                </div>
            </div>
        </div>
    );
};

export default DetailPage;