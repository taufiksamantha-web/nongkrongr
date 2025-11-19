
import React, { useState, useEffect, useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
import { userService } from '../../services/userService';
import { Cafe, Profile } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import { ArchiveBoxIcon, ArrowPathIcon, TrashIcon, BuildingStorefrontIcon, UserCircleIcon } from '@heroicons/react/24/solid';

const ArchivePanel: React.FC = () => {
    const { getArchivedCafes, restoreCafe, deleteCafe } = useContext(CafeContext)!;
    
    const [activeTab, setActiveTab] = useState<'cafes' | 'users'>('cafes');
    const [archivedUsers, setArchivedUsers] = useState<Profile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'cafe' | 'user'; name: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

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

    useEffect(() => {
        if (activeTab === 'users') {
            fetchArchivedUsers();
        }
    }, [activeTab]);

    const archivedCafes = getArchivedCafes();

    const handleRestoreCafe = async (cafe: Cafe) => {
        setIsProcessing(true);
        const { error } = await restoreCafe(cafe.id);
        if (error) {
            setNotification({ message: `Gagal memulihkan kafe: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Kafe "${cafe.name}" berhasil dipulihkan.`, type: 'success' });
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
            fetchArchivedUsers();
        }
        setIsProcessing(false);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        setIsProcessing(true);

        if (itemToDelete.type === 'cafe') {
            const { error } = await deleteCafe(itemToDelete.id); // Permanent delete
            if (error) {
                setNotification({ message: `Gagal menghapus permanen: ${error.message}`, type: 'error' });
            } else {
                setNotification({ message: `Kafe "${itemToDelete.name}" dihapus permanen.`, type: 'success' });
            }
        } else {
            const { error } = await supabase.from('profiles').delete().eq('id', itemToDelete.id);
            if (error) {
                 setNotification({ message: `Gagal menghapus permanen: ${error.message}`, type: 'error' });
            } else {
                 setNotification({ message: `User "${itemToDelete.name}" dihapus permanen.`, type: 'success' });
                 fetchArchivedUsers();
            }
        }
        setIsProcessing(false);
        setItemToDelete(null);
    };

    return (
        <div>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex items-center gap-3 mb-6">
                <ArchiveBoxIcon className="h-8 w-8 text-gray-500" />
                <h2 className="text-2xl font-bold font-jakarta">Arsip Data</h2>
            </div>

            <div className="flex border-b border-border mb-6">
                <button
                    onClick={() => setActiveTab('cafes')}
                    className={`flex items-center gap-2 px-6 py-3 font-bold border-b-4 transition-colors ${
                        activeTab === 'cafes' ? 'text-brand border-brand' : 'text-muted border-transparent hover:text-primary'
                    }`}
                >
                    <BuildingStorefrontIcon className="h-5 w-5" />
                    Kafe Terhapus ({archivedCafes.length})
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-6 py-3 font-bold border-b-4 transition-colors ${
                        activeTab === 'users' ? 'text-brand border-brand' : 'text-muted border-transparent hover:text-primary'
                    }`}
                >
                    <UserCircleIcon className="h-5 w-5" />
                    User Terhapus ({archivedUsers.length})
                </button>
            </div>

            <div className="space-y-4">
                {activeTab === 'cafes' && (
                    archivedCafes.length === 0 ? (
                        <div className="text-center py-8 text-muted">Tidak ada kafe di arsip.</div>
                    ) : (
                        archivedCafes.map(cafe => (
                            <div key={cafe.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{cafe.name}</h3>
                                    <p className="text-sm text-muted">{cafe.address}</p>
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleRestoreCafe(cafe)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 rounded-lg font-semibold hover:bg-green-200 transition-colors disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className="h-4 w-4" /> Pulihkan
                                    </button>
                                    <button 
                                        onClick={() => setItemToDelete({ id: cafe.id, type: 'cafe', name: cafe.name })}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 rounded-lg font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
                                    >
                                        <TrashIcon className="h-4 w-4" /> Hapus Permanen
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}

                {activeTab === 'users' && (
                    isLoading ? <div className="text-center py-8">Memuat...</div> :
                    archivedUsers.length === 0 ? (
                         <div className="text-center py-8 text-muted">Tidak ada user di arsip.</div>
                    ) : (
                        archivedUsers.map(user => (
                            <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl border border-border flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{user.username}</h3>
                                    <p className="text-sm text-muted">{user.email} • {user.role}</p>
                                </div>
                                <div className="flex gap-3">
                                     <button 
                                        onClick={() => handleRestoreUser(user)}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 rounded-lg font-semibold hover:bg-green-200 transition-colors disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className="h-4 w-4" /> Pulihkan
                                    </button>
                                    <button 
                                        onClick={() => setItemToDelete({ id: user.id, type: 'user', name: user.username })}
                                        disabled={isProcessing}
                                        className="flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 rounded-lg font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
                                    >
                                        <TrashIcon className="h-4 w-4" /> Hapus Permanen
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

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