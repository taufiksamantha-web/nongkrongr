import React, { useState, useContext } from 'react';
import { Review } from '../../types';
import { CafeContext } from '../../context/CafeContext';

type PendingReview = Review & { cafeName: string; cafeId: string };

const PendingReviews: React.FC = () => {
    const { getPendingReviews, updateReviewStatus } = useContext(CafeContext)!;
    const [loadingReviewId, setLoadingReviewId] = useState<string | null>(null);

    const reviews = getPendingReviews();

    const handleUpdateStatus = async (reviewId: string, status: Review['status']) => {
        setLoadingReviewId(reviewId);
        try {
            await updateReviewStatus(reviewId, status);
        } catch (error) {
            console.error("Failed to update review status:", error);
            alert("Gagal memperbarui status review.");
        } finally {
            setLoadingReviewId(null);
        }
    };
    
    return (
         <div>
            <h2 className="text-2xl font-bold font-jakarta mb-4">Moderasi Review ({reviews.length})</h2>
            {reviews.length === 0 ? <p className="text-muted">Tidak ada review yang menunggu moderasi.</p> : (
            <div className="space-y-4">
                {reviews.map(review => (
                    <div key={review.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border">
                        <div className="flex justify-between items-start flex-wrap">
                           <div className="flex-grow">
                                <p className="font-bold text-lg">{review.author} <span className="font-normal text-muted">mereview</span> {review.cafeName}</p>
                                <p className="text-primary dark:text-gray-300 my-2 italic">"{review.text}"</p>
                                {review.photos && review.photos[0] && (
                                    <a href={review.photos[0]} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline text-sm font-semibold">
                                        Lihat Foto
                                    </a>
                                )}
                           </div>
                           <div className="flex gap-2 flex-shrink-0 ml-4 mt-2 sm:mt-0">
                               <button 
                                 onClick={() => handleUpdateStatus(review.id, 'approved')} 
                                 className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-3 py-1 rounded-lg font-semibold text-sm disabled:opacity-50"
                                 disabled={loadingReviewId === review.id}
                               >
                                 Approve
                               </button>
                               <button 
                                 onClick={() => handleUpdateStatus(review.id, 'rejected')} 
                                 className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1 rounded-lg font-semibold text-sm disabled:opacity-50"
                                 disabled={loadingReviewId === review.id}
                                >
                                 Reject
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
         </div>
    );
};

export default PendingReviews;