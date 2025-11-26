
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

interface UserDashboardProps {
    activeView: string;
}

// Reuse logic for calculating scores
const calculateCafeScores = (cafeData: any): Cafe => {
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

    return {
        ...cafeData,
        coords: { lat: cafeData.lat || 0, lng: cafeData.lng || 0 },
        vibes: Array.isArray(cafeData.vibes) ? cafeData.vibes.map((v: any) => v.vibes).filter(Boolean) : [],
        amenities: Array.isArray(cafeData.amenities) ? cafeData.amenities.map((a: any) => a.amenities).filter(Boolean) : [],
        tags: cafeData.tags || [],
        spots: cafeData.spots || [],
        reviews: reviews, 
        events: cafeData.events || [],
        avgAestheticScore, avgWorkScore, avgCrowdEvening,
        avgCrowdMorning: 0, avgCrowdAfternoon: 0, avgCrowd: avgCrowdEvening
    } as Cafe;
};

const EmptyState: React.FC<{ title: string; message: string; ctaLink: string; ctaText: string; }> = ({ title, message, ctaLink, ctaText }) => (
    <div className="text-center py-12 bg-card border border-border rounded-3xl">
        <p className="text-xl font-bold font-jakarta mb-2 text-primary dark:text-white">{title}</p>
        <p className="text-muted mb-6 max-w-xs mx-auto">{message}</p>
        <Link to={ctaLink} className="inline-flex items-center gap-2 bg-brand text-white font-bold py-3 px-6 rounded-2xl hover:bg-brand/90 transition-all">
            <MagnifyingGlassIcon className="h-5 w-5" />
            {ctaText}
        </Link>
    </div>
);

const UserDashboard: React.FC<UserDashboardProps> = ({ activeView }) => {
    const { currentUser } = useAuth();
    const [favoriteCafes, setFavoriteCafes] = useState<Cafe[]>([]);
    const [userReviews, setUserReviews] = useState<(Review & { cafeName: string, cafeSlug: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeView === 'favorites' || activeView === 'overview') {
                    const { data: favData } = await supabase.from('user_favorites').select(`cafe:cafes (*, vibes:cafe_vibes(vibes(id, name)), amenities:cafe_amenities(amenities(id, name, icon)), reviews(ratingAesthetic, ratingWork, crowdEvening, status))`).eq('user_id', currentUser.id);
                    const processedFavs = (favData || []).map((item: any) => item.cafe).filter(Boolean).map(calculateCafeScores);
                    setFavoriteCafes(processedFavs);
                }

                if (activeView === 'my-reviews' || activeView === 'overview') {
                    const { data: reviewData } = await supabase.from('reviews').select(`*, cafes (name, slug)`).eq('author_id', currentUser.id).order('createdAt', { ascending: false });
                    const processedReviews = (reviewData || []).map((r: any) => ({
                        ...r,
                        author: currentUser.username,
                        author_avatar_url: currentUser.avatar_url,
                        cafeName: r.cafes?.name || 'Unknown',
                        cafeSlug: r.cafes?.slug || '',
                        photos: typeof r.photos === 'string' ? JSON.parse(r.photos.replace(/{/g, '[').replace(/}/g, ']')) : (r.photos || []),
                        helpful_count: r.helpful_count || 0
                    }));
                    setUserReviews(processedReviews);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [currentUser, activeView]);

    if (!currentUser) return null;

    if (activeView === 'favorites') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-jakarta flex items-center gap-2"><HeartIcon className="h-6 w-6 text-accent-pink"/> Kafe Favoritmu</h2>
                {loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_,i) => <SkeletonCard key={i}/>)}</div> : 
                 favoriteCafes.length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{favoriteCafes.map((c,i) => <CafeCard key={c.id} cafe={c} animationDelay={`${i*50}ms`}/>)}</div> : 
                 <EmptyState title="Belum Ada Favorit" message="Simpan kafe yang kamu suka di sini." ctaLink="/explore" ctaText="Cari Kafe"/>}
            </div>
        );
    }

    if (activeView === 'my-reviews') {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold font-jakarta flex items-center gap-2"><ChatBubbleBottomCenterTextIcon className="h-6 w-6 text-brand"/> Riwayat Review</h2>
                {loading ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_,i) => <SkeletonReviewCard key={i}/>)}</div> : 
                 userReviews.length > 0 ? <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">{userReviews.map((r,i) => <ReviewCard key={r.id} review={r} animationDelay={`${i*50}ms`}/>)}</div> : 
                 <EmptyState title="Belum Ada Review" message="Bagikan pengalamanmu untuk membantu yang lain." ctaLink="/explore" ctaText="Mulai Review"/>}
            </div>
        );
    }

    // Overview
    return (
        <div className="space-y-8">
            <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand p-6 rounded-2xl">
                <h3 className="font-bold text-xl text-primary dark:text-white">Selamat datang, {currentUser.username}!</h3>
                <p className="text-muted mt-1">Siap menjelajah hari ini?</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-2xl border border-border text-center">
                    <p className="text-3xl font-bold text-accent-pink">{favoriteCafes.length}</p>
                    <p className="text-xs font-bold text-muted uppercase mt-1">Favorit</p>
                </div>
                <div className="bg-card p-4 rounded-2xl border border-border text-center">
                    <p className="text-3xl font-bold text-brand">{userReviews.length}</p>
                    <p className="text-xs font-bold text-muted uppercase mt-1">Review</p>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
