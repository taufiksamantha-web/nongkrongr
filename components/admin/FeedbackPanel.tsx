
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { EnvelopeIcon, CheckCircleIcon, TrashIcon, UserCircleIcon, BuildingStorefrontIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';

interface Feedback {
    id: number;
    created_at: string;
    name: string;
    message: string;
    user_id: string | null;
    status: 'new' | 'read' | 'archived';
    profile: {
        username: string;
        role: 'user' | 'admin' | 'admin_cafe';
    } | null;
}

const ITEMS_PER_PAGE = 10;

const FeedbackPanel: React.FC = () => {
    const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [itemToProcess, setItemToProcess] = useState<{ id: number; action: 'archive' | 'delete' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const fetchFeedback = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('feedback')
            .select('*, profile:profiles(username, role)')
            .order('created_at', { ascending: false });

        if (error) {
            setError('Gagal memuat feedback.');
            console.error(error);
        } else {
            setFeedbackList(data as unknown as Feedback[]);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchFeedback();
    }, [fetchFeedback]);

    const handleUpdateStatus = async (id: number, status: 'read' | 'archived') => {
        setIsProcessing(true);
        const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
        if (error) {
            setNotification({ message: 'Gagal update status.', type: 'error' });
        } else {
            setNotification({ message: 'Status berhasil diperbarui.', type: 'success' });
            fetchFeedback();
        }
        setIsProcessing(false);
        setItemToProcess(null);
    };

    const handleDelete = async (id: number) => {
        setIsProcessing(true);
        const { error } = await supabase.from('feedback').delete().eq('id', id);
        if (error) {
            setNotification({ message: `Gagal menghapus feedback: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'Feedback berhasil dihapus permanen.', type: 'success' });
            fetchFeedback();
        }
        setIsProcessing(false);
        setItemToProcess(null);
    };

    const handleConfirm = () => {
        if (itemToProcess) {
            if (itemToProcess.action === 'archive') {
                handleUpdateStatus(itemToProcess.id, 'archived');
            } else if (itemToProcess.action === 'delete') {
                handleDelete(itemToProcess.id);
            }
        }
    };

    const getRoleIcon = (role: string | undefined) => {
        switch (role) {
            case 'admin_cafe': return <BuildingStorefrontIcon className="h-4 w-4" title="Pengelola Kafe"/>;
            case 'user': return <UserCircleIcon className="h-4 w-4" title="User"/>;
            case 'admin': return <UserCircleIcon className="h-4 w-4" title="Admin"/>;
            default: return null;
        }
    };

    const totalItems = feedbackList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedFeedback = feedbackList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            
            <h2 className="text-2xl font-bold font-jakarta mb-4 text-center bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                Saran & Masukan
            </h2>

            {isLoading ? (
                <p className="text-muted text-center">Memuat...</p>
            ) : error ? (
                <p className="text-accent-pink text-center">{error}</p>
            ) : feedbackList.length === 0 ? (
                <div className="text-center py-6 bg-soft dark:bg-gray-700/50 rounded-2xl border border-border">
                    <EnvelopeIcon className="mx-auto h-10 w-10 text-muted" />
                    <p className="mt-2 font-semibold">Kotak Masuk Kosong</p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {paginatedFeedback.map(item => (
                            <div key={item.id} className={`p-4 rounded-xl border ${item.status === 'new' ? 'bg-brand/5 border-brand/20' : 'bg-soft dark:bg-gray-700/50 border-border'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-primary">{item.profile?.username || item.name}</span>
                                            <span className="text-muted">{getRoleIcon(item.profile?.role)}</span>
                                            <span className={`text-xs font-semibold ${!item.profile && 'text-purple-600 dark:text-purple-400'}`}>
                                                {!item.profile ? '(Tamu)' : `(${(item.profile.role || '').replace('admin_cafe', 'Pengelola')})`}
                                            </span>
                                            {item.status === 'archived' && (
                                                <span className="text-[10px] bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full text-muted font-bold">Arsip</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted">{new Date(item.created_at).toLocaleString('id-ID')}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {item.status !== 'archived' && (
                                            <button onClick={() => setItemToProcess({ id: item.id, action: 'archive' })} className="p-1.5 text-gray-500 hover:text-gray-800" title="Arsipkan">
                                                <CheckCircleIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                        <button onClick={() => setItemToProcess({ id: item.id, action: 'delete' })} className="p-1.5 text-red-500 hover:text-red-700" title="Hapus Permanen">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                                <p className="mt-2 text-primary dark:text-gray-300">{item.message}</p>
                            </div>
                        ))}
                    </div>

                    {/* Pagination UI */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 w-full border-t border-border pt-6">
                            <p className="text-sm text-muted font-medium order-2 sm:order-1 text-center sm:text-left">
                                Menampilkan <span className="font-bold text-primary dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-primary dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> dari <span className="font-bold text-primary dark:text-white">{totalItems}</span> data
                            </p>
                            
                            <div className="flex items-center gap-2 order-1 sm:order-2 overflow-x-auto w-full sm:w-auto justify-center sm:justify-end pb-2 sm:pb-0">
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1} 
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-soft hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <ChevronLeftIcon className="h-5 w-5 text-muted" />
                                </button>
                                
                                {(() => {
                                    const range = [];
                                    const delta = 1;
                                    const rangeWithDots = [];
                                    let l;

                                    range.push(1);
                                    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
                                        if (i < totalPages && i > 1) {
                                            range.push(i);
                                        }
                                    }
                                    if (totalPages > 1) range.push(totalPages);

                                    for (let i of range) {
                                        if (l) {
                                            if (i - l === 2) rangeWithDots.push(l + 1);
                                            else if (i - l !== 1) rangeWithDots.push('...');
                                        }
                                        rangeWithDots.push(i);
                                        l = i;
                                    }

                                    return rangeWithDots.map((item, index) => (
                                        <button
                                            key={index}
                                            onClick={() => typeof item === 'number' && setCurrentPage(item)}
                                            disabled={item === '...'}
                                            className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                                                item === currentPage 
                                                ? 'bg-brand text-white shadow-lg shadow-brand/20 border border-brand transform scale-105' 
                                                : item === '...' 
                                                    ? 'cursor-default text-muted' 
                                                    : 'bg-soft hover:bg-brand/10 border border-border text-muted hover:text-brand dark:bg-gray-800 dark:hover:bg-gray-700'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    ));
                                })()}

                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages} 
                                    className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-soft hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    <ChevronRightIcon className="h-5 w-5 text-muted" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
            {itemToProcess && (
                <ConfirmationModal
                    title={`Konfirmasi ${itemToProcess.action === 'archive' ? 'Arsip' : 'Hapus'}`}
                    message={`Anda yakin ingin ${itemToProcess.action === 'archive' ? 'mengarsipkan' : 'menghapus permanen'} masukan ini?`}
                    onConfirm={handleConfirm}
                    onCancel={() => setItemToProcess(null)}
                    confirmText={`Ya, ${itemToProcess.action === 'archive' ? 'Arsipkan' : 'Hapus Permanen'}`}
                    isConfirming={isProcessing}
                />
            )}
        </div>
    );
};

export default FeedbackPanel;
