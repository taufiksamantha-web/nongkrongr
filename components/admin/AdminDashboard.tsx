
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BuildingStorefrontIcon, CheckBadgeIcon, ClockIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline';
import CafeManagementPanel from './CafeManagementPanel';
import ReviewManagement from './PendingReviews';
import UserManagementPanel from './UserManagementPanel';
import WebsiteSettingsPanel from './WebsiteSettingsPanel';
import FeedbackPanel from './FeedbackPanel';
import ArchivePanel from './ArchivePanel';
import StatCard from './StatCard';
import StatChart from './StatChart';
import AdminWelcomeHint from './AdminWelcomeHint';
import ApprovalHub from './ApprovalHub';

interface AdminDashboardProps {
    activeView: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeView }) => {
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        sponsored: 0,
        archived: 0,
        regular: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (activeView !== 'overview') return; // Only fetch stats if on overview

        const fetchRealtimeStats = async () => {
            setIsLoading(true);
            try {
                const [
                    { count: totalCount },
                    { count: approvedCount },
                    { count: pendingCount },
                    { count: archivedCount },
                    { count: sponsoredCount }
                ] = await Promise.all([
                    supabase.from('cafes').select('*', { count: 'exact', head: true }),
                    supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
                    supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                    supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
                    supabase.from('cafes').select('*', { count: 'exact', head: true }).eq('isSponsored', true).neq('status', 'archived')
                ]);

                setStats({
                    total: totalCount || 0,
                    approved: approvedCount || 0,
                    pending: pendingCount || 0,
                    archived: archivedCount || 0,
                    sponsored: sponsoredCount || 0,
                    regular: (approvedCount || 0) - (sponsoredCount || 0)
                });
            } catch (error) {
                console.error("Error fetching admin stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRealtimeStats();
        
        const channel = supabase.channel('admin-dashboard-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes' }, fetchRealtimeStats)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeView]);

    // Render based on Active View
    switch (activeView) {
        case 'approval':
            return <ApprovalHub />;
        case 'cafes':
            return <CafeManagementPanel />;
        case 'reviews':
            return <ReviewManagement />;
        case 'users':
            return <UserManagementPanel />;
        case 'feedback':
            return <FeedbackPanel />;
        case 'archive':
            return <ArchivePanel />;
        case 'settings':
            return <WebsiteSettingsPanel />;
        case 'overview':
        default:
            return (
                <div className="w-full max-w-full space-y-8">
                    <AdminWelcomeHint />
                    
                    {/* Stats Grid */}
                    <div className="bg-card p-6 rounded-3xl shadow-sm border border-border w-full">
                        <h3 className="text-xl font-bold font-jakarta mb-6 text-primary dark:text-white">Ringkasan Real-time</h3>
                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                            <div className="col-span-2 bg-gradient-to-br from-brand/10 to-purple-500/5 dark:from-brand/20 dark:to-purple-900/20 p-5 rounded-2xl border border-brand/20 flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand/10 rounded-full blur-2xl group-hover:bg-brand/20 transition-colors"></div>
                                <div className="flex justify-between items-start relative z-10">
                                    <p className="text-sm font-bold uppercase tracking-wide text-brand">Total Cafe</p>
                                    <BuildingStorefrontIcon className="h-8 w-8 text-brand" />
                                </div>
                                <p className="text-5xl font-extrabold font-jakarta text-brand mt-2 relative z-10">
                                    {isLoading ? '...' : stats.total}
                                </p>
                            </div>
                            <StatCard title="Disetujui" value={stats.approved} icon={<CheckBadgeIcon className="h-8 w-8 text-green-500" />} color="green" />
                            <StatCard title="Tertunda" value={stats.pending} icon={<ClockIcon className="h-8 w-8 text-yellow-500" />} color="yellow" />
                            <StatCard title="Sponsored" value={stats.sponsored} icon={<CheckBadgeIcon className="h-8 w-8 text-purple-500" />} color="purple" />
                            <StatCard title="Diarsipkan" value={stats.archived} icon={<ArchiveBoxArrowDownIcon className="h-8 w-8 text-gray-500" />} color="gray" />
                        </div>
                        {!isLoading && <div className="mt-8 pt-6 border-t border-border"><StatChart sponsored={stats.sponsored} regular={stats.regular} total={stats.approved} /></div>}
                    </div>
                </div>
            );
    }
};

export default AdminDashboard;
