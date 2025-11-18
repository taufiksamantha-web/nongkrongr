import React, { useState, useEffect } from 'react';
import { LightBulbIcon, XMarkIcon } from '@heroicons/react/24/solid';

const HINT_STORAGE_KEY = 'nongkrongr_daily_admin_hint';
const HINT_DISMISS_KEY = `nongkrongr_admin_hint_dismissed_${new Date().toISOString().split('T')[0]}`;

const allHints = [
    { title: "Fitur 'Cafe of The Week'", details: ["Buat bagian khusus di Homepage untuk menyorot satu kafe pilihan setiap minggu.", "Ini bisa menjadi sumber pendapatan tambahan atau cara untuk mengapresiasi kafe berkualitas."] },
    { title: "Manajemen Event Kafe", details: ["Tambahkan fitur di halaman detail untuk menampilkan event (misal: live music, promo).", "Pengelola kafe bisa menginput event mereka sendiri, meningkatkan engagement."] },
    { title: "Peta Panas (Heatmap)", details: ["Visualisasikan area dengan konsentrasi kafe tertinggi di halaman Explore.", "Bantu pengguna menemukan area 'ramai kafe' dengan mudah."] },
    { title: "Leaderboard Reviewer", details: ["Beri penghargaan pada pengguna dengan review paling bermanfaat.", "Gamifikasi ini bisa meningkatkan jumlah dan kualitas review."] },
    { title: "Filter 'Buka Sampai Malam'", details: ["Tambahkan filter cepat untuk kafe yang buka hingga larut malam.", "Sangat berguna untuk pengguna yang mencari tempat nugas atau nongkrong malam hari."] },
    { title: "Sistem Tagging Kustom", details: ["Izinkan pengguna menambahkan tag seperti #KidsFriendly, #PetFriendly, #MeetingSpot.", "Membuat pencarian menjadi lebih spesifik dan personal."] },
];

const AdminWelcomeHint: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentHint, setCurrentHint] = useState<{title: string, details: string[]} | null>(null);

    useEffect(() => {
        const hasDismissedToday = sessionStorage.getItem(HINT_DISMISS_KEY);
        if (hasDismissedToday) {
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        let storedHintData: any;
        try {
            storedHintData = JSON.parse(localStorage.getItem(HINT_STORAGE_KEY) || '{}');
        } catch (e) {
            storedHintData = {};
        }

        if (storedHintData.date === todayStr && storedHintData.hint) {
            setCurrentHint(storedHintData.hint);
        } else {
            const newHint = allHints[Math.floor(Math.random() * allHints.length)];
            setCurrentHint(newHint);
            localStorage.setItem(HINT_STORAGE_KEY, JSON.stringify({ date: todayStr, hint: newHint }));
        }
        setIsVisible(true);
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem(HINT_DISMISS_KEY, 'true');
        setIsVisible(false);
    };

    if (!isVisible || !currentHint) {
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
                    <h3 className="font-bold font-jakarta text-xl text-primary dark:text-white">Inspirasi Hari Ini: {currentHint.title}</h3>
                    <p className="mt-1 mb-3 text-muted">Sambil mengelola data, mungkin ini bisa jadi ide fitur selanjutnya?</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted marker:text-brand">
                        {currentHint.details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminWelcomeHint;