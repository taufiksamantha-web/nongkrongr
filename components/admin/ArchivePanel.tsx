
import React, { useState, useEffect, useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
import { userService } from '../../services/userService';
import { Cafe, Profile } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import { ArchiveBoxIcon, ArrowPathIcon, TrashIcon, BuildingStorefrontIcon, UserCircleIcon, InboxIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 10;

const ArchivePanel: React.FC = () => {
    const { getArchivedCafes, restoreCafe, deleteCafe, fetchCafes } = useContext(CafeContext)!;
    
    const [activeTab, setActiveTab] = useState<'cafes' | 'users'>('cafes');
    const [archivedUsers, setArchivedUsers] = useState<Profile[]>([]);
    const [archivedCafesList, setArchivedCafesList] = useState<Cafe[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'cafe' | 'user'; name: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    // Fetch archived users
    const fetchArchivedUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('status', 'archived');
            if (error) throw error;
            setArchivedUsers(data as Profile[]);
        } catch (error: any) {
            console.error("Error fetching archived users:", error);
            setNotification({ message: 'Gagal memuat user terarsip.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Initial sync of archived cafes from context
    useEffect(() => {
        setArchivedCafesList(getArchivedCafes());
    }, [getArchivedCafes]);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchArchivedUsers();
        } else {
             setArchivedCafesList(getArchivedCafes());
        }
        setCurrentPage(1); // Reset page on tab switch
    }, [activeTab, getArchivedCafes]);


    const handleRestoreCafe = async (cafe: Cafe) => {
        setIsProcessing(true);
        const { error } = await restoreCafe(cafe.id);
        if (error) {
            setNotification({ message: `Gagal memulihkan kafe: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Kafe "${cafe.name}" berhasil dipulihkan.`, type: 'success' });
            setArchivedCafesList(prev => prev.filter(c => c.id !== cafe.id));
            fetchCafes();
        }
        setIsProcessing(false);
    };

    const handleRestoreUser = async (user: Profile) => {
        setIsProcessing(true);
        const { error } = await userService.restoreUser(user.id);
        if (error) {
            setNotification({ message: `Gagal memulihkan user: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `User "${user.username}" berhasil dipulihkan.`, type: 'success' });
            setArchivedUsers(prev => prev.filter(u => u.id !== user.id));
        }
        setIsProcessing(false);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsProcessing(true);

        if (itemToDelete.type === 'cafe') {
            const { error } = await deleteCafe(itemToDelete.id);
            if (error) {
                setNotification({ message: `Gagal menghapus permanen: ${error.message}`, type: 'error' });
            } else {
                setNotification({ message: `Kafe "${itemToDelete.name}" dihapus permanen.`, type: 'success' });
                // Force update UI list immediately
                setArchivedCafesList(prev => prev.filter(c => c.id !== itemToDelete.id));
                // Sync context
                fetchCafes(); 
            }
        } else {
            const { error } = await userService.deleteUserPermanent(itemToDelete.id);
            if (error) {
                 setNotification({ message: `Gagal menghapus permanen: ${error.message}`, type: 'error' });
            } else {
                 setNotification({ message: `User "${itemToDelete.name}" dihapus permanen.`, type: 'success' });
                 // Force update UI list immediately
                 setArchivedUsers(prev => prev.filter(u => u.id !== itemToDelete.id));
            }
        }
        setIsProcessing(false);
        setItemToDelete(null);
    };

    const currentList = activeTab === 'cafes' ? archivedCafesList : archivedUsers;
    const totalItems = currentList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedList = currentList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


    return (
        <div>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent inline-block">
                    Arsip Data
                </h2>
            </div>

            <div className="flex border-b border-border mb-6 justify-center">
                <button
                    onClick={() => setActiveTab('cafes')}
                    className={`flex items-center justify-center gap-2 w-full max-w-xs p-3 font-bold border-b-4 transition-colors ${
                        activeTab === 'cafes' ? 'text-brand border-brand' : 'text-muted border-transparent hover:bg-soft dark:hover:bg-gray-700/50'
                    }`}
                >
                    <BuildingStorefrontIcon className="h-5 w-5" />
                    Kafe ({archivedCafesList.length})
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center justify-center gap-2 w-full max-w-xs p-3 font-bold border-b-4 transition-colors ${
                        activeTab === 'users' ? 'text-brand border-brand' : 'text-muted border-transparent hover:bg-soft dark:hover:bg-gray-700/50'
                    }`}
                >
                    <UserCircleIcon className="h-5 w-5" />
                    User ({archivedUsers.length})
                </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border overflow-x-auto mb-6">
                <table className="w-full text-left min-w-[580px]">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider w-1/3">Nama / Username</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider w-1/3">Keterangan</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider text-right w-1/3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'cafes' && archivedCafesList.length === 0 && (
                            <tr><td colSpan={3} className="text-center p-10 text-muted"><InboxIcon className="mx-auto h-10 w-10 mb-2" />Tidak ada kafe di arsip.</td></tr>
                        )}
                        {activeTab === 'users' && archivedUsers.length === 0 && (
                            <tr><td colSpan={3} className="text-center p-10 text-muted"><InboxIcon className="mx-auto h-10 w-10 mb-2" />Tidak ada user di arsip.</td></tr>
                        )}
                        
                        {activeTab === 'cafes' && (paginatedList as Cafe[]).map(cafe => (
                            <tr key={cafe.id} className="border-b border-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 font-semibold text-primary dark:text-gray-200">{cafe.name}</td>
                                <td className="p-4 text-muted text-sm truncate max-w-xs">{cafe.address}</td>
                                <td className="p-4 text-right">
                                    <div className="inline-flex items-center gap-2 justify-end">
                                        <button onClick={() => handleRestoreCafe(cafe)} disabled={isProcessing} className="p-2 text-green-600 bg-green-100 dark:bg-green-500/20 rounded-full hover:bg-green-200 transition-colors" title="Pulihkan"><ArrowPathIcon className="h-5 w-5" /></button>
                                        <button onClick={() => setItemToDelete({ id: cafe.id, type: 'cafe', name: cafe.name })} disabled={isProcessing} className="p-2 text-red-500 bg-red-100 dark:bg-red-500/20 rounded-full hover:bg-red-200 transition-colors" title="Hapus Permanen"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {activeTab === 'users' && (paginatedList as Profile[]).map(user => (
                            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                <td className="p-4 font-semibold text-primary dark:text-gray-200">{user.username}</td>
                                <td className="p-4 text-muted text-sm">{user.email} • <span className="uppercase text-xs font-bold">{user.role}</span></td>
                                <td className="p-4 text-right">
                                    <div className="inline-flex items-center gap-2 justify-end">
                                        <button onClick={() => handleRestoreUser(user)} disabled={isProcessing} className="p-2 text-green-600 bg-green-100 dark:bg-green-500/20 rounded-full hover:bg-green-200 transition-colors" title="Pulihkan"><ArrowPathIcon className="h-5 w-5" /></button>
                                        <button onClick={() => setItemToDelete({ id: user.id, type: 'user', name: user.username })} disabled={isProcessing} className="p-2 text-red-500 bg-red-100 dark:bg-red-500/20 rounded-full hover:bg-red-200 transition-colors" title="Hapus Permanen"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {activeTab === 'cafes' && (paginatedList as Cafe[]).map(cafe => (
                    <div key={cafe.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{cafe.name}</h3>
                                <p className="text-sm text-muted line-clamp-1">{cafe.address}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-border justify-end">
                                <button onClick={() => handleRestoreCafe(cafe)} disabled={isProcessing} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full border border-green-200"><ArrowPathIcon className="h-5 w-5" /></button>
                                <button onClick={() => setItemToDelete({ id: cafe.id, type: 'cafe', name: cafe.name })} disabled={isProcessing} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full border border-red-200"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
                {activeTab === 'users' && (paginatedList as Profile[]).map(user => (
                     <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{user.username}</h3>
                                <p className="text-sm text-muted">{user.email}</p>
                                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-gray-200 dark:bg-gray-600 rounded-full uppercase">{user.role}</span>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-border justify-end">
                                <button onClick={() => handleRestoreUser(user)} disabled={isProcessing} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full border border-green-200"><ArrowPathIcon className="h-5 w-5" /></button>
                                <button onClick={() => setItemToDelete({ id: user.id, type: 'user', name: user.username })} disabled={isProcessing} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full border border-red-200"><TrashIcon className="h-5 w-5" /></button>
                        </div>
                    </div>
                ))}
                 {paginatedList.length === 0 && (
                    <div className="text-center p-10 bg-soft dark:bg-gray-700/50 rounded-xl border border-border">
                        <InboxIcon className="mx-auto h-10 w-10 text-muted mb-2" />
                        <span className="font-semibold text-muted">Arsip Kosong</span>
                    </div>
                )}
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

            {itemToDelete && (
                <ConfirmationModal
                    title="Hapus Permanen"
                    message={`Apakah Anda yakin ingin menghapus ${itemToDelete.type === 'cafe' ? 'kafe' : 'user'} "${itemToDelete.name}" secara permanen? Data tidak dapat dikembalikan.`}
                    confirmText="Ya, Hapus Selamanya"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setItemToDelete(null)}
                    isConfirming={isProcessing}
                />
            )}
        </div>
    );
};

export default ArchivePanel;
