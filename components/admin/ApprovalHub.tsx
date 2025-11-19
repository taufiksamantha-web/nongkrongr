
import React, { useState, useEffect, useContext } from 'react';
import { Profile, Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { userService } from '../../services/userService';
import { UserGroupIcon, BuildingStorefrontIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

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
            className={`flex items-center gap-3 w-1/2 p-4 font-bold border-b-4 transition-colors ${
                activeTab === type 
                ? 'text-brand border-brand' 
                : 'text-muted border-transparent hover:bg-soft dark:hover:bg-gray-700/50'
            }`}
        >
            {icon}
            {label}
            {count > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-accent-pink text-white">{count}</span>}
        </button>
    );

    const usersToDisplay = filterStatus === 'pending' ? pendingUsers : rejectedUsers;
    const cafesToDisplay = filterStatus === 'pending' ? pendingCafes : rejectedCafes;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-bold font-jakarta">Pusat Persetujuan</h2>
            </div>
           
            <div className="flex border-b border-border mb-4">
                <TabButton type="users" icon={<UserGroupIcon className="h-6 w-6"/>} label="Pengelola" count={pendingUsers.length} />
                <TabButton type="cafes" icon={<BuildingStorefrontIcon className="h-6 w-6"/>} label="Kafe Baru" count={pendingCafes.length} />
            </div>

            <div className="flex gap-2 mb-4">
                <button 
                    onClick={() => setFilterStatus('pending')} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === 'pending' ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-gray-700 text-muted hover:bg-gray-200'}`}
                >
                    Menunggu ({activeTab === 'users' ? pendingUsers.length : pendingCafes.length})
                </button>
                <button 
                    onClick={() => setFilterStatus('rejected')} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${filterStatus === 'rejected' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 border border-red-200 dark:border-red-900' : 'bg-gray-100 dark:bg-gray-700 text-muted hover:bg-gray-200'}`}
                >
                    Ditolak ({activeTab === 'users' ? rejectedUsers.length : rejectedCafes.length})
                </button>
            </div>

            <div className="py-2">
                {isLoading && <p className="text-center text-muted">Memuat data...</p>}
                {error && <p className="text-center text-accent-pink">{error}</p>}
                
                {!isLoading && !error && (
                    <>
                        {activeTab === 'users' && (
                            <div className="space-y-3">
                                {usersToDisplay.length === 0 ? (
                                    <p className="text-center text-muted py-4">Tidak ada data {filterStatus === 'pending' ? 'menunggu' : 'ditolak'}.</p>
                                ) : (
                                    usersToDisplay.map(user => (
                                        <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-primary dark:text-gray-200">{user.username}</p>
                                                <p className="text-xs text-muted">{user.email}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {filterStatus === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleUserApproval(user.id, true)} disabled={processingId === user.id} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 disabled:opacity-50" title="Setujui"><CheckCircleIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => handleUserApproval(user.id, false)} disabled={processingId === user.id} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50" title="Tolak"><XCircleIcon className="h-5 w-5"/></button>
                                                    </>
                                                ) : (
                                                     <button onClick={() => handleUserApproval(user.id, true)} disabled={processingId === user.id} className="flex items-center gap-1 px-3 py-1 bg-brand/10 text-brand rounded-lg text-xs font-bold hover:bg-brand/20 disabled:opacity-50">
                                                        <ArrowPathIcon className="h-3 w-3"/> Pulihkan
                                                     </button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                         {activeTab === 'cafes' && (
                            <div className="space-y-3">
                                 {cafesToDisplay.length === 0 ? (
                                    <p className="text-center text-muted py-4">Tidak ada data {filterStatus === 'pending' ? 'menunggu' : 'ditolak'}.</p>
                                ) : (
                                    cafesToDisplay.map(cafe => (
                                        <div key={cafe.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-primary dark:text-gray-200">{cafe.name}</p>
                                                <p className="text-sm text-muted">{cafe.city}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {filterStatus === 'pending' ? (
                                                    <>
                                                        <button onClick={() => handleCafeApproval(cafe.id, true)} disabled={processingId === cafe.id} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 disabled:opacity-50" title="Setujui"><CheckCircleIcon className="h-5 w-5"/></button>
                                                        <button onClick={() => handleCafeApproval(cafe.id, false)} disabled={processingId === cafe.id} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50" title="Tolak"><XCircleIcon className="h-5 w-5"/></button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => handleCafeApproval(cafe.id, true)} disabled={processingId === cafe.id} className="flex items-center gap-1 px-3 py-1 bg-brand/10 text-brand rounded-lg text-xs font-bold hover:bg-brand/20 disabled:opacity-50">
                                                        <ArrowPathIcon className="h-3 w-3"/> Setujui Kembali
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
        </div>
    );
};

export default ApprovalHub;
