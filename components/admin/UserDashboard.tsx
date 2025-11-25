import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { Cafe, Review } from '../../types';
import CafeCard from '../CafeCard';
import ReviewCard from '../ReviewCard';
import { HeartIcon, ChatBubbleBottomCenterTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import SkeletonCard from '../SkeletonCard';
import SkeletonReviewCard from '../SkeletonReviewCard';

const welcomeMessages = [
    "Selamat datang kembali! Mari kita temukan spot nongkrong baru hari ini.",
    "Hey, penjelajah kafe! Kafe favoritmu sudah menanti.",
    "Waktunya ngopi! Lihat review terakhirmu atau jelajahi kafe baru.",
    "Selamat datang! Siap untuk petualangan rasa berikutnya?",
];

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h2 className="text-2xl font-bold font-jakarta">{title}</h2>
        </div>
        {children}
    </div>
);

const EmptyState: React.FC<{ title: string; message: string; ctaLink: string; ctaText: string; }> = ({ title, message, ctaLink, ctaText }) => (
    <div className="text-center py-8">
        <p className="text-xl font-bold font-jakarta mb-2">{title}</p>
        <p className="text-muted mb-6">{message}</p>
        <Link 
            to={ctaLink}
            className="inline-flex items-center gap-2 bg-brand text-white font-bold py-2 px-5 rounded-xl hover:bg-brand/90 transition-all"
        >
            <MagnifyingGlassIcon className="h-5 w-5" />
            {ctaText}
        </Link>
    </div>
);

// Helper to calculate scores client-side for fetching direct favorites
const calculateCafeScores = (cafeData: any): Cafe => {
    // Defensive check: Ensure reviews is an array
    const reviews = Array.isArray(cafeData.reviews) ? cafeData.reviews : [];
    const approvedReviews = reviews.filter((r: any) => r.status === 'approved');
    
    let avgAestheticScore = 0;
    let avgWorkScore = 0;
    let avgCrowdEvening = 0;

    if (approvedReviews.length > 0) {
        const totalAesthetic = approvedReviews.reduce((acc: number, r: any) => acc + (r.ratingAesthetic || 0), 0);
        const totalWork = approvedReviews.reduce((acc: number, r: any) => acc + (r.ratingWork || 0), 0);
        const totalCrowd = approvedReviews.reduce((acc: number, r: any) => acc + (r.crowdEvening || 0), 0);
        
        avgAestheticScore = parseFloat((totalAesthetic / approvedReviews.length).toFixed(1));
        avgWorkScore = parseFloat((totalWork / approvedReviews.length).toFixed(1));
        avgCrowdEvening = parseFloat((totalCrowd / approvedReviews.length).toFixed(1));
    }

    // Map raw DB data to Cafe type
    return {
        ...cafeData,
        coords: { lat: cafeData.lat || 0, lng: cafeData.lng || 0 },
        vibes: cafeData.vibes?.map((v: any) => v.vibes).filter(Boolean) || [],
        amenities: cafeData.amenities?.map((a: any) => a.amenities).filter(Boolean) || [],
        tags: cafeData.tags || [],
        spots: cafeData.spots || [],
        reviews: reviews, 
        events: cafeData.events || [],
        avgAestheticScore,
        avgWorkScore,
        avgCrowdEvening,
        // Mock remaining for safe typing
        avgCrowdMorning: 0,
        avgCrowdAfternoon: 0,
        avgCrowd: avgCrowdEvening // Fallback alias
    } as Cafe;
};

const UserDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    
    const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
    const [userReviews, setUserReviews] = useState<(Review & { cafeName: string, cafeSlug: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [welcomeMessage] = useState(() => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);

    useEffect(() => {
        if (!currentUser) return;

        const fetchUserData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Favorites Directly
                const { data: favData, error: favError } = await supabase
                    .from('user_favorites')
                    .select(`
                        cafe:cafes (
                            *,
                            vibes:cafe_vibes(vibes(id, name)),
                            amenities:cafe_amenities(amenities(id, name, icon)),
                            reviews(ratingAesthetic, ratingWork, crowdEvening, status)
                        )
                    `)
                    .eq('user_id', currentUser.id);

                if (favError) throw favError;

                const processedFavs = (favData || [])
                    .map((item: any) => item.cafe)
                    .filter((cafe: any) => cafe !== null) // Filter out deleted cafes (orphaned favorites)
                    .map(calculateCafeScores);
                
                setFavoriteCafes(processedFavs);

                // 2. Fetch User Reviews Directly
                const { data: reviewData, error: reviewError } = await supabase
                    .from('reviews')
                    .select(`
                        *,
                        cafes (name, slug)
                    `)
                    .eq('author_id', currentUser.id)
                    .order('createdAt', { ascending: false })
                    .limit(5);

                if (reviewError) throw reviewError;

                const processedReviews = (reviewData || []).map((r: any) => ({
                    ...r,
                    cafeName: r.cafes?.name || 'Unknown Cafe',
                    cafeSlug: r.cafes?.slug || '',
                    photos: r.photos || [], 
                    helpful_count: r.helpful_count || 0
                }));

                setUserReviews(processedReviews);

            } catch (err) {
                console.error("Error fetching user dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [currentUser]);

    if (!currentUser) return null;

    return (
        <div className="space-y-8">
             <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand p-6 rounded-2xl animate-fade-in-up">
                <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Halo, {currentUser.username}!</h3>
                <p className="mt-1 text-muted">{welcomeMessage}</p>
            </div>
            
            <Section icon={<HeartIcon className="h-8 w-8 text-accent-pink" />} title="Kafe Favoritmu">
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : favoriteCafes.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {favoriteCafes.map((cafe, i) => <CafeCard key={cafe.id} cafe={cafe} animationDelay={`${i * 75}ms`} />)}
                    </div>
                ) : (
                    <EmptyState 
                        title="Kamu Belum Punya Favorit"
                        message="Tandai kafe yang kamu suka dengan ikon hati untuk menyimpannya di sini."
                        ctaLink="/explore"
                        ctaText="Jelajahi Kafe"
                    />
                )}
            </Section>
            
            <Section icon={<ChatBubbleBottomCenterTextIcon className="h-8 w-8 text-brand" />} title="Review Terakhirmu">
                {loading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => <SkeletonReviewCard key={i} />)}
                    </div>
                ) : userReviews.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {userReviews.map((review, i) => <ReviewCard key={review.id} review={review} animationDelay={`${i * 75}ms`} />)}
                    </div>
                ) : (
                     <EmptyState 
                        title="Kamu Belum Memberi Review"
                        message="Bagikan pengalamanmu di kafe favorit untuk membantu komunitas."
                        ctaLink="/explore"
                        ctaText="Cari Kafe untuk Direview"
                    />
                )}
            </Section>
        </div>
    );
};

export default UserDashboard;