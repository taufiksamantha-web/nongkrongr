
import React, { useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, XCircleIcon, ClockIcon, UserCircleIcon } from '@heroicons/react/24/outline';
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
    
    // Filter out archived cafes for general stats
    const activeCafes = cafes.filter(c => c.status !== 'archived');
    
    const totalCafes = activeCafes.length;
    const sponsoredCafes = activeCafes.filter(cafe => cafe.isSponsored).length;
    const nonSponsoredCafes = totalCafes - sponsoredCafes;
    const approvedCafes = activeCafes.filter(cafe => cafe.status === 'approved').length;
    const pendingCafes = activeCafes.filter(cafe => cafe.status === 'pending').length;

    return (
        <div className="w-full max-w-full">
            <AdminWelcomeHint />
            
            <div className="mb-8 text-center">
                <h1 className="text-3xl sm:text-4xl font-extrabold font-jakarta bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent inline-block">
                    Dashboard Overview
                </h1>
                <div className="h-1.5 w-24 bg-gradient-to-r from-brand to-purple-600 rounded-full mx-auto mt-3 opacity-80"></div>
            </div>

            {/* Cafe Summary Section - Fluid Grid */}
            <div className="bg-card p-4 sm:p-6 rounded-3xl shadow-sm border border-border space-y-6 mt-6 sm:mt-8 w-full">
                <div>
                    <h3 className="text-xl font-bold font-jakarta mb-6 text-center text-primary dark:text-white">Ringkasan Kafe</h3>
                    {/* Fluid Grid: 1 col mobile, 2 col tablet, 4 col desktop */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                       <StatCard 
                            title="Total Cafe" 
                            value={totalCafes} 
                            icon={<BuildingStorefrontIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand" />} 
                            color="brand" 
                        />
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
                    </div>
                </div>
                <StatChart sponsored={sponsoredCafes} regular={nonSponsoredCafes} total={totalCafes} />
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
