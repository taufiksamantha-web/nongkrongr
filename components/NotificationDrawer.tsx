
import React, { useMemo, useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Heart, MessageSquare, Ticket, Calendar, Info, Trash2, X, Bell, Check, CheckCircle2, Ban, BellRing, Hand } from 'lucide-react';
import { AppNotification } from '../types';
import { Button } from './UI';
import { subscribeUserToPush } from '../services/dataService';
import { useSession } from './SessionContext';
import { Capacitor } from '@capacitor/core';

interface NotificationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: AppNotification[];
    onMarkAllRead?: () => void;
    onClearAll?: () => void;
    onItemClick: (notification: AppNotification) => void;
    onDelete?: (id: string) => void;
    onMarkRead?: (id: string) => void; 
    onRefresh?: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ 
    isOpen, 
    onClose, 
    notifications, 
    onMarkAllRead, 
    onClearAll, 
    onItemClick,
    onDelete,
    onMarkRead
}) => {
    const { user } = useSession();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
    const [isSubscribing, setIsSubscribing] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, [isOpen]);

    const handleEnableNotifications = async () => {
        if (!user) return;
        setIsSubscribing(true);
        try {
            const result = await Notification.requestPermission();
            setPermissionStatus(result);
            if (result === 'granted') {
                await subscribeUserToPush(user.id);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubscribing(false);
        }
    };

    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    }, [notifications]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <ShieldCheck size={20} className="text-green-500" />;
            case 'warning': return <AlertTriangle size={20} className="text-orange-500" />;
            case 'error': return <XCircle size={20} className="text-red-500" />;
            case 'like': return <Heart size={20} className="text-pink-500" />;
            case 'review': return <MessageSquare size={20} className="text-blue-500" />;
            case 'promo': return <Ticket size={20} className="text-purple-500" />;
            case 'event': return <Calendar size={20} className="text-indigo-500" />;
            case 'approval': return <CheckCircle2 size={20} className="text-green-600" />;
            case 'rejection': return <Ban size={20} className="text-red-600" />;
            case 'wave': return <Hand size={20} className="text-yellow-500 animate-wave" />; // ADDED WAVE ICON
            default: return <Info size={20} className="text-gray-500" />;
        }
    };

    if (!isOpen) return null;

    // Check if running on Native Platform
    const isNative = Capacitor.isNativePlatform();

    return (
        <div className="fixed inset-0 z-[99999] flex justify-end h-[100dvh]">
            {/* Backdrop - Click to close */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-in-out"
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div className={`
                relative
                w-full md:w-[420px] h-full
                bg-white dark:bg-[#0F172A] 
                shadow-2xl flex flex-col
                border-l border-gray-200 dark:border-slate-800
                transform transition-transform duration-300 ease-out
                animate-in slide-in-from-right
                z-[100000]
            `}>
                {/* 1. Header - UPDATED: Matches Brand Orange Color */}
                <div className="px-5 py-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] border-b border-orange-600/20 flex justify-between items-center bg-orange-500 text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-xl text-white backdrop-blur-sm">
                            <Bell size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold leading-none">Notifikasi</h2>
                            <p className="text-[10px] opacity-80 mt-1 font-medium">Update terbaru aktivitasmu</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {sortedNotifications.length > 0 && (
                            <span className="bg-white text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                {sortedNotifications.filter(n => !n.isRead).length} Baru
                            </span>
                        )}
                        <button 
                            onClick={onClose}
                            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors active:scale-95"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* 2. Permission Banner (Explicit CTA) - HIDDEN ON NATIVE */}
                {permissionStatus === 'default' && !isNative && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 m-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4 shrink-0">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">
                            <BellRing size={20} className="animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight mb-1">Nyalakan Notifikasi?</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mb-2">Dapatkan info promo & status order langsung di status bar HP kamu.</p>
                            <button 
                                onClick={handleEnableNotifications}
                                disabled={isSubscribing}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full disabled:opacity-50"
                            >
                                {isSubscribing ? 'Mengaktifkan...' : 'Aktifkan Sekarang'}
                            </button>
                        </div>
                    </div>
                )}

                {permissionStatus === 'denied' && !isNative && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 m-3 rounded-xl border border-red-100 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 text-center">
                        <p>Notifikasi diblokir. Silakan aktifkan di pengaturan browser Anda.</p>
                    </div>
                )}

                {/* 3. Content List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gray-50/50 dark:bg-[#0B1120]">
                    {sortedNotifications.length > 0 ? (
                        <div className="space-y-3 pb-32 md:pb-4">
                            {sortedNotifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={`
                                        relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border group
                                        ${notif.isRead 
                                            ? 'bg-white dark:bg-slate-900 border-transparent opacity-75 hover:opacity-100' 
                                            : 'bg-white dark:bg-slate-800 border-orange-200 dark:border-orange-900/40 shadow-sm ring-1 ring-orange-500/10'
                                        }
                                        hover:shadow-md hover:scale-[1.01] active:scale-[0.98]
                                    `}
                                    onClick={() => onItemClick(notif)}
                                >
                                    <div className="flex gap-4">
                                        <div className={`mt-1 shrink-0 ${notif.isRead ? 'opacity-50 grayscale' : ''}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h4 className={`text-sm font-bold truncate pr-2 ${notif.isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                    {notif.title}
                                                </h4>
                                                {!notif.isRead && <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-1.5 animate-pulse"></span>}
                                            </div>
                                            <p className={`text-xs leading-relaxed line-clamp-2 ${notif.isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                                {notif.message}
                                            </p>
                                            
                                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-slate-700/50">
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {new Date(notif.time).toLocaleString('id-ID', { 
                                                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                                                    })}
                                                </p>
                                                
                                                {/* Action Buttons: Explicit Logic for User/Owner */}
                                                <div className="flex gap-2">
                                                    {!notif.isRead && onMarkRead && (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onMarkRead(notif.id); 
                                                            }}
                                                            className="text-blue-500 hover:text-blue-600 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-90 transition-transform"
                                                            title="Tandai Dibaca"
                                                        >
                                                            <Check size={16} />
                                                        </button>
                                                    )}
                                                    {onDelete && (
                                                        <button 
                                                            onClick={(e) => { 
                                                                e.stopPropagation(); 
                                                                onDelete(notif.id); 
                                                            }}
                                                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition-transform"
                                                            title="Hapus Notifikasi"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[50vh] flex flex-col items-center justify-center text-center p-8 text-gray-400">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                <Bell size={32} className="opacity-30" />
                            </div>
                            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Belum ada notifikasi</p>
                            <p className="text-xs mt-2 opacity-60">Semua aman! Nanti kalau ada info promo atau update, bakal muncul di sini.</p>
                        </div>
                    )}
                </div>

                {/* 3. Footer Actions - Sticky & Safe Area Aware */}
                {sortedNotifications.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0F172A] shrink-0 z-40 sticky bottom-0 pb-[calc(env(safe-area-inset-bottom)+100px)] md:pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.1)]">
                        <div className="flex gap-3">
                            <button 
                                onClick={onMarkAllRead}
                                disabled={!onMarkAllRead || sortedNotifications.every(n => n.isRead)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 border border-transparent text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Tandai Semua Dibaca
                            </button>
                            <button 
                                onClick={onClearAll}
                                disabled={!onClearAll}
                                className="flex-1 py-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Hapus Semua
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
