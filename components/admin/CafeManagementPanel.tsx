import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Cafe, User } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';
import { settingsService } from '../../services/settingsService';
import { userService } from '../../services/userService';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import AdminCafeForm from './AdminCafeForm';
import CafeStatisticsModal from './CafeStatisticsModal';
import ChangeOwnerModal from './ChangeOwnerModal';
import ImageWithFallback from '../common/ImageWithFallback';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon, ArrowUpIcon, ArrowDownIcon, TrophyIcon, ClockIcon, ChartBarSquareIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 5;
type SortableKeys = 'name' | 'district' | 'created_at' | 'status';

const SponsorToggle: React.FC<{ cafe: Cafe, onToggle: (cafe: Cafe) => void, disabled: boolean }> = ({ cafe, onToggle, disabled }) => {
    const isSponsored = cafe.isSponsored;
    return (
        <button
            onClick={() => onToggle(cafe)}
            disabled={disabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors disabled:opacity-50 disabled:cursor-wait ${isSponsored ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isSponsored ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
};

const StatusBadge: React.FC<{ status: Cafe['status'] }> = ({ status }) => {
    const styles = {
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-300',
        approved: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300',
        rejected: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300',
    };
    const icons = {
        pending: <ClockIcon className="h-4 w-4" />,
        approved: <CheckCircleIcon className="h-4 w-4" />,
        rejected: <XCircleIcon className="h-4 w-4" />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
            {icons[status]}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};


const CafeManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading, addCafe, updateCafe, deleteCafe, deleteMultipleCafes } = useContext(CafeContext)!;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [statsCafe, setStatsCafe] = useState<Cafe | null>(null);
    const [cafeToChangeOwner, setCafeToChangeOwner] = useState<Cafe | null>(null);
    const [cafeToDelete, setCafeToDelete] = useState<Cafe | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCafeIds, setSelectedCafeIds] = useState<string[]>([]);
    const [isConfirmingMultiDelete, setIsConfirmingMultiDelete] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
    const [cafeOfTheWeekId, setCafeOfTheWeekId] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);

    useEffect(() => {
        const fetchInitialData = async () => {
            const id = await settingsService.getSetting('cafe_of_the_week_id');
            setCafeOfTheWeekId(id);

            if (currentUser?.role === 'admin') {
                try {
                    const users = await userService.getAllUsers();
                    setAllUsers(users);
                } catch (e) {
                    setNotification({ message: 'Gagal memuat daftar pengguna.', type: 'error' });
                }
            }
        };
        fetchInitialData();
    }, [currentUser]);

    const handleSetCafeOfTheWeek = async (cafeId: string) => {
        setIsSaving(true);
        const newId = cafeOfTheWeekId === cafeId ? '' : cafeId; // Unset if already set
        const { error } = await settingsService.updateSetting('cafe_of_the_week_id', newId);
        if (error) {
            setNotification({ message: 'Gagal mengatur Cafe of The Week.', type: 'error' });
        } else {
            setNotification({ message: `Cafe of The Week berhasil diperbarui!`, type: 'success' });
            setCafeOfTheWeekId(newId);
        }
        setIsSaving(false);
    };

    const sortedAndFilteredCafes = useMemo(() => {
        let cafesToDisplay = cafes;
        if (currentUser?.role === 'admin_cafe') {
            cafesToDisplay = cafes.filter(c => c.manager_id === currentUser.id);
        }

        const filtered = cafesToDisplay.filter(cafe =>
            cafe.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aValue: string | number = '';
            let bValue: string | number = '';

            if (sortConfig.key === 'created_at') {
                aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
                bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
            } else {
                aValue = a[sortConfig.key] || '';
                bValue = b[sortConfig.key] || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [cafes, searchQuery, sortConfig, currentUser]);

    const handleSort = (key: SortableKeys) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const handleToggleSponsor = async (cafe: Cafe) => {
        setIsSaving(true);
        const { error } = await updateCafe(cafe.id, { isSponsored: !cafe.isSponsored });
        if (error) {
            setNotification({ message: `Gagal update: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Status sponsor "${cafe.name}" diperbarui.`, type: 'success' });
        }
        setIsSaving(false);
    };

    const handleOpenChangeOwner = (cafe: Cafe) => {
        setCafeToChangeOwner(cafe);
        setIsChangeOwnerModalOpen(true);
    };

    const handleSaveOwner = async (cafeId: string, newOwnerId: string | null) => {
        setIsSaving(true);
        const { error } = await updateCafe(cafeId, { manager_id: newOwnerId === null ? undefined : newOwnerId });
        if (error) {
            setNotification({ message: 'Gagal mengubah owner.', type: 'error' });
        } else {
            setNotification({ message: 'Owner kafe berhasil diperbarui.', type: 'success' });
            setIsChangeOwnerModalOpen(false);
            setCafeToChangeOwner(null);
        }
        setIsSaving(false);
    };

    useEffect(() => {
        setCurrentPage(1);
        setSelectedCafeIds([]); 
    }, [searchQuery, sortConfig]);
    
    useEffect(() => {
        setSelectedCafeIds([]);
    }, [currentPage]);
    
    const totalPages = Math.ceil(sortedAndFilteredCafes.length / ITEMS_PER_PAGE);
    const paginatedCafes = sortedAndFilteredCafes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const handleSave = async (data: Partial<Cafe>) => {
        if (editingCafe) {
            return await updateCafe(editingCafe.id, data);
        }
        return await addCafe(data);
    };

    const handleConfirmDeleteCafe = async () => {
        if (cafeToDelete) {
            setIsSaving(true);
            const { error } = await deleteCafe(cafeToDelete.id);
            if (error) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            } else {
                setNotification({ message: `"${cafeToDelete.name}" berhasil dihapus.`, type: 'success' });
                if (paginatedCafes.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
            }
            setCafeToDelete(null);
            setIsSaving(false);
        }
    };

    const handleSelectAllOnPage = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedCafeIds(e.target.checked ? paginatedCafes.map(c => c.id) : []);
    };
    const handleSelectOne = (cafeId: string) => {
        setSelectedCafeIds(prev => prev.includes(cafeId) ? prev.filter(id => id !== cafeId) : [...prev, cafeId]);
    };
    const handleConfirmMultiDelete = async () => {
        setIsSaving(true);
        const { error } = await deleteMultipleCafes(selectedCafeIds);
        if (error) {
            setNotification({ message: `Terjadi error: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `${selectedCafeIds.length} kafe berhasil dihapus.`, type: 'success' });
            if (paginatedCafes.length - selectedCafeIds.length <= 0 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
            setSelectedCafeIds([]);
        }
        setIsSaving(false);
        setIsConfirmingMultiDelete(false);
    };

    const SortableHeader: React.FC<{ columnKey: SortableKeys; title: string; className?: string }> = ({ columnKey, title, className }) => (
        <button onClick={() => handleSort(columnKey)} className={`flex items-center gap-1 group font-bold text-muted uppercase tracking-wider text-sm ${className}`}>
            {title}
            <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />) : (<ArrowUpIcon className="h-4 w-4" />)}
            </span>
        </button>
    );

    const userCanManage = (cafe: Cafe) => currentUser?.role === 'admin' || currentUser?.id === cafe.manager_id;
    const findUserName = (userId: string | undefined) => allUsers.find(u => u.id === userId)?.username || 'N/A';

    return (
         <>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold font-jakarta">Daftar Cafe</h2>
                <div className="flex items-center gap-4">
                    {selectedCafeIds.length > 0 && currentUser?.role === 'admin' && (<button onClick={() => setIsConfirmingMultiDelete(true)} className="bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-colors" disabled={isSaving}>{isSaving ? 'Menghapus...' : `Hapus Terpilih (${selectedCafeIds.length})`}</button>)}
                    <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-brand text-white font-bold py-2 px-6 rounded-2xl hover:bg-brand/90 transition-colors">+ Tambah Cafe</button>
                </div>
            </div>
            
            <div className="relative mb-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" placeholder="Cari cafe..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-3 pl-11 rounded-xl border border-border bg-soft dark:bg-gray-700/50 text-primary dark:text-white placeholder-muted focus:ring-2 focus:ring-brand transition-colors"/>
            </div>

            {loading ? (
                 <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center p-4 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse h-[88px]"><div className="w-20 h-14 bg-gray-300 dark:bg-gray-700 rounded-lg"></div><div className="ml-4 flex-1 space-y-2"><div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div><div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div></div></div>))}</div>
            ) : sortedAndFilteredCafes.length === 0 ? (
                <div className="text-center py-10 bg-soft dark:bg-gray-700/50 rounded-2xl border border-border"><InboxIcon className="mx-auto h-12 w-12 text-muted" /><p className="mt-4 text-xl font-bold font-jakarta text-primary dark:text-gray-200">{searchQuery ? 'Kafe Tidak Ditemukan' : 'Belum Ada Kafe'}</p><p className="text-muted mt-2 max-w-xs mx-auto">{searchQuery ? `Tidak ada hasil yang cocok untuk "${searchQuery}".` : 'Klik tombol "+ Tambah Cafe" untuk memulai.'}</p></div>
            ) : (
                <div className="space-y-4">
                    <div className={`hidden lg:grid ${currentUser?.role === 'admin' ? 'grid-cols-[auto_6rem_1fr_auto_auto_auto]' : 'grid-cols-[6rem_1fr_auto_auto_auto]'} items-center gap-3 px-4 py-3 border-b-2 border-border`}>
                        {currentUser?.role === 'admin' && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition" onChange={handleSelectAllOnPage} checked={paginatedCafes.length > 0 && paginatedCafes.every(c => selectedCafeIds.includes(c.id))} aria-label="Pilih semua cafe di halaman ini"/>}
                        <span className="text-sm font-bold text-muted uppercase tracking-wider pl-2">Image</span>
                        <SortableHeader columnKey="name" title="Nama Kafe" />
                        <SortableHeader columnKey="status" title="Status" />
                        <span className="text-sm font-bold text-muted uppercase tracking-wider">Sponsored</span>
                        <span className="text-sm font-bold text-muted uppercase tracking-wider text-right">Aksi</span>
                    </div>

                    {paginatedCafes.map(cafe => (
                        <div key={cafe.id} className="bg-card dark:bg-gray-800/50 rounded-2xl border border-border transition-shadow hover:shadow-lg">
                           <div className="p-4 lg:hidden">
                                <div className="flex items-start gap-4 flex-grow min-w-0">
                                    {userCanManage(cafe) && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition mt-1" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                    <ImageWithFallback src={cafe.coverUrl} alt={cafe.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" width={100} height={100} />
                                    <div className="min-w-0">
                                        <button onClick={() => { if (userCanManage(cafe)) { setEditingCafe(cafe); setIsFormOpen(true); }}} className="text-left w-full group disabled:cursor-default" disabled={!userCanManage(cafe)}>
                                            <p className="font-bold text-lg text-primary dark:text-white truncate group-hover:underline">{cafe.name}</p>
                                        </button>
                                        <div className="text-xs text-muted mt-1 space-y-0.5">
                                            <p>Owner: <span className="font-semibold">{findUserName(cafe.manager_id)}</span></p>
                                            <p>Dibuat oleh: <span className="font-semibold">{findUserName(cafe.created_by)}</span></p>
                                        </div>
                                        <div className="mt-2"><StatusBadge status={cafe.status} /></div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">Sponsored:</span>
                                        {currentUser?.role === 'admin' ? <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} /> : (cafe.isSponsored ? <CheckCircleIcon className="h-5 w-5 text-green-500"/> : <XCircleIcon className="h-5 w-5 text-red-500"/>)}
                                    </div>
                                    <div className="flex gap-2">
                                        {currentUser?.role === 'admin' && <button onClick={() => handleOpenChangeOwner(cafe)} className="text-blue-500 p-1 rounded-full hover:bg-blue-100" title="Ubah Owner"><PencilSquareIcon className="h-6 w-6" /></button>}
                                        <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="text-blue-500 p-1 rounded-full hover:bg-blue-100" title="Lihat Statistik"><ChartBarSquareIcon className="h-6 w-6" /></button>
                                        {userCanManage(cafe) && <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink p-1 rounded-full hover:bg-red-100" title="Hapus Cafe"><TrashIcon className="h-6 w-6"/></button>}
                                    </div>
                                </div>
                            </div>
                           
                            <div className={`hidden lg:grid ${currentUser?.role === 'admin' ? 'grid-cols-[auto_6rem_1fr_auto_auto_auto]' : 'grid-cols-[6rem_1fr_auto_auto_auto]'} items-center gap-3 px-4 py-3`}>
                                 {currentUser?.role === 'admin' && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                 <ImageWithFallback src={cafe.coverUrl} alt={cafe.name} className="w-20 h-14 object-cover rounded-lg" width={150} height={100} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                     {currentUser?.role === 'admin' && (
                                        <button onClick={() => handleSetCafeOfTheWeek(cafe.id)} disabled={isSaving || cafe.status !== 'approved'} title={cafe.status !== 'approved' ? 'Hanya kafe yang disetujui bisa jadi Cafe of the Week' : 'Set as Cafe of the Week'} className={`p-1 rounded-full transition-colors disabled:opacity-50 ${cafeOfTheWeekId === cafe.id ? 'text-accent-amber' : 'text-muted hover:text-accent-amber'}`}>
                                            <TrophyIcon className="h-5 w-5" />
                                        </button>
                                     )}
                                    <button onClick={() => { if(userCanManage(cafe)) { setEditingCafe(cafe); setIsFormOpen(true); }}} className="text-left w-full group disabled:cursor-default" disabled={!userCanManage(cafe)}>
                                        <p className="font-semibold text-primary dark:text-gray-200 truncate group-hover:underline">{cafe.name}</p>
                                    </button>
                                    </div>
                                    <div className="text-xs text-muted mt-1">
                                        Owner: <span className="font-semibold">{findUserName(cafe.manager_id)}</span>
                                        {currentUser?.role === 'admin' && 
                                            <button onClick={() => handleOpenChangeOwner(cafe)} className="ml-2 text-blue-500 hover:underline text-xs font-bold">[Ubah]</button>
                                        }
                                        <br />
                                        Dibuat oleh: <span className="font-semibold">{findUserName(cafe.created_by)}</span>
                                    </div>
                                </div>
                                <div className="truncate"><StatusBadge status={cafe.status} /></div>
                                <div className="flex items-center justify-center gap-2">
                                    {currentUser?.role === 'admin' ? <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} /> : (cafe.isSponsored ? <CheckCircleIcon className="h-6 w-6 text-green-500"/> : <XCircleIcon className="h-6 w-6 text-red-500"/>)}
                                </div>
                                <div className="text-right flex items-center justify-end gap-3">
                                    <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="text-blue-500 hover:text-blue-700 p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors" title="Lihat Statistik"><ChartBarSquareIcon className="h-6 w-6" /></button>
                                    {userCanManage(cafe) && <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors" title="Hapus Cafe"><TrashIcon className="h-6 w-6" /></button>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"><ChevronLeftIcon className="h-5 w-5"/>Sebelumnya</button>
                    <span className="font-semibold text-muted text-sm order-first sm:order-none">Halaman {currentPage} dari {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">Selanjutnya<ChevronRightIcon className="h-5 w-5" /></button>
                </div>
            )}

            {isFormOpen && <AdminCafeForm 
                cafe={editingCafe} 
                userRole={currentUser!.role} 
                onSave={handleSave} 
                onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} 
                setNotification={setNotification}
                onSuccess={() => {
                    setIsFormOpen(false);
                    setEditingCafe(null);
                    const successMessage = editingCafe 
                        ? 'Kafe berhasil diperbarui!' 
                        : (currentUser?.role === 'admin'
                            ? 'Kafe baru berhasil ditambahkan!'
                            : 'Kafe baru berhasil ditambahkan dan sedang menunggu persetujuan admin!');
                    setNotification({ message: successMessage, type: 'success' });
                }}
            />}
            {isStatsModalOpen && statsCafe && <CafeStatisticsModal cafe={statsCafe} onClose={() => setIsStatsModalOpen(false)} />}
            {isChangeOwnerModalOpen && cafeToChangeOwner && <ChangeOwnerModal cafe={cafeToChangeOwner} users={allUsers} onSave={handleSaveOwner} onCancel={() => setIsChangeOwnerModalOpen(false)} isSaving={isSaving}/>}
            {cafeToDelete && userCanManage(cafeToDelete) && <ConfirmationModal title="Hapus Cafe" message={`Yakin ingin menghapus "${cafeToDelete.name}"? Ini akan menghapus semua data terkait. Tindakan ini tidak dapat diurungkan.`} onConfirm={handleConfirmDeleteCafe} onCancel={() => setCafeToDelete(null)} isConfirming={isSaving}/>}
            {isConfirmingMultiDelete && currentUser?.role === 'admin' && <ConfirmationModal title={`Hapus ${selectedCafeIds.length} Kafe`} message={`Yakin ingin menghapus ${selectedCafeIds.length} kafe yang dipilih? Tindakan ini tidak dapat diurungkan.`} onConfirm={handleConfirmMultiDelete} onCancel={() => setIsConfirmingMultiDelete(false)} confirmText={`Ya, Hapus (${selectedCafeIds.length})`} isConfirming={isSaving}/>}
        </>
    )
}

export default CafeManagementPanel;