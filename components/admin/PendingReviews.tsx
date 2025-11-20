
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Review } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { supabase } from '../../lib/supabaseClient';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { CheckBadgeIcon, ChatBubbleOvalLeftEllipsisIcon, ArchiveBoxXMarkIcon, InboxIcon } from '@heroicons/react/24/outline';

type ManagedReview = Review & { cafeName: string; cafeId: string; cafeSlug: string };
type ReviewStatus = 'pending' | 'approved' | 'rejected';

const REVIEWS_PER_PAGE = 5;

const ReviewManagement: React.FC = () => {
    const { updateReviewStatus, deleteReview } = useContext(CafeContext)!;
    
    const [activeTab, setActiveTab] = useState<ReviewStatus>('pending');
    const [reviews, setReviews] = useState<ManagedReview[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingReviewId, setLoadingReviewId] = useState<string | null>(null);
    const [reviewToDelete, setReviewToDelete] = useState<ManagedReview | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const fetchReviews = useCallback(async () => {
        setIsLoading(true);
        const from = (currentPage - 1) * REVIEWS_PER_PAGE;
        const to = from + REVIEWS_PER_PAGE - 1;

        try {
            // Query reviews directly from DB with server-side pagination
            const { data, error, count } = await supabase
                .from('reviews')
                .select(`
                    *,
                    cafes (id, name, slug),
                    profile:profiles (username, avatar_url)
                `, { count: 'exact' })
                .eq('status', activeTab)
                .order('createdAt', { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (data) {
                const formattedReviews: ManagedReview[] = data.map((r: any) => ({
                    id: r.id,
                    cafe_id: r.cafe_id,
                    author_id: r.author_id,
                    author: r.profile?.username || 'Unknown User',
                    author_avatar_url: r.profile?.avatar_url,
                    ratingAesthetic: r.ratingAesthetic,
                    ratingWork: r.ratingWork,
                    crowdMorning: r.crowdMorning,
                    crowdAfternoon: r.crowdAfternoon,
                    crowdEvening: r.crowdEvening,
                    priceSpent: r.priceSpent,
                    text: r.text,
                    photos: r.photos || [],
                    createdAt: r.createdAt,
                    status: r.status,
                    helpful_count: r.helpful_count,
                    cafeName: r.cafes?.name || 'Unknown Cafe',
                    cafeId: r.cafes?.id,
                    cafeSlug: r.cafes?.slug
                }));
                setReviews(formattedReviews);
                setTotalCount(count || 0);
            }
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
            setNotification({ message: 'Gagal memuat data review.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, currentPage]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    // Reset page when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const handleUpdateStatus = async (reviewId: string, status: Review['status']) => {
        setLoadingReviewId(reviewId);
        const { error } = await updateReviewStatus(reviewId, status);
        if (error) {
            setNotification({ message: `Gagal memperbarui status review: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Status review berhasil diubah menjadi ${status}.`, type: 'success' });
            // Optimistic update: Remove from current list immediately
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            setTotalCount(prev => Math.max(0, prev - 1));
            
            // Optionally trigger a background refresh if needed, but immediate UI feedback is key
            // fetchReviews(); 
        }
        setLoadingReviewId(null);
    };

    const handleDeleteClick = (review: ManagedReview) => {
        setReviewToDelete(review);
    };

    const handleConfirmDelete = async () => {
        if (!reviewToDelete) return;

        setLoadingReviewId(reviewToDelete.id);
        const { error } = await deleteReview(reviewToDelete.id);
        if (error) {
            setNotification({ message: 'Gagal menghapus review.', type: 'error' });
        } else {
            setNotification({ message: 'Review berhasil dihapus secara permanen.', type: 'success' });
            // Optimistic update
            setReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));
            setTotalCount(prev => Math.max(0, prev - 1));
        }
        setLoadingReviewId(null);
        setReviewToDelete(null);
    };
    
    const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE);

    const TabButton: React.FC<{ status: ReviewStatus, label: string }> = ({ status, label }) => (
        <button
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg transition-all border-b-4 ${
                activeTab === status 
                ? 'text-brand border-brand bg-brand/5' 
                : 'text-muted border-transparent hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
         <div className="w-full">
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            
            <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta text-center mb-4 bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                Manajemen Review
            </h2>
            
            <div className="border-b border-border mb-4 flex overflow-x-auto justify-center gap-1">
                <TabButton status="pending" label="Tertunda" />
                <TabButton status="approved" label="Disetujui" />
                <TabButton status="rejected" label="Ditolak" />
            </div>

            {isLoading ? (
                 <div className="space-y-4">
                     {[...Array(3)].map((_, i) => (
                         <div key={i} className="bg-gray-200 dark:bg-gray-700 h-32 rounded-2xl animate-pulse"></div>
                     ))}
                 </div>
            ) : reviews.length === 0 ? (
                <div className="text-center py-10 bg-soft dark:bg-gray-700/50 rounded-2xl border border-border">
                    {activeTab === 'pending' && (
                        <>
                            <CheckBadgeIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-green-500" />
                            <p className="mt-4 text-lg sm:text-xl font-bold font-jakarta text-primary dark:text-gray-200">Semua Sudah Direview!</p>
                            <p className="text-sm sm:text-base text-muted mt-2">Kerja bagus! Tidak ada review yang menunggu persetujuan.</p>
                        </>
                    )}
                    {activeTab === 'approved' && (
                        <>
                            <ChatBubbleOvalLeftEllipsisIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted" />
                            <p className="mt-4 text-lg sm:text-xl font-bold font-jakarta text-primary dark:text-gray-200">Belum Ada Review Disetujui</p>
                        </>
                    )}
                    {activeTab === 'rejected' && (
                        <>
                            <ArchiveBoxXMarkIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted" />
                            <p className="mt-4 text-lg sm:text-xl font-bold font-jakarta text-primary dark:text-gray-200">Tidak Ada Review Ditolak</p>
                        </>
                    )}
                </div>
            ) : (
            <div className="space-y-4">
                {reviews.map(review => (
                    <div key={review.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                {review.photos && review.photos[0] ? (
                                    <a href={review.photos[0]} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 group relative">
                                        <ImageWithFallback
                                            src={review.photos[0]}
                                            alt={`Foto review`}
                                            className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-lg border border-border"
                                            width={150}
                                            height={150}
                                        />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors rounded-lg"></div>
                                    </a>
                                ) : (
                                    <div className="h-20 w-20 sm:h-24 sm:w-24 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-lg border border-border flex-shrink-0">
                                        <InboxIcon className="h-8 w-8 text-muted" />
                                    </div>
                                )}
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <img 
                                            src={review.author_avatar_url || `https://ui-avatars.com/api/?name=${review.author}&background=random`} 
                                            className="w-6 h-6 rounded-full" 
                                            alt={review.author}
                                        />
                                        <p className="font-bold text-sm sm:text-base truncate">
                                            {review.author}
                                            <span className="font-normal text-muted text-xs ml-1">di</span> <span className="text-brand">{review.cafeName}</span>
                                        </p>
                                    </div>
                                    <p className="text-primary dark:text-gray-300 my-2 italic text-sm sm:text-base break-words line-clamp-3 sm:line-clamp-none bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-transparent">
                                        "{review.text}"
                                    </p>
                                    <p className="text-xs text-muted">{new Date(review.createdAt).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                               {review.status === 'pending' && (
                                 <>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'approved')} 
                                     className="flex-1 sm:flex-none bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap hover:bg-green-200 dark:hover:bg-green-500/30 transition-colors"
                                     disabled={loadingReviewId === review.id}
                                   >
                                     Approve
                                   </button>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'rejected')} 
                                     className="flex-1 sm:flex-none bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap hover:bg-yellow-200 dark:hover:bg-yellow-500/30 transition-colors"
                                     disabled={loadingReviewId === review.id}
                                    >
                                     Reject
                                    </button>
                                 </>
                               )}
                               {(review.status === 'approved' || review.status === 'rejected') && (
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'pending')} 
                                     className="flex-1 sm:flex-none bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap hover:bg-gray-200 transition-colors"
                                     disabled={loadingReviewId === review.id}
                                   >
                                     Tinjau Ulang
                                   </button>
                               )}
                               <button 
                                 onClick={() => handleDeleteClick(review)}
                                 className="flex-1 sm:flex-none bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                                 disabled={loadingReviewId === review.id}
                                >
                                 Hapus
                                </button>
                           </div>
                        </div>
                         <div className="mt-3 pt-2 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-pink"></span> Aes: <span className="font-bold text-primary dark:text-white">{review.ratingAesthetic}</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-cyan"></span> Work: <span className="font-bold text-primary dark:text-white">{review.ratingWork}</span></span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand"></span> Crowd: <span className="font-bold text-primary dark:text-white">{review.crowdEvening}</span></span>
                            <span className="flex items-center gap-1">Rp <span className="font-bold text-primary dark:text-white">{review.priceSpent.toLocaleString('id-ID')}</span></span>
                        </div>
                    </div>
                ))}
            </div>
            )}
            
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 w-full">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1 || isLoading}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        <ChevronLeftIcon className="h-4 w-4"/>
                        Sebelumnya
                    </button>
                    <span className="font-semibold text-muted text-xs sm:text-sm order-first sm:order-none">
                        Halaman {currentPage} dari {totalPages} (Total {totalCount})
                    </span>
                    <button
                         onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                         disabled={currentPage === totalPages || isLoading}
                         className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        Selanjutnya
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            )}

            {reviewToDelete && (
                <ConfirmationModal
                    title="Hapus Review"
                    message={`Apakah Anda yakin ingin menghapus review dari "${reviewToDelete.author}" untuk cafe "${reviewToDelete.cafeName}"?`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setReviewToDelete(null)}
                    confirmText="Ya, Hapus"
                />
            )}
         </div>
    );
};

export default ReviewManagement;
