
import React, { useState, useEffect } from 'react';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/24/solid';

const HINT_SESSION_KEY = 'nongkrongr_admin_hint_seen';

const AdminWelcomeHint: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Tampilkan hint hanya jika belum pernah dilihat dalam sesi ini
        const hasSeenHint = sessionStorage.getItem(HINT_SESSION_KEY);
        if (!hasSeenHint) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem(HINT_SESSION_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="bg-brand/10 dark:bg-brand/20 border-l-4 border-brand text-brand dark:text-brand-light p-6 rounded-2xl mb-8 relative animate-fade-in-up">
            <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-brand/20 transition-colors"
                aria-label="Tutup saran"
            >
                <XMarkIcon className="h-5 w-5" />
            </button>
            <div className="flex items-start gap-4">
                <LightBulbIcon className="h-8 w-8 text-brand flex-shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Selamat Datang Kembali, Admin!</h3>
                    <p className="mt-1 mb-3 text-muted">Sambil mengelola data, mungkin ini bisa jadi inspirasi fitur selanjutnya?</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted marker:text-brand">
                        <li><strong>Cafe of The Week:</strong> Buat bagian khusus di Homepage untuk menyorot satu kafe pilihan setiap minggu.</li>
                        <li><strong>Event Kafe:</strong> Tambahkan fitur di halaman detail untuk menampilkan event (misal: live music, promo).</li>
                        <li><strong>Peta Panas (Heatmap):</strong> Visualisasikan area dengan konsentrasi kafe tertinggi di halaman Explore.</li>
                        <li><strong>Leaderboard Reviewer:</strong> Beri penghargaan pada pengguna dengan review paling bermanfaat untuk meningkatkan partisipasi.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminWelcomeHint;
