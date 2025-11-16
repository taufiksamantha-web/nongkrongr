import React from 'react';
import CafeManagementPanel from './CafeManagementPanel';
import { BuildingStorefrontIcon } from '@heroicons/react/24/solid';

const AdminCafeDashboard: React.FC = () => {
    return (
        <div>
            <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand text-brand dark:text-brand-light p-6 rounded-2xl mb-8 relative">
                <div className="flex items-start gap-4">
                    <BuildingStorefrontIcon className="h-8 w-8 text-brand flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Dashboard Pengelola Kafe</h3>
                        <p className="mt-1 text-muted">
                            Selamat datang! Di sini Anda dapat menambahkan, mengedit, dan mengelola informasi untuk kafe yang Anda kelola. Pastikan data selalu akurat untuk menarik lebih banyak pengunjung.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
                <CafeManagementPanel />
            </div>
        </div>
    );
};

export default AdminCafeDashboard;
