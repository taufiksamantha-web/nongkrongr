
import React, { useState, useContext } from 'react';
import { Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import AdminCafeForm from './AdminCafeForm';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 5;

const CafeManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading, addCafe, updateCafe, deleteCafe } = useContext(CafeContext)!;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [cafeToDelete, setCafeToDelete] = useState<Cafe | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    const totalPages = Math.ceil(cafes.length / ITEMS_PER_PAGE);
    const paginatedCafes = cafes.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleSave = async (data: any) => {
        setIsSaving(true);
        setNotification(null);
        try {
            if (editingCafe) {
                await updateCafe(editingCafe.id, data);
                setNotification({ message: 'Kafe berhasil diperbarui!', type: 'success' });
            } else {
                await addCafe(data);
                setNotification({ message: 'Kafe baru berhasil ditambahkan!', type: 'success' });
            }
            setIsFormOpen(false);
            setEditingCafe(null);
        } catch (error: any) {
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeleteCafe = async () => {
        if (cafeToDelete) {
            setIsSaving(true);
            setNotification(null);
            try {
                await deleteCafe(cafeToDelete.id);
                setNotification({ message: `"${cafeToDelete.name}" berhasil dihapus.`, type: 'success' });
                // If the deleted item was the last on a page, go to the previous page
                if (paginatedCafes.length === 1 && currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                }
            } catch (error: any) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            } finally {
                setCafeToDelete(null);
                setIsSaving(false);
            }
        }
    };

    return (
         <>
            {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold font-jakarta">Daftar Cafe</h2>
                <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-brand text-white font-bold py-2 px-6 rounded-2xl hover:bg-brand/90 transition-colors">
                    + Tambah Cafe
                </button>
            </div>

            {loading ? (
                 <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse h-[68px]">
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                        </div>
                    ))}
                </div>
            ) : cafes.length === 0 ? (
                <p className="text-center py-8 text-muted">Belum ada kafe yang ditambahkan.</p>
            ) : (
                <>
                    <div className="bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border">
                        <div className="space-y-2">
                            {paginatedCafes.map(cafe => (
                                <div key={cafe.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-brand/5 dark:hover:bg-brand/10 transition-colors duration-200">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-primary dark:text-gray-200 truncate">{cafe.name}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted">
                                            <span>{cafe.district}</span>
                                            <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                                            {cafe.isSponsored ? (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <CheckCircleIcon className="h-4 w-4" /> Sponsored
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                                                    <XCircleIcon className="h-4 w-4" /> Regular
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 ml-4 space-x-4">
                                        <button onClick={() => { setEditingCafe(cafe); setIsFormOpen(true); }} className="text-brand font-bold hover:underline">Edit</button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink font-bold hover:underline">Delete</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                     {totalPages > 1 && (
                        <div className="flex justify-between items-center mt-6">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeftIcon className="h-5 w-5"/>
                                Sebelumnya
                            </button>
                            <span className="font-semibold text-muted">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Selanjutnya
                                <ChevronRightIcon className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </>
            )}

            {isFormOpen && <AdminCafeForm cafe={editingCafe} userRole={currentUser!.role} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} isSaving={isSaving}/>}
            
            {cafeToDelete && currentUser?.role === 'admin' && (
                <ConfirmationModal
                    title="Hapus Cafe"
                    message={`Apakah Anda yakin ingin menghapus "${cafeToDelete.name}"? Tindakan ini tidak dapat diurungkan.`}
                    onConfirm={handleConfirmDeleteCafe}
                    onCancel={() => setCafeToDelete(null)}
                />
            )}
        </>
    )
}

export default CafeManagementPanel;
