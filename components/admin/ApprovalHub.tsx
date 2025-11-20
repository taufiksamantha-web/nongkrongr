
import React, { useState, useEffect, useContext } from 'react';
import { Profile, Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { userService } from '../../services/userService';
import { UserGroupIcon, BuildingStorefrontIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon, MapPinIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 10;

const ApprovalHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'cafes'>('users');
    const [filterStatus, setFilterStatus] = useState<'pending' | 'rejected'>('pending');
    
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
    const [rejectedUsers, setRejectedUsers] = useState<Profile[]>([]);
    const [pendingCafes, setPendingCafes] = useState<Cafe[]>([]);
    const [rejectedCafes, setRejectedCafes] = useState<Cafe[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const { getPendingCafes, getRejectedCafes, updateCafeStatus } = useContext(CafeContext)!;

    const fetchPendingData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [pUsers, rUsers] = await Promise.all([
                userService.getPendingApprovalUsers(),
                userService.getRejectedUsers()
            ]);
            const pCafes = getPendingCafes();
            const rCafes = getRejectedCafes();

            setPendingUsers(pUsers);
            setRejectedUsers(rUsers);
            setPendingCafes(pCafes);
            setRejectedCafes(rCafes);
        } catch (err: any) {
            setError('Gagal memuat data persetujuan.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingData();
    }, [getPendingCafes, getRejectedCafes, filterStatus]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, filterStatus]);

    const handleUserApproval = async (userId: string, isApproved: boolean) => {
        setProcessingId(userId);
        const newStatus = isApproved ? 'active' : 'rejected'; 
        const { error } = await userService.updateUserStatus(userId, newStatus);
        if (error) {
            setError(`Gagal memperbarui status user: ${error.message}`);
        } else {
            // Manual Optimistic Update for UI responsiveness
            if (filterStatus === 'pending') {
                const user = pendingUsers.find(u => u.id === userId);
                setPendingUsers(prev => prev.filter(u => u.id !== userId));
                if (user && !isApproved) setRejectedUsers(prev => [...prev, { ...user, status: 'rejected' }]);
            } else {
                // Re-approving a rejected user
                setRejectedUsers(prev => prev.filter(u => u.id !== userId));
            }
        }
        setProcessingId(null);
    };

    const handleCafeApproval = async (cafeId: string, isApproved: boolean) => {
        setProcessingId(cafeId);
        const newStatus = isApproved ? 'approved' : 'rejected';
        const { error } = await updateCafeStatus(cafeId, newStatus);
        if (error) {
            setError(`Gagal memperbarui status kafe: ${error.message}`);
        }
        setProcessingId(null);
    };

    const TabButton: React.FC<{ type: 'users' | 'cafes'; icon: React.ReactNode; label: string; count: number }> = ({ type, icon, label, count }) => (
        <button
            onClick={() => setActiveTab(type)}
            className={`flex items-center justify-center gap-2 w-1/2 p-4 font-bold border-b-4 transition-colors ${
                activeTab === type 
                ? 'text-brand border-brand' 
                : 'text-muted border-transparent hover:bg-soft dark:hover:bg-gray-700/50'
            }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
            {count > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-accent-pink text-white">{count}</span>}
        </button>
    );

    const fullList = activeTab === 'users' 
        ? (filterStatus === 'pending' ? pendingUsers : rejectedUsers)
        : (filterStatus === 'pending' ? pendingCafes : rejectedCafes);

    const totalItems = fullList.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedList = fullList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta text-center mb-6 bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                Pusat Persetujuan
            </h2>
           
            <div className="flex border-b border-border mb-6 justify-center">
                <TabButton type="users" icon={<UserGroupIcon className="h-6 w-6"/>} label="Pengelola" count={pendingUsers.length} />
                <TabButton type="cafes" icon={<BuildingStorefrontIcon className="h-6 w-6"/>} label="Kafe Baru" count={pendingCafes.length} />
            </div>

            <div className="flex gap-2 mb-6 justify-center">
                <button 
                    onClick={() => setFilterStatus('pending')} 
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${filterStatus === 'pending' ? 'bg-brand text-white shadow-md shadow-brand/20' : 'bg-gray-100 dark:bg-gray-700 text-muted hover:bg-gray-200'}`}
                >
                    Menunggu ({activeTab === 'users' ? pendingUsers.length : pendingCafes.length})
                </button>
                <button 
                    onClick={() => setFilterStatus('rejected')} 
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${filterStatus === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-900' : 'bg-gray-100 dark:bg-gray-700 text-muted hover:bg-gray-200'}`}
                >
                    Ditolak ({activeTab === 'users' ? rejectedUsers.length : rejectedCafes.length})
                </button>
            </div>

            <div className="py-2">
                {isLoading && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">{[...Array(3)].map((_, i) => <div key={i} className="bg-gray-200 dark:bg-gray-700 h-40 rounded-3xl"></div>)}</div>}
                {error && <p className="text-center text-accent-pink">{error}</p>}
                
                {!isLoading && !error && (
                    <>
                        {activeTab === 'users' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {paginatedList.length === 0 ? (
                                    <div className="col-span-full text-center text-muted py-10 bg-soft/50 rounded-3xl border border-dashed border-border">
                                        <UserGroupIcon className="h-12 w-12 mx-auto mb-2 opacity-20"/>
                                        <p>Tidak ada data user {filterStatus === 'pending' ? 'menunggu' : 'ditolak'}.</p>
                                    </div>
                                ) : (
                                    (paginatedList as Profile[]).map(user => (
                                        <div key={user.id} className="bg-card dark:bg-gray-800 p-5 rounded-3xl border border-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-lg">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="font-bold text-primary dark:text-white truncate" title={user.username}>{user.username}</p>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
                                                            {user.role === 'admin_cafe' ? 'Pengelola' : 'User'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-muted mb-4 truncate" title={user.email}>{user.email}</p>
                                            </div>
                                            
                                            <div className="flex gap-2 mt-2 pt-3 border-t border-border">
                                                {filterStatus === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleUserApproval(user.id, true)} disabled={processingId === user.id} className="flex-1 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm">
                                                            <CheckCircleIcon className="h-4 w-4"/> Terima
                                                        </button>
                                                        <button onClick={() => handleUserApproval(user.id, false)} disabled={processingId === user.id} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-sm hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1">
                                                            <XCircleIcon className="h-4 w-4"/> Tolak
                                                        </button>
                                                    </>
                                                ) : (
                                                     <button onClick={() => handleUserApproval(user.id, true)} disabled={processingId === user.id} className="w-full py-2 bg-brand/10 text-brand border border-brand/20 rounded-xl font-bold text-sm hover:bg-brand/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                                        <ArrowPathIcon className="h-4 w-4"/> Pulihkan Akses
                                                     </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                         {activeTab === 'cafes' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                 {paginatedList.length === 0 ? (
                                     <div className="col-span-full text-center text-muted py-10 bg-soft/50 rounded-3xl border border-dashed border-border">
                                        <BuildingStorefrontIcon className="h-12 w-12 mx-auto mb-2 opacity-20"/>
                                        <p>Tidak ada data kafe {filterStatus === 'pending' ? 'menunggu' : 'ditolak'}.</p>
                                    </div>
                                ) : (
                                    (paginatedList as Cafe[]).map(cafe => (
                                        <div key={cafe.id} className="bg-card dark:bg-gray-800 p-5 rounded-3xl border border-border flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
                                            <div>
                                                <div className="relative h-32 rounded-2xl bg-gray-200 dark:bg-gray-700 overflow-hidden mb-3">
                                                     {cafe.coverUrl ? (
                                                         <img src={cafe.coverUrl} alt={cafe.name} className="w-full h-full object-cover" />
                                                     ) : (
                                                         <div className="w-full h-full flex items-center justify-center text-muted"><BuildingStorefrontIcon className="h-8 w-8"/></div>
                                                     )}
                                                     <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs font-bold">
                                                         {cafe.priceTier ? '$'.repeat(cafe.priceTier) : '-'}
                                                     </div>
                                                </div>
                                                <h3 className="font-bold text-lg text-primary dark:text-white truncate mb-1">{cafe.name}</h3>
                                                <div className="flex items-center gap-1 text-xs text-muted mb-1">
                                                    <MapPinIcon className="h-3 w-3"/> {cafe.city}, {cafe.district}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted mb-3">
                                                    <ClockIcon className="h-3 w-3"/> {cafe.openingHours}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 mt-2 pt-3 border-t border-border">
                                                {filterStatus === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleCafeApproval(cafe.id, true)} disabled={processingId === cafe.id} className="flex-1 py-2 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm">
                                                            <CheckCircleIcon className="h-4 w-4"/> Terima
                                                        </button>
                                                        <button onClick={() => handleCafeApproval(cafe.id, false)} disabled={processingId === cafe.id} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-sm hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1">
                                                            <XCircleIcon className="h-4 w-4"/> Tolak
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleCafeApproval(cafe.id, true)} disabled={processingId === cafe.id} className="w-full py-2 bg-brand/10 text-brand border border-brand/20 rounded-xl font-bold text-sm hover:bg-brand/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                                        <ArrowPathIcon className="h-4 w-4"/> Setujui Kembali
                                                     </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
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
        </div>
    );
};

export default ApprovalHub;
