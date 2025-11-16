import React, { useState, useContext, useMemo, useEffect } from 'react';
import { Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';
import { settingsService } from '../../services/settingsService';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import AdminCafeForm from './AdminCafeForm';
import CafeStatisticsModal from './CafeStatisticsModal';
import ImageWithFallback from '../common/ImageWithFallback';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon, ArrowUpIcon, ArrowDownIcon, TrophyIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 5;
type SortableKeys = 'name' | 'district' | 'created_at';

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

const CafeManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading, addCafe, updateCafe, deleteCafe } = useContext(CafeContext)!;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [statsCafe, setStatsCafe] = useState<Cafe | null>(null);
    const [cafeToDelete, setCafeToDelete] = useState<Cafe | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCafeIds, setSelectedCafeIds] = useState<string[]>([]);
    const [isConfirmingMultiDelete, setIsConfirmingMultiDelete] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
    const [cafeOfTheWeekId, setCafeOfTheWeekId] = useState<string | null>(null);

    const fetchCafeOfTheWeek = async () => {
        const id = await settingsService.getSetting('cafe_of_the_week_id');
        setCafeOfTheWeekId(id);
    };
    
    useEffect(() => {
        fetchCafeOfTheWeek();
    }, []);

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
        const filtered = cafes.filter(cafe =>
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
    }, [cafes, searchQuery, sortConfig]);

    const handleSort = (key: SortableKeys) => {
        setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const handleToggleSponsor = async (cafe: Cafe) => {
        setIsSaving(true);
        try {
            await updateCafe(cafe.id, { isSponsored: !cafe.isSponsored });
            setNotification({ message: `Status sponsor "${cafe.name}" diperbarui.`, type: 'success' });
        } catch (error: any) {
            setNotification({ message: `Gagal update: ${error.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
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

    const handleSave = async (data: any) => {
        setIsSaving(true);
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
            setNotification({ message: `Gagal menyimpan: ${error.message}`, type: 'error' });
            return Promise.reject(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeleteCafe = async () => {
        if (cafeToDelete) {
            setIsSaving(true);
            try {
                await deleteCafe(cafeToDelete.id);
                setNotification({ message: `"${cafeToDelete.name}" berhasil dihapus.`, type: 'success' });
                if (paginatedCafes.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
            } catch (error: any) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            } finally {
                setCafeToDelete(null);
                setIsSaving(false);
            }
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
        try {
            const results = await Promise.allSettled(selectedCafeIds.map(id => deleteCafe(id)));
            const successes = results.filter(r => r.status === 'fulfilled').length;
            if (successes > 0) setNotification({ message: `${successes} kafe berhasil dihapus.`, type: 'success' });
            if (paginatedCafes.length - successes <= 0 && currentPage > 1) setCurrentPage(currentPage - 1);
            setSelectedCafeIds([]);
        } catch (error: any) {
            setNotification({ message: `Terjadi error: ${error.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
            setIsConfirmingMultiDelete(false);
        }
    };

    const SortableHeader: React.FC<{ columnKey: SortableKeys; title: string; className?: string }> = ({ columnKey, title, className }) => (
        <button onClick={() => handleSort(columnKey)} className={`flex items-center gap-1 group font-bold text-muted uppercase tracking-wider text-sm ${className}`}>
            {title}
            <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                {sortConfig.key === columnKey ? (sortConfig.direction === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />) : (<ArrowUpIcon className="h-4 w-4" />)}
            </span>
        </button>
    );

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
                    <div className="hidden lg:grid grid-cols-[auto_6rem_minmax(0,3fr)_1fr_1fr_1.5fr_minmax(0,1.5fr)] items-center gap-4 px-4 py-2 border-b-2 border-border">
                        {currentUser?.role === 'admin' && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition" onChange={handleSelectAllOnPage} checked={paginatedCafes.length > 0 && paginatedCafes.every(c => selectedCafeIds.includes(c.id))} aria-label="Pilih semua cafe di halaman ini"/>}
                        <span className="text-sm font-bold text-muted uppercase tracking-wider pl-2">Image</span>
                        <SortableHeader columnKey="name" title="Nama Kafe" className={currentUser?.role !== 'admin' ? 'lg:col-start-2' : ''} />
                        <SortableHeader columnKey="district" title="Kecamatan" />
                        <span className="text-sm font-bold text-muted uppercase tracking-wider">Reviews</span>
                        <span className="text-sm font-bold text-muted uppercase tracking-wider">Sponsored</span>
                        <span className="text-sm font-bold text-muted uppercase tracking-wider text-right">Aksi</span>
                    </div>

                    {paginatedCafes.map(cafe => (
                        <div key={cafe.id} className="bg-card dark:bg-gray-800/50 rounded-2xl border border-border transition-shadow hover:shadow-lg">
                           <div className="p-4 lg:hidden">
                                <div className="flex items-start gap-4 flex-grow min-w-0">
                                    {currentUser?.role === 'admin' && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition mt-1" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                    <ImageWithFallback src={cafe.coverUrl} alt={cafe.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" width={100} height={100} />
                                    <div className="min-w-0">
                                        <button onClick={() => { setEditingCafe(cafe); setIsFormOpen(true); }} className="text-left w-full group">
                                            <p className="font-bold text-lg text-primary dark:text-white truncate group-hover:underline">{cafe.name}</p>
                                        </button>
                                        <p className="text-sm text-muted">{cafe.district}</p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-sm font-semibold">Sponsored:</span>
                                            {currentUser?.role === 'admin' ? <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} /> : (cafe.isSponsored ? <CheckCircleIcon className="h-5 w-5 text-green-500"/> : <XCircleIcon className="h-5 w-5 text-red-500"/>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                                    <p className="text-sm text-muted"><strong>Reviews:</strong> {cafe.reviews.length}</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="text-blue-500 font-bold hover:underline">Statistik</button>
                                        {currentUser?.role === 'admin' && <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink font-bold hover:underline">Hapus</button>}
                                    </div>
                                </div>
                            </div>
                           
                            <div className={`hidden lg:grid ${currentUser?.role === 'admin' ? 'grid-cols-[auto_6rem_minmax(0,3fr)_1fr_1fr_1.5fr_minmax(0,1.5fr)]' : 'grid-cols-[6rem_minmax(0,3fr)_1fr_1fr_1.5fr_minmax(0,1.5fr)]'} items-center gap-4 p-4`}>
                                 {currentUser?.role === 'admin' && <input type="checkbox" className="h-5 w-5 rounded border-gray-400 text-brand focus:ring-brand transition" checked={selectedCafeIds.includes(cafe.id)} onChange={() => handleSelectOne(cafe.id)} aria-label={`Pilih ${cafe.name}`}/>}
                                 <ImageWithFallback src={cafe.coverUrl} alt={cafe.name} className="w-20 h-14 object-cover rounded-lg" width={150} height={100} />
                                <div className="min-w-0 flex items-center gap-2">
                                     {currentUser?.role === 'admin' && (
                                        <button onClick={() => handleSetCafeOfTheWeek(cafe.id)} disabled={isSaving} title="Set as Cafe of the Week" className={`p-1 rounded-full transition-colors disabled:opacity-50 ${cafeOfTheWeekId === cafe.id ? 'text-accent-amber' : 'text-muted hover:text-accent-amber'}`}>
                                            <TrophyIcon className="h-5 w-5" />
                                        </button>
                                     )}
                                    <button onClick={() => { setEditingCafe(cafe); setIsFormOpen(true); }} className="text-left w-full group">
                                        <p className="font-semibold text-primary dark:text-gray-200 truncate group-hover:underline">{cafe.name}</p>
                                    </button>
                                </div>
                                <p className="text-muted truncate">{cafe.district}</p>
                                <p className="text-muted text-center">{cafe.reviews.length}</p>
                                <div className="flex items-center gap-2">
                                    {currentUser?.role === 'admin' ? <SponsorToggle cafe={cafe} onToggle={handleToggleSponsor} disabled={isSaving} /> : (cafe.isSponsored ? <CheckCircleIcon className="h-6 w-6 text-green-500"/> : <XCircleIcon className="h-6 w-6 text-red-500"/>)}
                                </div>
                                <div className="text-right space-x-4">
                                    <button onClick={() => { setStatsCafe(cafe); setIsStatsModalOpen(true); }} className="text-blue-500 font-bold hover:underline">Statistik</button>
                                    {currentUser?.role === 'admin' && <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink font-bold hover:underline">Hapus</button>}
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

            {isFormOpen && <AdminCafeForm cafe={editingCafe} userRole={currentUser!.role} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} setNotification={setNotification} />}
            {isStatsModalOpen && statsCafe && <CafeStatisticsModal cafe={statsCafe} onClose={() => setIsStatsModalOpen(false)} />}
            {cafeToDelete && currentUser?.role === 'admin' && <ConfirmationModal title="Hapus Cafe" message={`Yakin ingin menghapus "${cafeToDelete.name}"? Ini akan menghapus semua data terkait. Tindakan ini tidak dapat diurungkan.`} onConfirm={handleConfirmDeleteCafe} onCancel={() => setCafeToDelete(null)} isConfirming={isSaving}/>}
            {isConfirmingMultiDelete && currentUser?.role === 'admin' && <ConfirmationModal title={`Hapus ${selectedCafeIds.length} Kafe`} message={`Yakin ingin menghapus ${selectedCafeIds.length} kafe yang dipilih? Tindakan ini tidak dapat diurungkan.`} onConfirm={handleConfirmMultiDelete} onCancel={() => setIsConfirmingMultiDelete(false)} confirmText={`Ya, Hapus (${selectedCafeIds.length})`} isConfirming={isSaving}/>}
        </>
    )
}

export default CafeManagementPanel;