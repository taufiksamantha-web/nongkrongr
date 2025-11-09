import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Cafe, Review } from '../types';
import { cafeService } from '../services/cafeService';
import { StarIcon, BriefcaseIcon, UsersIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/solid';
import ReviewForm from '../components/ReviewForm';

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
    const [cafe, setCafe] = useState<Cafe | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCafe = useCallback(async () => {
        if (!slug) return;
        setLoading(true);
        const data = await cafeService.getCafeBySlug(slug);
        setCafe(data || null);
        setLoading(false);
    }, [slug]);

    useEffect(() => {
        fetchCafe();
    }, [fetchCafe]);

    const handleAddReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status'>) => {
        if (!slug) return;
        setIsSubmitting(true);
        await cafeService.addReview(slug, review);
        setIsSubmitting(false);
        alert("Review kamu telah dikirim dan sedang menunggu moderasi. Terima kasih!");
        // We don't update state directly, user will see review once approved.
    };

    if (loading) return <div className="text-center py-20">Loading...</div>;
    if (!cafe) return <div className="text-center py-20">Cafe tidak ditemukan.</div>;

    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${cafe.coords.lat},${cafe.coords.lng}`;
    const approvedReviews = cafe.reviews.filter(r => r.status === 'approved');

    return (
        <div className="container mx-auto px-6 py-8">
            <img src={cafe.coverUrl} alt={cafe.name} className="w-full h-96 object-cover rounded-4xl mb-8" />
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {/* Header */}
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm mb-8">
                        <h1 className="text-5xl font-extrabold font-jakarta mb-2">{cafe.name}</h1>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                            <MapPinIcon className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                            <span>{cafe.address}</span>
                        </div>
                        <div className="flex items-center text-gray-600 dark:text-gray-400 mb-4">
                             <ClockIcon className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                            <span>Buka: {cafe.openingHours}</span>
                        </div>
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
                                    <img src={spot.photoUrl} alt={spot.title} className="w-full h-48 object-cover" />
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
                                                    <img src={photo} alt={`Review photo by ${review.author}`} className="h-24 w-24 object-cover rounded-lg hover:scale-105 transition-transform"/>
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
                    <div className="bg-gray-200 dark:bg-gray-800 h-64 rounded-3xl text-center flex items-center justify-center">
                        <p className="text-gray-500 dark:text-gray-400">Map with single marker</p>
                    </div>
                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-green-500 text-white font-bold py-3 rounded-2xl hover:bg-green-600 transition-all">
                        Buka di Google Maps
                    </a>
                    <ReviewForm onSubmit={handleAddReview} isSubmitting={isSubmitting} />
                </div>
            </div>
        </div>
    );
};

export default DetailPage;