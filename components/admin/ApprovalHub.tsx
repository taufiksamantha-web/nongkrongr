import React, { useState, useEffect, useContext } from 'react';
import { Profile, Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { userService } from '../../services/userService';
import { UserGroupIcon, BuildingStorefrontIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const ApprovalHub: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'cafes'>('users');
    const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
    const [pendingCafes, setPendingCafes] = useState<Cafe[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { getPendingCafes, updateCafeStatus } = useContext(CafeContext)!;

    const fetchPendingData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const users = await userService.getPendingApprovalUsers();
            const cafes = getPendingCafes();
            setPendingUsers(users);
            setPendingCafes(cafes);
        } catch (err: any) {
            setError('Gagal memuat data persetujuan.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingData();
    }, [getPendingCafes]);

    const handleUserApproval = async (userId: string, isApproved: boolean) => {
        setProcessingId(userId);
        const newStatus = isApproved ? 'active' : 'active'; // Note: Rejecting currently just sets them to active too, can be changed to a 'rejected' status later.
        const { error } = await userService.updateUserStatus(userId, newStatus);
        if (error) {
            setError(`Gagal memperbarui status user: ${error.message}`);
        } else {
            setPendingUsers(prev => prev.filter(u => u.id !== userId));
        }
        setProcessingId(null);
    };

    const handleCafeApproval = async (cafeId: string, isApproved: boolean) => {
        setProcessingId(cafeId);
        const newStatus = isApproved ? 'approved' : 'rejected';
        try {
            await updateCafeStatus(cafeId, newStatus);
            // The context will auto-refresh, so we can just refetch data locally.
            await fetchPendingData();
        } catch (err: any) {
             setError(`Gagal memperbarui status kafe: ${err.message}`);
        } finally {
             setProcessingId(null);
        }
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

    return (
        <div>
            <h2 className="text-2xl font-bold font-jakarta mb-4">Pusat Persetujuan</h2>
            <div className="flex border-b border-border">
                <TabButton type="users" icon={<UserGroupIcon className="h-6 w-6"/>} label="Pengelola Kafe" count={pendingUsers.length} />
                <TabButton type="cafes" icon={<BuildingStorefrontIcon className="h-6 w-6"/>} label="Kafe Baru" count={pendingCafes.length} />
            </div>

            <div className="py-4">
                {isLoading && <p className="text-center text-muted">Memuat data...</p>}
                {error && <p className="text-center text-accent-pink">{error}</p>}
                
                {!isLoading && !error && (
                    <>
                        {activeTab === 'users' && (
                            <div className="space-y-3">
                                {pendingUsers.length === 0 ? (
                                    <p className="text-center text-muted py-4">Tidak ada permintaan akun baru.</p>
                                ) : (
                                    pendingUsers.map(user => (
                                        <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl flex justify-between items-center">
                                            <p className="font-semibold text-primary dark:text-gray-200">{user.username}</p>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUserApproval(user.id, true)} disabled={processingId === user.id} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 disabled:opacity-50"><CheckCircleIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleUserApproval(user.id, false)} disabled={processingId === user.id} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50"><XCircleIcon className="h-5 w-5"/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                         {activeTab === 'cafes' && (
                            <div className="space-y-3">
                                 {pendingCafes.length === 0 ? (
                                    <p className="text-center text-muted py-4">Tidak ada kafe baru yang perlu disetujui.</p>
                                ) : (
                                    pendingCafes.map(cafe => (
                                        <div key={cafe.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-xl flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-primary dark:text-gray-200">{cafe.name}</p>
                                                <p className="text-sm text-muted">{cafe.city}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCafeApproval(cafe.id, true)} disabled={processingId === cafe.id} className="p-2 bg-green-100 dark:bg-green-500/20 text-green-600 rounded-full hover:bg-green-200 disabled:opacity-50"><CheckCircleIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleCafeApproval(cafe.id, false)} disabled={processingId === cafe.id} className="p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50"><XCircleIcon className="h-5 w-5"/></button>
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
