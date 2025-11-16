

import React, { useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import CafeManagementPanel from './CafeManagementPanel';
import ReviewManagement from './PendingReviews';
import UserManagementPanel from './UserManagementPanel';
import WebsiteSettingsPanel from './WebsiteSettingsPanel';
import StatCard from './StatCard';
import StatChart from './StatChart';
import AdminWelcomeHint from './AdminWelcomeHint';

const AdminDashboard: React.FC = () => {
    const { cafes } = useContext(CafeContext)!;
    
    const totalCafes = cafes.length;
    const sponsoredCafes = cafes.filter(cafe => cafe.isSponsored).length;
    const nonSponsoredCafes = totalCafes - sponsoredCafes;

    return (
        <div>
            <AdminWelcomeHint />
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold font-jakarta">Dashboard Overview</h1>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 items-start">
              
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><CafeManagementPanel /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><ReviewManagement /></div>
              </div>

              <div className="lg:col-span-1 space-y-8">
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border space-y-6">
                    <div>
                        <h3 className="text-xl font-bold font-jakarta mb-4">Ringkasan Kafe</h3>
                        <div className="space-y-4">
                           <StatCard 
                                title="Total Cafe" 
                                value={totalCafes} 
                                icon={<BuildingStorefrontIcon className="h-8 w-8 text-brand" />} 
                                color="brand" 
                            />
                            <StatCard 
                                title="Sponsored" 
                                value={sponsoredCafes} 
                                icon={<CheckBadgeIcon className="h-8 w-8 text-green-500" />} 
                                color="green" 
                            />
                            <StatCard 
                                title="Regular" 
                                value={nonSponsoredCafes} 
                                icon={<XCircleIcon className="h-8 w-8 text-red-500" />} 
                                color="red" 
                            />
                        </div>
                    </div>
                    <StatChart sponsored={sponsoredCafes} regular={nonSponsoredCafes} total={totalCafes} />
                </div>
                
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><UserManagementPanel /></div>
                <div className="bg-card p-6 rounded-3xl shadow-sm border border-border"><WebsiteSettingsPanel /></div>
              </div>
            </div>
        </div>
    );
};

export default AdminDashboard;