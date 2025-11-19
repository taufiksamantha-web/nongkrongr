
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
import { DEFAULT_COVER_URL } from '../../constants';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon, ArrowUpIcon, ArrowDownIcon, TrophyIcon, ClockIcon, ChartBarSquareIcon, TrashIcon, PencilSquareIcon, ArchiveBoxArrowDownIcon, MapPinIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 10;
type SortableKeys = 'name' | 'district' | 'created_at' | 'status' | 'manager_id';

const SponsorToggle: React.FC<{ cafe: Cafe, onToggle: (cafe: Cafe) => void, disabled: boolean }> = ({ cafe, onToggle, disabled }) => {
    const isSponsored = cafe.isSponsored;
    return (
        <button
            onClick={() => onToggle(cafe)}
            disabled={disabled}
            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors disabled:opacity-50 disabled:cursor-wait flex-shrink-0 ${isSponsored ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
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
        archived: 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300',
    };
    const icons = {
        pending: <ClockIcon className="h-3.5 w-3.5" />,
        approved: <CheckCircleIcon className="h-3.5 w-3.5" />,
        rejected: <XCircleIcon className="h-3.5 w-3.5" />,
        archived: <ArchiveBoxArrowDownIcon className="h-3.5 w-3.5" />,
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border border-transparent whitespace-nowrap ${styles[status]}`}>
            {icons[status]}
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
};


const CafeManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading, addCafe, updateCafe, archiveCafe, deleteCafe, deleteMultipleCafes } = useContext(CafeContext)!;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [statsCafe, setStatsCafe] = useState<Cafe | null>(null);
    const [cafeToChangeOwner, setCafeToChangeOwner] = useState<Cafe | null>(null);
    
    // Action States
    const [cafeToArchive, setCafeToArchive] = useState<Cafe | null>(null);
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
        // Filter out archived cafes immediately
        let cafesToDisplay = cafes.filter(c => c.status !== 'archived');
        
        if (currentUser?.role === 'admin_cafe') {
            cafesToDisplay = cafesToDisplay.filter(c => c.manager_id === currentUser.id);
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

    // SOFT DELETE (Archive)
    const handleArchiveCafe = async () => {
        if (cafeToArchive) {
            setIsSaving(true);
            const { error } = await archiveCafe(cafeToArchive.id);
            if (error) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            } else {
                setNotification({ message: `"${cafeToArchive.name}" berhasil diarsipkan.`, type: 'success' });
                if (paginatedCafes.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
            }
            setCafeToArchive(null);
            setIsSaving(false);
        }
    };

    // HARD DELETE (Permanent)
    const handleDeletePermanent = async () => {
        if (cafeToDelete) {
            setIsSaving(true);
            const { error } = await deleteCafe(cafeToDelete.id);
             if (error) {
                setNotification({ message: `Gagal menghapus: ${error.message}`, type: 'error' });
            } else {
                setNotification({ message: `"${cafeToDelete.name}" dihapus permanen.`, type: 'success' });
                if (paginatedCafes.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
            }
            setCafeToDelete(null);
            setIsSaving(false);
        }
    }

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
        <button onClick={() => handleSort(columnKey)} className={`flex items-center gap-1 group font-bold text-muted uppercase tracking-wider text-xs ${className}`}>
            {title}
            <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />) : (<ArrowUpIcon className="h-3 w-3" />)}
            </span>
        </button>
    );

    const userCanManage = (cafe: Cafe) => currentUser?.role === 'admin' || currentUser?.id === cafe.manager_id;
    const findUserName = (userId: string | undefined) => allUsers.find(u => u.id === userId)?.username || 'N/A';

    // Grid Configuration
    const isAdmin = currentUser?.role === 'admin';
    // Grid Desktop/Tablet: Checkbox | Info | Owner | Status | Sponsor
    // Admin removed image col, others keep it
    const gridColsClass = isAdmin 
        ? 'grid-cols-[40px_2fr_1.5fr_120px_150px]' 
        : 'grid-cols-[60px_2fr_120px_150px]';

    return (
         <>
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-2xl font-bold font-jakarta">Daftar Cafe <span className="text-muted text-lg font-normal">({sortedAndFilteredCafes.length})</span></h2>
                <div className="flex items-center gap-4">
                    {selectedCafeIds.length > 0 && currentUser?.role === 'admin' && (<button onClick={() => setIsConfirmingMultiDelete(true)} className="bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-colors text-sm" disabled={isSaving}>{isSaving ? 'Menghapus...' : `Hapus Terpilih (${selectedCafeIds.length})`}</button>)}
                    <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-brand text-white font-bold py-2 px-6 rounded-2xl hover:bg-brand/90 transition-colors text-sm">+ Tambah Cafe</button>
                </div>
            </div>
            
            <div className="relative mb-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="text" placeholder="Cari cafe berdasarkan nama..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full p-3 pl-11 rounded-xl border border-border bg-soft dark:bg-gray-700/50 text-primary dark:text-white placeholder-muted focus:ring-2 focus:ring-brand transition-colors"/>
            </div>

            {loading ? (
                 <div className="space-y-4">{[...Array(3)].map((_, i) => (<div key={i} className="flex items-center p-4 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse h-[60px]"><div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div><div className="ml-auto h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div></div>))}</div>
            ) : sortedAndFilteredCafes.length === 0 ? (
                <div className="text-center py-10 bg-soft dark:bg-gray-700/50 rounded-2xl border border-border"><InboxIcon className="mx-auto h-12 w-12 text-muted" /><p className="mt-4 text-xl font-bold font-jakarta text-primary dark:text-gray-200">{searchQuery ? 'Kafe Tidak Ditemukan' : 'Belum Ada Kafe'}</p><p className="text-muted mt-2 max-w-xs mx-auto">{searchQuery ? `Tidak ada hasil yang cocok untuk "${searchQuery}".` : 'Klik tombol "+ Tambah Cafe" untuk memulai.'}</p></div>
            ) : (
                <div className="space-y-4">
                    {/* Table Header (Tablet & Desktop) */}
                    <div className={`hidden md:grid ${gridColsClass} items-center gap-4 px-6 py-3 border-b-2 border-border bg-soft/30 rounded-t-xl`}>
                        {isAdmin && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition cursor-pointer" onChange={handleSelectAllOnPage} checked={paginatedCafes.length > 0 && paginatedCafes.every(c => selectedCafeIds.includes(c.id))} aria-label="Pilih semua cafe di halaman ini"/>}
                        {!isAdmin && <span className="text-xs font-bold text-muted uppercase tracking-wider">Gambar</span>}
                        <SortableHeader columnKey="name" title="Informasi Cafe" />
                        {isAdmin && <SortableHeader columnKey="manager_id" title="Owner" />}
                        <div className="flex justify-center"><SortableHeader columnKey="status" title="Status" /></div>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider text-center">Sponsor</span>
                        {/* Actions Header Removed as it is now a footer row */}
                    </div>

                    {paginatedCafes.map(cafe => (
                        <div key={cafe.id} className="bg-card dark:bg-gray-800/50 rounded-2xl border border-border transition-shadow hover:shadow-lg overflow-hidden">
                           
                           {/* Mobile View (Simplified List) */}
                           <div className="p-4 md:hidden flex flex-col gap-3">
                                {/* Row 1: Image (Only for Managers), Name & COTW */}
                                <div className="flex items-start gap-3">
                                     {!isAdmin && (
                                         <div className="flex-shrink-0 relative">
                                            <ImageWithFallback 
                                                src={cafe.coverUrl} 
                                                defaultSrc={DEFAULT_COVER_URL} 
                                                alt={cafe.name} 
                                                className="w-20 h-20 object-cover rounded-lg border border-border"
                                                width={80}
                                                height={80}
                                            />
                                            {cafeOfTheWeekId === cafe.id && (
                                                <div className="absolute -top-2 -right-2 bg-accent-amber text-white p-1 rounded-full shadow-md" title="Cafe of The Week">
                                                    <TrophyIcon className="h-4 w-4" />
                                                </div>
                                            )}
                                         </div>
                                     )}
                                     
                                     <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-center gap-2">
                                                {userCanManage(cafe) && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition flex-shrink-0" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                                <button onClick={() => { if (userCanManage(cafe)) { setEditingCafe(cafe); setIsFormOpen(true); }}} className="text-left group disabled:cursor-default" disabled={!userCanManage(cafe)}>
                                                    <p className="font-bold text-lg text-primary dark:text-white break-words whitespace-normal leading-tight group-hover:underline line-clamp-2">{cafe.name}</p>
                                                </button>
                                            </div>
                                            {isAdmin ? (
                                                <button onClick={() => handleSetCafeOfTheWeek(cafe.id)} disabled={isSaving || cafe.status !== 'approved'} className={`p-1 rounded-full transition-colors flex-shrink-0 ${cafeOfTheWeekId === cafe.id ? 'bg-accent-amber/20 text-accent-amber' : 'text-muted/30'}`} title="Set as Cafe of the Week">
                                                    <TrophyIcon className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                 /* Only show icon on mobile for managers if their cafe is COTW, but positioned relative to name since image might be present */
                                                 cafeOfTheWeekId === cafe.id && (
                                                    <div className="bg-accent-amber text-white p-1 rounded-full shadow-md flex-shrink-0" title="Cafe of The Week">
                                                        <TrophyIcon className="h-4 w-4" />
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 text-sm text-muted mt-1">
                                            <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" /> 
                                            <span className="truncate">{cafe.district}, {cafe.city}</span>
                                        </div>
                                        
                                        {/* Cafe of the week label for managers visual */}
                                        {cafeOfTheWeekId === cafe.id && (
                                            <span className="inline-block mt-1 text-[10px] font-bold bg-gradient-to-r from-accent-amber to-yellow-400 text-white px-2 py-0.5 rounded-full shadow-sm">
                                                🏆 Cafe of The Week
                                            </span>
                                        )}
                                     </div>
                                </div>
                                
                                {/* Row 2: Owner (Admin Only) */}
                                {isAdmin && (
                                    <div className="flex items-center gap-2 text-sm bg-soft dark:bg-gray-700/30 p-2 rounded-lg w-full">
                                        <span className="text-muted text-xs">Owner:</span>
                                        <span className="font-semibold text-primary dark:text-gray-300 truncate flex-1">{findUserName(cafe.manager_id)}</span>
                                        <button onClick={() => handleOpenChangeOwner(cafe)} className="text-blue-500 hover:underline text-xs font-bold flex-shrink-0">
                                            Ubah
                                        </button>
                                    </div>
                                )}

                                {/* Row 3: Status & Sponsor */}
                                <div className="flex items-center justify-between">
                                    <StatusBadge status={cafe.status} />
                                    {isAdmin ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted font-semibold uppercase">Sponsored</span>
                                            <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} />
                                        </div>
                                    ) : (
                                        cafe.isSponsored && <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">SPONSORED</span>
                                    )}
                                </div>

                                {/* Row 4: Actions (Footer) */}
                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
                                     <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg font-bold" title="Statistik">
                                        <ChartBarSquareIcon className="h-4 w-4" /> Stats
                                    </button>
                                    {userCanManage(cafe) && (
                                        <>
                                            <button onClick={() => setCafeToArchive(cafe)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg font-bold" title="Arsipkan">
                                                <ArchiveBoxArrowDownIcon className="h-4 w-4"/> Arsip
                                            </button>
                                            {isAdmin && (
                                                 <button onClick={() => setCafeToDelete(cafe)} className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg font-bold" title="Hapus">
                                                    <TrashIcon className="h-4 w-4"/> Hapus
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                           </div>
                           
                            {/* Tablet & Desktop View (Data Grid + Action Footer) */}
                            <div className="hidden md:flex flex-col">
                                {/* Top Data Row */}
                                <div className={`grid ${gridColsClass} items-center gap-4 px-6 py-4`}>
                                     {isAdmin && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition cursor-pointer" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                    
                                    {/* Image Column - Only for Managers */}
                                    {!isAdmin && (
                                        <div className="w-12 h-12 flex-shrink-0">
                                            <ImageWithFallback 
                                                src={cafe.coverUrl} 
                                                defaultSrc={DEFAULT_COVER_URL} 
                                                alt={cafe.name} 
                                                className="w-full h-full object-cover rounded-lg border border-border"
                                                width={48}
                                                height={48}
                                            />
                                        </div>
                                    )}

                                    {/* Name & Location Combined */}
                                    <div className="min-w-0 flex flex-col justify-center">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => { if(userCanManage(cafe)) { setEditingCafe(cafe); setIsFormOpen(true); }}} className="text-left group disabled:cursor-default mb-0.5" disabled={!userCanManage(cafe)}>
                                                <p className="font-bold text-lg text-primary dark:text-gray-200 break-words whitespace-normal leading-tight group-hover:underline line-clamp-2">{cafe.name}</p>
                                            </button>
                                            {cafeOfTheWeekId === cafe.id && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-accent-amber to-yellow-400 text-white text-[10px] font-bold shadow-sm flex-shrink-0">
                                                    <TrophyIcon className="h-3 w-3" /> COTW
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-muted">
                                            <MapPinIcon className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{cafe.district}, {cafe.city}</span>
                                        </div>
                                    </div>

                                    {/* Owner Column */}
                                    {isAdmin && (
                                        <div className="text-sm text-muted break-words flex flex-col items-start">
                                            <span className="font-medium text-primary dark:text-gray-300 line-clamp-1 text-base">{findUserName(cafe.manager_id)}</span>
                                            <button onClick={() => handleOpenChangeOwner(cafe)} className="text-blue-500 hover:underline text-xs font-bold mt-0.5">Ubah Owner</button>
                                        </div>
                                    )}

                                    {/* Status Column */}
                                    <div className="flex justify-center"><StatusBadge status={cafe.status} /></div>
                                    
                                    {/* Sponsor & COTW Column */}
                                    <div className="flex items-center justify-center gap-3">
                                        {isAdmin ? (
                                            <>
                                                <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} />
                                                <button onClick={() => handleSetCafeOfTheWeek(cafe.id)} disabled={isSaving || cafe.status !== 'approved'} title={cafe.status !== 'approved' ? 'Hanya kafe yang disetujui bisa jadi Cafe of The Week' : 'Set as Cafe of the Week'} className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${cafeOfTheWeekId === cafe.id ? 'bg-accent-amber/20 text-accent-amber' : 'text-muted hover:text-accent-amber hover:bg-accent-amber/10'}`}>
                                                    <TrophyIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        ) : (
                                            cafe.isSponsored ? <CheckCircleIcon className="h-6 w-6 text-green-500"/> : <XCircleIcon className="h-6 w-6 text-red-500"/>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Bottom Action Row */}
                                <div className="flex items-center justify-end gap-2 px-6 py-3 bg-soft/30 border-t border-border/50">
                                    <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors">
                                        <ChartBarSquareIcon className="h-4 w-4" /> Statistik
                                    </button>
                                    {userCanManage(cafe) && (
                                        <>
                                            <button onClick={() => setCafeToArchive(cafe)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 transition-colors">
                                                <ArchiveBoxArrowDownIcon className="h-4 w-4"/> Arsip
                                            </button>
                                            {isAdmin && (
                                                <button onClick={() => setCafeToDelete(cafe)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors">
                                                    <TrashIcon className="h-4 w-4"/> Hapus
                                                </button>
                                            )}
                                        </>
                                    )}
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
            
            {/* Confirmation Modals */}
            {cafeToArchive && <ConfirmationModal title="Arsipkan Cafe" message={`Apakah Anda ingin mengarsipkan "${cafeToArchive.name}"? Data akan disembunyikan dari publik namun dapat dipulihkan nanti.`} onConfirm={handleArchiveCafe} onCancel={() => setCafeToArchive(null)} isConfirming={isSaving} confirmText="Ya, Arsipkan"/>}
            {cafeToDelete && <ConfirmationModal title="Hapus Permanen" message={`PERINGATAN: Anda akan menghapus "${cafeToDelete.name}" secara permanen. Data statistik dan review akan hilang selamanya. Lanjutkan?`} onConfirm={handleDeletePermanent} onCancel={() => setCafeToDelete(null)} isConfirming={isSaving} confirmText="Hapus Selamanya" cancelText="Batal"/>}
            {isConfirmingMultiDelete && isAdmin && <ConfirmationModal title={`Hapus ${selectedCafeIds.length} Kafe`} message={`Yakin ingin menghapus ${selectedCafeIds.length} kafe yang dipilih? Tindakan ini tidak dapat diurungkan.`} onConfirm={handleConfirmMultiDelete} onCancel={() => setIsConfirmingMultiDelete(false)} confirmText={`Ya, Hapus (${selectedCafeIds.length})`} isConfirming={isSaving}/>}
        </>
    )
}

export default CafeManagementPanel;
