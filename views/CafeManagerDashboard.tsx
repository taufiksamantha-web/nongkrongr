
import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// VIEW INI DEPRECATED - REDIRECT KE dashboard.nongkrongr.com
export const CafeManagerDashboard: React.FC<any> = () => {
    useEffect(() => {
        window.location.href = 'https://dashboard.nongkrongr.com';
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0F172A]">
            <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-slate-700 max-w-md mx-4 animate-in zoom-in duration-300">
                <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Loader2 className="animate-spin text-orange-500" size={40} />
                </div>
                <h2 className="text-2xl font-display font-black text-gray-900 dark:text-white mb-2">Mengalihkan...</h2>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    Halaman manajemen kafe telah berpindah ke platform khusus Partner di <strong>dashboard.nongkrongr.com</strong>.
                </p>
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                    <a 
                        href="https://dashboard.nongkrongr.com" 
                        className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-2xl transition-all shadow-lg shadow-orange-500/30 active:scale-95"
                    >
                        Klik di sini jika tidak otomatis
                    </a>
                </div>
            </div>
        </div>
    );
};
