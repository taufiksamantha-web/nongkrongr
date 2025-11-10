import React, { useContext } from 'react';
import { CafeContext } from '../../context/CafeContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import CafeManagementPanel from './CafeManagementPanel';
import PendingReviews from './PendingReviews';
import UserManagementPanel from './UserManagementPanel';
import StatCard from './StatCard';

const AdminDashboard: React.FC = () => {
    const { cafes } = useContext(CafeContext)!;
    
    const totalCafes = cafes.length;
    const sponsoredCafes = cafes.filter(cafe => cafe.isSponsored).length;
    const nonSponsoredCafes = totalCafes - sponsoredCafes;

    return (
        <>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold font-jakarta">Dashboard Overview</h1>
            </div>
            
             {/* Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Total Cafe" 
                    value={totalCafes} 
                    icon={<BuildingStorefrontIcon className="h-8 w-8 text-primary" />} 
                    color="primary" 
                />
                <StatCard 
                    title="Sponsored" 
                    value={sponsoredCafes} 
                    icon={<CheckBadgeIcon className="h-8 w-8 text-green-600 dark:text-green-400" />} 
                    color="green" 
                />
                <StatCard 
                    title="Regular" 
                    value={nonSponsoredCafes} 
                    icon={<XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />} 
                    color="red" 
                />
            </div>

            <CafeManagementPanel />
            <PendingReviews />
            <UserManagementPanel />
        </>
    );
};

export default AdminDashboard;