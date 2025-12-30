
import React, { useState } from 'react';
import { Star, Send, X, MessageSquare, AlertCircle } from 'lucide-react';
import { Modal, Button } from './UI';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    cafeName: string;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, onSubmit, cafeName }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [hover, setHover] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            setError('Silakan pilih rating terlebih dahulu.');
            return;
        }
        if (comment.length < 5) {
            setError('Komentar terlalu pendek (minimal 5 karakter).');
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await onSubmit(rating, comment);
            setRating(0);
            setComment('');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Gagal mengirim ulasan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tulis Ulasan" className="!max-w-md w-full">
            <div className="space-y-6">
                <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 font-medium">Bagaimana pengalamanmu di</p>
                    <h3 className="text-xl font-display font-black text-gray-900 dark:text-white leading-tight">{cafeName}?</h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rating Selection */}
                    <div className="flex flex-col items-center">
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => { setRating(star); setError(null); }}
                                    onMouseEnter={() => setHover(star)}
                                    onMouseLeave={() => setHover(0)}
                                    className="transition-transform active:scale-90 p-1"
                                >
                                    <Star 
                                        size={40} 
                                        className={`${(hover || rating) >= star ? 'text-orange-500 fill-orange-500' : 'text-gray-200 dark:text-slate-700'}`} 
                                        strokeWidth={2}
                                    />
                                </button>
                            ))}
                        </div>
                        <p className="text-xs font-black text-orange-500 mt-3 uppercase tracking-widest h-4">
                            {hover === 1 || (!hover && rating === 1) ? 'Buruk' :
                             hover === 2 || (!hover && rating === 2) ? 'Lumayan' :
                             hover === 3 || (!hover && rating === 3) ? 'Bagus' :
                             hover === 4 || (!hover && rating === 4) ? 'Sangat Bagus' :
                             hover === 5 || (!hover && rating === 5) ? 'Luar Biasa!' : ''}
                        </p>
                    </div>

                    {/* Comment Area */}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Komentar Kamu</label>
                        <div className="relative">
                            <textarea 
                                className="w-full p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-shadow shadow-sm min-h-[120px] text-gray-800 dark:text-white"
                                placeholder="Ceritakan apa yang kamu suka dari tempat ini..."
                                value={comment}
                                onChange={(e) => { setComment(e.target.value); setError(null); }}
                            />
                            <div className="absolute bottom-3 right-3 text-[10px] font-bold text-gray-400">
                                {comment.length} karakter
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/20 animate-in fade-in">
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}

                    <div className="pt-2">
                        <Button 
                            className="w-full h-14 rounded-2xl text-lg shadow-xl shadow-orange-500/20" 
                            disabled={isSubmitting} 
                            icon={Send}
                            isLoading={isSubmitting}
                        >
                            Kirim Ulasan
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
