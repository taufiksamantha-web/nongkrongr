
import React, { useState, useEffect } from 'react';
import CafeManagementPanel from './CafeManagementPanel';
import StatCard from './StatCard';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

const welcomeMessages = [
    "Selamat datang! Pastikan jam buka dan detail kafe Anda selalu update untuk pengunjung.",
    "Hari yang cerah untuk bisnis! Cek statistik kafe Anda dan lihat apa yang sedang tren.",
    "Halo, Pengelola! Tambahkan event atau promo baru untuk menarik lebih banyak pengunjung hari ini.",
    "Manajemen kafe jadi lebih mudah. Apa yang ingin Anda perbarui hari ini?",
    "Setiap detail penting. Periksa kembali foto dan fasilitas yang Anda tawarkan.",
];

const AdminCafeDashboard: React.FC = () => {
    const { currentUser } = useAuth();
    const [welcomeMessage] = useState(() => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchStats = async () => {
        if (!currentUser) return;
        setIsLoading(true);
        try {
            const [
                { count: totalCount },
                { count: approvedCount },
                { count: pendingCount },
                { count: rejectedCount }
            ] = await Promise.all([
                supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('manager_id', currentUser.id).neq('status', 'archived'),
                supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('manager_id', currentUser.id).eq('status', 'approved'),
                supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('manager_id', currentUser.id).eq('status', 'pending'),
                supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('manager_id', currentUser.id).eq('status', 'rejected')
            ]);

            setStats({
                total: totalCount || 0,
                approved: approvedCount || 0,
                pending: pendingCount || 0,
                rejected: rejectedCount || 0
            });
        } catch (error) {
            console.error("Error fetching manager stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        
        // Realtime subscription for this manager's cafes
        const channel = supabase.channel('manager-dashboard-stats')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'cafes',
                filter: `manager_id=eq.${currentUser?.id}`
            }, () => {
                fetchStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

    return (
        <div className="space-y-8 w-full max-w-full">
            <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand text-brand dark:text-brand-light p-6 rounded-2xl relative animate-fade-in-up">
                <div className="flex items-start gap-4">
                    <BuildingStorefrontIcon className="h-8 w-8 text-brand flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Dashboard Pengelola</h3>
                        <p className="mt-1 text-muted text-sm sm:text-base">
                            {welcomeMessage}
                        </p>
                    </div>
                </div>
            </div>

            {/* Real-time Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                 <StatCard 
                    title="Total Kafe" 
                    value={stats.total} 
                    icon={<BuildingStorefrontIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand" />} 
                    color="brand" 
                />
                <StatCard 
                    title="Aktif/Tayang" 
                    value={stats.approved} 
                    icon={<CheckBadgeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />} 
                    color="green" 
                />
                <StatCard 
                    title="Menunggu" 
                    value={stats.pending} 
                    icon={<ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />} 
                    color="yellow" 
                />
                <StatCard 
                    title="Ditolak" 
                    value={stats.rejected} 
                    icon={<XCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />} 
                    color="red" 
                />
            </div>

            <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                <CafeManagementPanel />
            </div>
        </div>
    );
};

export default AdminCafeDashboard;
