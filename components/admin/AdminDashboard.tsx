
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { BuildingStorefrontIcon, CheckBadgeIcon, ClockIcon, ArchiveBoxArrowDownIcon, HomeIcon, Square3Stack3DIcon, UserGroupIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
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

type AdminTab = 'overview' | 'content' | 'users' | 'system';

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    
    // State for accurate counts direct from DB
    const [stats, setStats] = useState({
        total: 0,
        approved: 0,
        pending: 0,
        sponsored: 0,
        archived: 0,
        regular: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchRealtimeStats = async () => {
        setIsLoading(true);
        try {
            // We use Promise.all to fetch counts in parallel for "Power Mode" speed
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

            const safeTotal = totalCount || 0;
            const safeSponsored = sponsoredCount || 0;
            // Regular active cafes (Approved - Sponsored)
            const safeRegular = (approvedCount || 0) - safeSponsored;

            setStats({
                total: safeTotal,
                approved: approvedCount || 0,
                pending: pendingCount || 0,
                archived: archivedCount || 0,
                sponsored: safeSponsored,
                regular: safeRegular
            });
        } catch (error) {
            console.error("Error fetching admin stats:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRealtimeStats();
        
        // Subscribe to realtime changes for the dashboard counters
        const channel = supabase.channel('admin-dashboard-stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes' }, () => {
                fetchRealtimeStats();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const TabButton: React.FC<{ id: AdminTab, label: string, icon: React.ReactNode }> = ({ id, label, icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-all duration-300 border-2 ${
                activeTab === id
                    ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20 transform scale-105'
                    : 'bg-card dark:bg-gray-800 text-muted border-transparent hover:border-brand/30 hover:text-primary dark:hover:text-white'
            }`}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
        </button>
    );

    return (
        <div className="w-full max-w-full">
            <AdminWelcomeHint />
            
            <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold font-jakarta bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent inline-block">
                    Admin Dashboard
                </h1>
                <p className="text-muted mt-2">Kelola semua aspek aplikasi Nongkrongr dari sini.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                <TabButton id="overview" label="Overview & Approval" icon={<HomeIcon className="h-5 w-5" />} />
                <TabButton id="content" label="Kafe & Konten" icon={<Square3Stack3DIcon className="h-5 w-5" />} />
                <TabButton id="users" label="Pengguna" icon={<UserGroupIcon className="h-5 w-5" />} />
                <TabButton id="system" label="Sistem & Arsip" icon={<Cog6ToothIcon className="h-5 w-5" />} />
            </div>

            {/* CONTENT AREA */}
            <div className="animate-fade-in-up">
                
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Stats Section */}
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border space-y-6">
                            <div>
                                <h3 className="text-xl font-bold font-jakarta mb-6 text-center text-primary dark:text-white">Ringkasan Real-time</h3>
                                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                                    <div className="col-span-2 bg-gradient-to-br from-brand/10 to-purple-500/5 dark:from-brand/20 dark:to-purple-900/20 p-5 rounded-2xl border border-brand/20 flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand/10 rounded-full blur-2xl group-hover:bg-brand/20 transition-colors"></div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <p className="text-sm sm:text-base text-brand font-bold uppercase tracking-wide">Total Cafe</p>
                                            <BuildingStorefrontIcon className="h-8 w-8 text-brand" />
                                        </div>
                                        <p className="text-4xl sm:text-5xl font-extrabold font-jakarta text-brand mt-2 relative z-10">
                                            {isLoading ? <span className="animate-pulse">...</span> : stats.total}
                                        </p>
                                        <p className="text-xs text-muted mt-1 relative z-10">Database Uptodate</p>
                                    </div>
                                    <StatCard title="Disetujui" value={stats.approved} icon={<CheckBadgeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />} color="green" />
                                    <StatCard title="Tertunda" value={stats.pending} icon={<ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />} color="yellow" />
                                    <StatCard title="Sponsored" value={stats.sponsored} icon={<CheckBadgeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />} color="purple" />
                                    <StatCard title="Diarsipkan" value={stats.archived} icon={<ArchiveBoxArrowDownIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />} color="gray" />
                                </div>
                            </div>
                            {!isLoading && <StatChart sponsored={stats.sponsored} regular={stats.regular} total={stats.approved} />}
                        </div>

                        {/* Approval Hub */}
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                            <ApprovalHub />
                        </div>
                    </div>
                )}

                {/* TAB 2: CONTENT MANAGEMENT */}
                {activeTab === 'content' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-start">
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden xl:col-span-2">
                            <CafeManagementPanel />
                        </div>
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                            <ReviewManagement />
                        </div>
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                            <FeedbackPanel />
                        </div>
                    </div>
                )}

                {/* TAB 3: USER MANAGEMENT */}
                {activeTab === 'users' && (
                    <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                        <UserManagementPanel />
                    </div>
                )}

                {/* TAB 4: SYSTEM & ARCHIVE */}
                {activeTab === 'system' && (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-start">
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                            <WebsiteSettingsPanel />
                        </div>
                        <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden">
                            <ArchivePanel />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminDashboard;
