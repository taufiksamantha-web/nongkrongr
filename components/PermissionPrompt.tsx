
import React from 'react';
import { Bell, X } from 'lucide-react';
import { subscribeUserToPush } from '../services/dataService';
import { User } from '../types';

interface PermissionPromptProps {
    user: User;
    onClose: () => void;
}

export const PermissionPrompt: React.FC<PermissionPromptProps> = ({ user, onClose }) => {
    const handleEnable = async () => {
        try {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
                await subscribeUserToPush(user.id);
            }
        } catch (e) {
            console.error("Permission request failed", e);
        } finally {
            onClose();
        }
    };

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[99999] animate-in slide-in-from-bottom-10 duration-500">
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl shadow-2xl p-5 border border-orange-100 dark:border-slate-700 relative">
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                >
                    <X size={16} />
                </button>
                
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                        <Bell size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Nyalakan Notifikasi?</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                            Dapatkan info promo terbaru, status pesanan, dan balasan ulasan langsung di HP kamu.
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={onClose}
                                className="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Nanti Saja
                            </button>
                            <button 
                                onClick={handleEnable}
                                className="flex-1 py-2 text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors shadow-lg shadow-orange-500/30"
                            >
                                Ya, Aktifkan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
