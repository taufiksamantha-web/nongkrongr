import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CafeContext } from '../../context/CafeContext';
import { useFavorites } from '../../context/FavoriteContext';
import CafeCard from '../CafeCard';
import ReviewCard from '../ReviewCard';
import { HeartIcon, ChatBubbleBottomCenterTextIcon, MagnifyingGlassIcon, UserCircleIcon, PhotoIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/solid';
import SkeletonCard from '../SkeletonCard';
import SkeletonReviewCard from '../SkeletonReviewCard';
import { fileToBase64 } from '../../utils/fileUtils';
import { cloudinaryService } from '../../services/cloudinaryService';
import FloatingNotification from '../common/FloatingNotification';

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

const ProfileEditor: React.FC = () => {
    const { currentUser, updateUserProfile } = useAuth();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            try {
                const base64 = await fileToBase64(file);
                setAvatarPreview(base64);
            } catch (error) {
                console.error("Error creating preview:", error);
                setNotification({ message: 'Gagal membuat pratinjau gambar.', type: 'error' });
            }
        }
    };
    
    const handleSave = async () => {
        if (!avatarFile || !currentUser) return;
        
        setIsSaving(true);
        setNotification(null);
        
        try {
            const base64Image = await fileToBase64(avatarFile);
            const newAvatarUrl = await cloudinaryService.uploadImage(base64Image);
            
            const { error } = await updateUserProfile({ avatar_url: newAvatarUrl });
            
            if (error) {
                throw error;
            }
            
            setNotification({ message: 'Foto profil berhasil diperbarui!', type: 'success' });
            setAvatarFile(null); // Clear file after successful save

        } catch (error: any) {
            console.error("Failed to save profile:", error);
            setNotification({ message: `Gagal menyimpan: ${error.message}`, type: 'error' });
            // Revert preview to original if save fails
            setAvatarPreview(currentUser.avatar_url || null);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!currentUser) return null;

    return (
        <Section icon={<UserCircleIcon className="h-8 w-8 text-accent-cyan" />} title="Pengaturan Profil">
             {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                    <img
                        src={avatarPreview || `https://ui-avatars.com/api/?name=${currentUser.username.replace(/\s/g, '+')}&background=random&color=fff`}
                        alt="Avatar Preview"
                        className="h-32 w-32 rounded-full object-cover border-4 border-card dark:border-gray-800 shadow-lg"
                    />
                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <PhotoIcon className="h-8 w-8" />
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSaving} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-xl font-bold">{currentUser.username}</h4>
                    <p className="text-muted">{currentUser.email}</p>
                    <div className="mt-4">
                        <button
                            onClick={handleSave}
                            disabled={!avatarFile || isSaving}
                            className="inline-flex items-center gap-2 bg-brand text-white font-bold py-2 px-5 rounded-xl hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Menyimpan...' : <><ArrowUpOnSquareIcon className="h-5 w-5" /> Simpan Perubahan</>}
                        </button>
                    </div>
                </div>
            </div>
        </Section>
    );
};


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
            
            <ProfileEditor />

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

// FIX: Added default export for UserDashboard component
export default UserDashboard;