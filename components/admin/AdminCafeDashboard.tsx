import React, { useState } from 'react';
import CafeManagementPanel from './CafeManagementPanel';
import ProfileEditor from './ProfileEditor';
import { BuildingStorefrontIcon, UserCircleIcon } from '@heroicons/react/24/solid';

const welcomeMessages = [
    "Selamat datang! Pastikan jam buka dan detail kafe Anda selalu update untuk pengunjung.",
    "Hari yang cerah untuk bisnis! Cek statistik kafe Anda dan lihat apa yang sedang tren.",
    "Halo, Pengelola! Tambahkan event atau promo baru untuk menarik lebih banyak pengunjung hari ini.",
    "Manajemen kafe jadi lebih mudah. Apa yang ingin Anda perbarui hari ini?",
    "Setiap detail penting. Periksa kembali foto dan fasilitas yang Anda tawarkan.",
];

const AdminCafeDashboard: React.FC = () => {
    const [welcomeMessage] = useState(() => welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]);

    return (
        <div className="space-y-8">
            <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand text-brand dark:text-brand-light p-6 rounded-2xl relative animate-fade-in-up">
                <div className="flex items-start gap-4">
                    <BuildingStorefrontIcon className="h-8 w-8 text-brand flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Dashboard Pengelola Kafe</h3>
                        <p className="mt-1 text-muted">
                            {welcomeMessage}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
                <div className="flex items-center gap-3 mb-4">
                    <UserCircleIcon className="h-8 w-8 text-accent-cyan" />
                    <h2 className="text-2xl font-bold font-jakarta">Pengaturan Profil</h2>
                </div>
                <ProfileEditor />
            </div>

            <div className="bg-card p-6 rounded-3xl shadow-sm border border-border">
                <CafeManagementPanel />
            </div>
        </div>
    );
};

export default AdminCafeDashboard;