
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CafeContext } from '../../context/CafeContext';
import { useFavorites } from '../../context/FavoriteContext';
import CafeCard from '../CafeCard';
import ReviewCard from '../ReviewCard';
import { HeartIcon, ChatBubbleBottomCenterTextIcon, MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/solid';
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

const UserDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading } = useContext(CafeContext)!;
    const { favoriteIds } = useFavorites();
    
    const [welcomeMessage] = useState(() => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);

    if (!currentUser) return null;

    const favoriteCafes = cafes.filter(cafe => favoriteIds.includes(cafe.id));
    
    // Find reviews by the current user.
    // The author field in reviews is just a string, so we match it with username.
    const userReviews = cafes.flatMap(cafe => 
        cafe.reviews
            .filter(review => review.author === currentUser.username && review.status === 'approved')
            .map(review => ({ ...review, cafeName: cafe.name, cafeSlug: cafe.slug }))
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by most recent

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
                        {userReviews.slice(0, 3).map((review, i) => <ReviewCard key={review.id} review={review} animationDelay={`${i * 75}ms`} />)}
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
