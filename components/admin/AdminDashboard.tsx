
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
        <div>
            <AdminWelcomeHint />
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold font-jakarta whitespace-nowrap">Dashboard Overview</h1>
            </div>

            {/* Cafe Summary Section - Moved to top and made full-width */}
            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border space-y-6 mt-8">
                <div>
                    <h3 className="text-xl font-bold font-jakarta mb-4">Ringkasan Kafe</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       <StatCard 
                            title="Total Cafe" 
                            value={totalCafes} 
                            icon={<BuildingStorefrontIcon className="h-8 w-8 text-brand" />} 
                            color="brand" 
                        />
                        <StatCard 
                            title="Disetujui" 
                            value={approvedCafes} 
                            icon={<CheckBadgeIcon className="h-8 w-8 text-green-500" />} 
                            color="green" 
                        />
                        <StatCard 
                            title="Tertunda" 
                            value={pendingCafes} 
                            icon={<ClockIcon className="h-8 w-8 text-yellow-500" />} 
                            color="yellow" 
                        />
                         <StatCard 
                            title="Sponsored" 
                            value={sponsoredCafes} 
                            icon={<CheckBadgeIcon className="h-8 w-8 text-purple-500" />} 
                            color="purple" 
                        />
                    </div>
                </div>
                <StatChart sponsored={sponsoredCafes} regular={nonSponsoredCafes} total={totalCafes} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 items-start">
              
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><ApprovalHub /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><CafeManagementPanel /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><ReviewManagement /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><UserManagementPanel /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><FeedbackPanel /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><ArchivePanel /></div>
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><WebsiteSettingsPanel /></div>
              </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
