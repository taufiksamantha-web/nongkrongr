import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Review } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

type ManagedReview = Review & { cafeName: string; cafeId: string };
type ReviewStatus = 'pending' | 'approved' | 'rejected';

const REVIEWS_PER_PAGE = 5;

const ReviewManagement: React.FC = () => {
    const { getAllReviews, updateReviewStatus, deleteReview } = useContext(CafeContext)!;
    
    const [activeTab, setActiveTab] = useState<ReviewStatus>('pending');
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingReviewId, setLoadingReviewId] = useState<string | null>(null);
    const [reviewToDelete, setReviewToDelete] = useState<ManagedReview | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const allReviews = useMemo(() => getAllReviews(), [getAllReviews]);
    
    const filteredReviews = useMemo(() => ({
        pending: allReviews.filter(r => r.status === 'pending'),
        approved: allReviews.filter(r => r.status === 'approved'),
        rejected: allReviews.filter(r => r.status === 'rejected'),
    }), [allReviews]);

    // Reset page to 1 when tab changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const currentReviews = filteredReviews[activeTab];
    const totalPages = Math.ceil(currentReviews.length / REVIEWS_PER_PAGE);
    const paginatedReviews = currentReviews.slice(
        (currentPage - 1) * REVIEWS_PER_PAGE,
        currentPage * REVIEWS_PER_PAGE
    );

    const handleUpdateStatus = async (reviewId: string, status: Review['status']) => {
        setLoadingReviewId(reviewId);
        try {
            await updateReviewStatus(reviewId, status);
            setNotification({ message: `Status review berhasil diubah menjadi ${status}.`, type: 'success' });
        } catch (error) {
            console.error("Failed to update review status:", error);
            setNotification({ message: 'Gagal memperbarui status review.', type: 'error' });
        } finally {
            setLoadingReviewId(null);
        }
    };

    const handleDeleteClick = (review: ManagedReview) => {
        setReviewToDelete(review);
    };

    const handleConfirmDelete = async () => {
        if (!reviewToDelete) return;

        setLoadingReviewId(reviewToDelete.id);
        try {
            await deleteReview(reviewToDelete.id);
            setNotification({ message: 'Review berhasil dihapus secara permanen.', type: 'success' });
            if (paginatedReviews.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        } catch (error) {
            console.error("Failed to delete review:", error);
            setNotification({ message: 'Gagal menghapus review.', type: 'error' });
        } finally {
            setLoadingReviewId(null);
            setReviewToDelete(null);
        }
    };
    
    const TabButton: React.FC<{ status: ReviewStatus, label: string, count: number }> = ({ status, label, count }) => (
        <button
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all border-b-4 ${
                activeTab === status 
                ? 'text-brand border-brand' 
                : 'text-muted border-transparent hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        >
            {label} ({count})
        </button>
    );

    return (
         <div>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <h2 className="text-2xl font-bold font-jakarta mb-4">Manajemen Review</h2>
            
            <div className="border-b border-border mb-4">
                <TabButton status="pending" label="Tertunda" count={filteredReviews.pending.length} />
                <TabButton status="approved" label="Disetujui" count={filteredReviews.approved.length} />
                <TabButton status="rejected" label="Ditolak" count={filteredReviews.rejected.length} />
            </div>

            {currentReviews.length === 0 ? <p className="text-muted py-4">Tidak ada review dalam kategori ini.</p> : (
            <div className="space-y-4">
                {paginatedReviews.map(review => (
                    <div key={review.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border">
                        <div className="flex justify-between items-start flex-wrap gap-y-2">
                           <div className="flex-grow">
                                <p className="font-bold text-lg">{review.author} <span className="font-normal text-muted">mereview</span> {review.cafeName}</p>
                                <p className="text-primary dark:text-gray-300 my-2 italic">"{review.text}"</p>
                                {review.photos && review.photos[0] && (
                                     <div className="mt-2">
                                        <a href={review.photos[0]} target="_blank" rel="noopener noreferrer">
                                            <ImageWithFallback
                                                src={review.photos[0]}
                                                alt={`Foto review oleh ${review.author}`}
                                                className="h-24 w-auto max-w-full object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                                                width={150}
                                                height={150}
                                            />
                                        </a>
                                     </div>
                                )}
                           </div>
                           <div className="flex gap-2 flex-shrink-0 ml-0 sm:ml-4">
                               {review.status === 'pending' && (
                                 <>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'approved')} 
                                     className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-3 py-1 rounded-lg font-semibold text-sm disabled:opacity-50"
                                     disabled={loadingReviewId === review.id}
                                   >
                                     Approve
                                   </button>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'rejected')} 
                                     className="bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 px-3 py-1 rounded-lg font-semibold text-sm disabled:opacity-50"
                                     disabled={loadingReviewId === review.id}
                                    >
                                     Reject
                                    </button>
                                 </>
                               )}
                               <button 
                                 onClick={() => handleDeleteClick(review)}
                                 className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1 rounded-lg font-semibold text-sm disabled:opacity-50"
                                 disabled={loadingReviewId === review.id}
                                >
                                 Delete
                                </button>
                           </div>
                        </div>
                         <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                            <span><span className="font-semibold text-accent-pink">Aesthetic:</span> {review.ratingAesthetic}/10</span>
                            <span><span className="font-semibold text-accent-cyan">Nugas:</span> {review.ratingWork}/10</span>
                            <span><span className="font-semibold text-brand">Crowd Malam:</span> {review.crowdEvening}/5</span>
                            <span><span className="font-semibold">Jajan:</span> Rp{review.priceSpent.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>
            )}
            
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeftIcon className="h-5 w-5"/>
                        Sebelumnya
                    </button>
                    <span className="font-semibold text-muted text-sm order-first sm:order-none">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <button
                         onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                         disabled={currentPage === totalPages}
                         className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Selanjutnya
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>
            )}

            {reviewToDelete && (
                <ConfirmationModal
                    title="Hapus Review"
                    message={`Apakah Anda yakin ingin menghapus review dari "${reviewToDelete.author}" untuk cafe "${reviewToDelete.cafeName}"? Tindakan ini tidak dapat diurungkan.`}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setReviewToDelete(null)}
                    confirmText="Ya, Hapus"
                />
            )}
         </div>
    );
};

export default ReviewManagement;
