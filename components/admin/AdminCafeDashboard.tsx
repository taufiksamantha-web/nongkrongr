
import React, { useState, useEffect } from 'react';
import CafeManagementPanel from './CafeManagementPanel';
import StatCard from './StatCard';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/outline';

const welcomeMessages = [
    "Selamat datang! Pastikan jam buka kafe selalu update.",
    "Hari yang cerah untuk bisnis! Cek statistik kafe Anda.",
    "Halo, Pengelola! Ada promo baru yang ingin ditambahkan?",
    "Manajemen kafe jadi lebih mudah hari ini.",
];

interface AdminCafeDashboardProps {
    activeView: string;
}

const AdminCafeDashboard: React.FC<AdminCafeDashboardProps> = ({ activeView }) => {
    const { currentUser } = useAuth();
    const [welcomeMessage] = useState(() => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);
    const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeView !== 'overview' || !currentUser) return;

        const fetchStats = async () => {
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

                setStats({ total: totalCount || 0, approved: approvedCount || 0, pending: pendingCount || 0, rejected: rejectedCount || 0 });
            } catch (error) {
                console.error("Error fetching manager stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
        const channel = supabase.channel('manager-dashboard-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes', filter: `manager_id=eq.${currentUser.id}` }, fetchStats)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser, activeView]);

    if (activeView === 'my-cafes') {
        return <CafeManagementPanel />;
    }

    // Overview
    return (
        <div className="space-y-8 w-full">
            <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand text-brand dark:text-brand-light p-6 rounded-2xl">
                <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Halo, {currentUser?.username}</h3>
                <p className="mt-1 text-muted text-sm sm:text-base">{welcomeMessage}</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                 <StatCard title="Total Kafe" value={stats.total} icon={<BuildingStorefrontIcon className="h-8 w-8 text-brand" />} color="brand" />
                <StatCard title="Aktif" value={stats.approved} icon={<CheckBadgeIcon className="h-8 w-8 text-green-500" />} color="green" />
                <StatCard title="Menunggu" value={stats.pending} icon={<ClockIcon className="h-8 w-8 text-yellow-500" />} color="yellow" />
                <StatCard title="Ditolak" value={stats.rejected} icon={<XCircleIcon className="h-8 w-8 text-red-500" />} color="red" />
            </div>
        </div>
    );
};

export default AdminCafeDashboard;
