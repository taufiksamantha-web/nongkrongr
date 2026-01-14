
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send } from 'lucide-react';
import { Modal, Button, Input } from './UI';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string, description: string) => Promise<void>;
    cafeName: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, cafeName }) => {
    const [reason, setReason] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [mathQ, setMathQ] = useState({ n1: 0, n2: 0 });
    const [userAnswer, setUserAnswer] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMathQ({
                n1: Math.floor(Math.random() * 10),
                n2: Math.floor(Math.random() * 10)
            });
            setUserAnswer('');
            setError('');
            setReason('');
            setDescription('');
        }
    }, [isOpen]);

    const reasons = [
        "Informasi Salah (Jam Buka/Harga)",
        "Kafe Tutup Permanen",
        "Foto Tidak Sesuai/Buruk",
        "Duplikat Tempat",
        "Lainnya"
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const correctAnswer = mathQ.n1 + mathQ.n2;
        if (parseInt(userAnswer) !== correctAnswer) {
            setError('Jawaban keamanan salah. Silakan coba lagi.');
            return;
        }
        if (!reason) return;
        setIsSubmitting(true);
        await onSubmit(reason, description);
        setIsSubmitting(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Lapor Masalah" className="!max-w-md w-full dark:!bg-[#1E293B]">
            <div className="space-y-6">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl flex gap-3 items-start text-yellow-800 dark:text-yellow-200 text-sm">
                    <AlertTriangle size={20} className="shrink-0" />
                    <p>Anda melaporkan <strong>{cafeName}</strong>. Laporan Anda membantu menjaga data kami tetap akurat.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Alasan Laporan</label>
                        <div className="space-y-2">
                            {reasons.map(r => (
                                <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${reason === r ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-600 font-bold shadow-sm' : 'border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 dark:text-white'}`}>
                                    <input 
                                        type="radio" 
                                        name="reason" 
                                        value={r} 
                                        checked={reason === r} 
                                        onChange={(e) => setReason(e.target.value)}
                                        className="text-orange-500 focus:ring-orange-500 w-4 h-4"
                                    />
                                    <span className="text-sm">{r}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Deskripsi Tambahan (Opsional)</label>
                        <textarea 
                            className="w-full p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-shadow shadow-sm text-gray-800 dark:text-white"
                            rows={3}
                            placeholder="Ceritakan detail masalahnya..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">Pertanyaan Keamanan</label>
                        <div className="flex items-center gap-3">
                            <div className="bg-gray-100 dark:bg-slate-700 px-4 py-3 rounded-xl font-bold text-gray-700 dark:text-gray-200 select-none">
                                {mathQ.n1} + {mathQ.n2} = ?
                            </div>
                            <input 
                                type="number" 
                                className={`w-full p-3 rounded-xl border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-slate-700 focus:ring-orange-500'} bg-white dark:bg-slate-800 outline-none text-sm font-bold text-gray-800 dark:text-white`}
                                placeholder="Jawaban..."
                                value={userAnswer}
                                onChange={(e) => { setUserAnswer(e.target.value); setError(''); }}
                                required
                            />
                        </div>
                        {error && <p className="text-xs text-red-500 mt-1 font-bold ml-1">{error}</p>}
                    </div>

                    <div className="pt-2">
                        <Button className="w-full py-3" disabled={!reason || !userAnswer || isSubmitting} icon={Send}>
                            {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
