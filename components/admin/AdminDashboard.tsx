
import React, { useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
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

const AdminDashboard: React.FC = () => {
    const { cafes } = useContext(CafeContext)!;
    
    const totalCafes = cafes.length;
    const archivedCafes = cafes.filter(c => c.status === 'archived').length;
    const sponsoredCafes = cafes.filter(cafe => cafe.isSponsored && cafe.status !== 'archived').length;
    
    // Active (non-archived) breakdown
    const activeCafes = cafes.filter(c => c.status !== 'archived');
    const approvedCafes = activeCafes.filter(cafe => cafe.status === 'approved').length;
    const pendingCafes = activeCafes.filter(cafe => cafe.status === 'pending').length;
    
    // For the chart, we compare Sponsored vs Regular (Active only)
    const nonSponsoredActiveCafes = activeCafes.length - sponsoredCafes;

    return (
        <div className="w-full max-w-full">
            <AdminWelcomeHint />
            
            <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-extrabold font-jakarta bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent inline-block">
                    Dashboard Overview
                </h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-brand to-purple-600 rounded-full mx-auto mt-3 opacity-80"></div>
            </div>

            {/* Cafe Summary Section - Fluid Grid with Highlighted Total */}
            <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border space-y-6 mt-6 sm:mt-8 w-full">
                <div>
                    <h3 className="text-xl font-bold font-jakarta mb-6 text-center text-primary dark:text-white">Ringkasan Kafe</h3>
                    
                    {/* 
                        Grid Layout Strategy:
                        - Mobile (Default): 2 Columns. Total Cafe takes 2 cols (full width). Others take 1 col.
                        - Large Screens (lg): 6 Columns. Total Cafe takes 2 cols. Others take 1 col each. (2 + 1 + 1 + 1 + 1 = 6)
                    */}
                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
                        
                        {/* Highlighted Total Cafe Card */}
                        <div className="col-span-2 bg-gradient-to-br from-brand/10 to-purple-500/5 dark:from-brand/20 dark:to-purple-900/20 p-5 rounded-2xl border border-brand/20 flex flex-col justify-between min-h-[120px] relative overflow-hidden group">
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-brand/10 rounded-full blur-2xl group-hover:bg-brand/20 transition-colors"></div>
                            <div className="flex justify-between items-start relative z-10">
                                <p className="text-sm sm:text-base text-brand font-bold uppercase tracking-wide">Total Cafe</p>
                                <BuildingStorefrontIcon className="h-8 w-8 text-brand" />
                            </div>
                            <p className="text-4xl sm:text-5xl font-extrabold font-jakarta text-brand mt-2 relative z-10">{totalCafes}</p>
                            <p className="text-xs text-muted mt-1 relative z-10">Termasuk arsip & pending</p>
                        </div>

                        {/* Standard Cards */}
                        <StatCard 
                            title="Disetujui" 
                            value={approvedCafes} 
                            icon={<CheckBadgeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />} 
                            color="green" 
                        />
                        <StatCard 
                            title="Tertunda" 
                            value={pendingCafes} 
                            icon={<ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />} 
                            color="yellow" 
                        />
                         <StatCard 
                            title="Sponsored" 
                            value={sponsoredCafes} 
                            icon={<CheckBadgeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />} 
                            color="purple" 
                        />
                        <StatCard 
                            title="Diarsipkan" 
                            value={archivedCafes} 
                            icon={<ArchiveBoxArrowDownIcon className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />} 
                            color="gray" 
                        />
                    </div>
                </div>
                <StatChart sponsored={sponsoredCafes} regular={nonSponsoredActiveCafes} total={activeCafes.length} />
            </div>
            
            {/* Main Content Grid - Fluid Breakpoints */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8 mt-6 sm:mt-8 items-start w-full">
              
              <div className="xl:col-span-2 space-y-6 sm:space-y-8 w-full min-w-0">
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><ApprovalHub /></div>
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><CafeManagementPanel /></div>
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><ReviewManagement /></div>
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><UserManagementPanel /></div>
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><FeedbackPanel /></div>
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><ArchivePanel /></div>
              </div>

              <div className="xl:col-span-1 space-y-6 sm:space-y-8 w-full min-w-0">
                <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border w-full overflow-hidden"><WebsiteSettingsPanel /></div>
              </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
