
import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Review } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { CheckBadgeIcon, ChatBubbleOvalLeftEllipsisIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';


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
        const { error } = await updateReviewStatus(reviewId, status);
        if (error) {
            setNotification({ message: 'Gagal memperbarui status review.', type: 'error' });
        } else {
            setNotification({ message: `Status review berhasil diubah menjadi ${status}.`, type: 'success' });
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
            if (paginatedReviews.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        }
        setLoadingReviewId(null);
        setReviewToDelete(null);
    };
    
    const TabButton: React.FC<{ status: ReviewStatus, label: string, count: number }> = ({ status, label, count }) => (
        <button
            onClick={() => setActiveTab(status)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-lg transition-all border-b-4 ${
                activeTab === status 
                ? 'text-brand border-brand' 
                : 'text-muted border-transparent hover:text-primary hover:border-gray-300 dark:hover:border-gray-600'
            }`}
        >
            {label} ({count})
        </button>
    );

    return (
         <div className="w-full">
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            
            <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta text-center mb-4 bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                Manajemen Review
            </h2>
            
            <div className="border-b border-border mb-4 flex overflow-x-auto justify-center">
                <TabButton status="pending" label="Tertunda" count={filteredReviews.pending.length} />
                <TabButton status="approved" label="Disetujui" count={filteredReviews.approved.length} />
                <TabButton status="rejected" label="Ditolak" count={filteredReviews.rejected.length} />
            </div>

            {currentReviews.length === 0 ? (
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
                            <p className="text-sm sm:text-base text-muted mt-2">Review yang kamu setujui akan muncul di sini.</p>
                        </>
                    )}
                    {activeTab === 'rejected' && (
                        <>
                            <ArchiveBoxXMarkIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted" />
                            <p className="mt-4 text-lg sm:text-xl font-bold font-jakarta text-primary dark:text-gray-200">Tidak Ada Review Ditolak</p>
                            <p className="text-sm sm:text-base text-muted mt-2">Review yang kamu tolak akan ditampilkan di sini.</p>
                        </>
                    )}
                </div>
            ) : (
            <div className="space-y-4">
                {paginatedReviews.map(review => (
                    <div key={review.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                {review.photos && review.photos[0] && (
                                    <a href={review.photos[0]} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                        <ImageWithFallback
                                            src={review.photos[0]}
                                            alt={`Foto review oleh ${review.author}`}
                                            className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                                            width={150}
                                            height={150}
                                        />
                                    </a>
                                )}
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-base sm:text-lg truncate">{review.author} <span className="font-normal text-muted text-sm">mereview</span> {review.cafeName}</p>
                                    <p className="text-primary dark:text-gray-300 my-2 italic text-sm sm:text-base break-words line-clamp-3 sm:line-clamp-none">"{review.text}"</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
                               {review.status === 'pending' && (
                                 <>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'approved')} 
                                     className="flex-1 sm:flex-none bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
                                     disabled={loadingReviewId === review.id}
                                   >
                                     Approve
                                   </button>
                                   <button 
                                     onClick={() => handleUpdateStatus(review.id, 'rejected')} 
                                     className="flex-1 sm:flex-none bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
                                     disabled={loadingReviewId === review.id}
                                    >
                                     Reject
                                    </button>
                                 </>
                               )}
                               <button 
                                 onClick={() => handleDeleteClick(review)}
                                 className="flex-1 sm:flex-none bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm disabled:opacity-50 whitespace-nowrap"
                                 disabled={loadingReviewId === review.id}
                                >
                                 Delete
                                </button>
                           </div>
                        </div>
                         <div className="mt-3 pt-2 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs sm:text-sm text-muted">
                            <span><span className="font-semibold text-accent-pink">Aesthetic:</span> {review.ratingAesthetic}/10</span>
                            <span><span className="font-semibold text-accent-cyan">Nugas:</span> {review.ratingWork}/10</span>
                            <span><span className="font-semibold text-brand">Crowd:</span> {review.crowdEvening}/5</span>
                            <span><span className="font-semibold">Jajan:</span> Rp{review.priceSpent.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>
            )}
            
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 w-full">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        <ChevronLeftIcon className="h-4 w-4"/>
                        Sebelumnya
                    </button>
                    <span className="font-semibold text-muted text-xs sm:text-sm order-first sm:order-none">
                        Halaman {currentPage} dari {totalPages}
                    </span>
                    <button
                         onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                         disabled={currentPage === totalPages}
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
