
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { BellIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, TrashIcon, CheckIcon, EnvelopeIcon, UserPlusIcon, ArrowPathIcon, XMarkIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';

const NotificationItemComp: React.FC<{ item: NotificationItem, onRead: () => void, onDelete: (id: string) => void, onClose: () => void }> = ({ item, onRead, onDelete, onClose }) => {
    
    // --- STYLE & ICON MAPPING ---
    const getStyleProps = () => {
        // Default Info
        let icon = <InformationCircleIcon className="h-5 w-5 text-brand" />;
        let bgIcon = "bg-brand/10";
        let borderAccent = "border-l-4 border-brand";

        // Specific Cases based on ID content
        if (item.id.includes('feedback')) {
             icon = <EnvelopeIcon className="h-5 w-5 text-amber-600" />;
             bgIcon = "bg-amber-100 dark:bg-amber-900/30";
             borderAccent = "border-l-4 border-amber-500";
        } else if (item.id.includes('new-user')) {
             icon = <UserPlusIcon className="h-5 w-5 text-blue-600" />;
             bgIcon = "bg-blue-100 dark:bg-blue-900/30";
             borderAccent = "border-l-4 border-blue-500";
        } else if (item.id.includes('review')) {
             icon = <ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-purple-600" />;
             bgIcon = "bg-purple-100 dark:bg-purple-900/30";
             borderAccent = "border-l-4 border-purple-500";
        } 
        // Generic Types Overrides
        else {
            switch (item.type) {
                case 'success': 
                    icon = <CheckCircleIcon className="h-5 w-5 text-emerald-600" />;
                    bgIcon = "bg-emerald-100 dark:bg-emerald-900/30";
                    borderAccent = "border-l-4 border-emerald-500";
                    break;
                case 'alert': 
                    icon = <XCircleIcon className="h-5 w-5 text-rose-600" />;
                    bgIcon = "bg-rose-100 dark:bg-rose-900/30";
                    borderAccent = "border-l-4 border-rose-500";
                    break;
                case 'warning': 
                    icon = <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />;
                    bgIcon = "bg-amber-100 dark:bg-amber-900/30";
                    borderAccent = "border-l-4 border-amber-500";
                    break;
                default:
                    // Info default set above
                    break;
            }
        }
        
        return { icon, bgIcon, borderAccent };
    };

    const { icon, bgIcon, borderAccent } = getStyleProps();

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete(item.id);
    };

    const content = (
        <div className={`flex gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors relative group ${!item.isRead ? `bg-brand/5 dark:bg-brand/10 ${borderAccent}` : 'border-l-4 border-transparent pl-4'}`}>
            
            {/* Icon Container */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${bgIcon}`}>
                {icon}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0 pr-6 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm text-primary dark:text-gray-200 leading-tight ${!item.isRead ? 'font-bold' : 'font-semibold'}`}>
                        {item.title}
                    </p>
                </div>
                
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                    {item.highlightText && <span className="font-bold text-primary dark:text-white mr-1">{item.highlightText}</span>}
                    {item.message}
                </p>
                
                <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                    {item.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                     <span className="mx-1">•</span>
                    {item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                </p>
            </div>

            {/* Delete Action */}
            <button 
                onClick={handleDelete}
                className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 transform scale-90 group-hover:scale-100"
                title="Hapus notifikasi"
            >
                <XMarkIcon className="h-4 w-4" />
            </button>
        </div>
    );

    if (item.link) {
        return (
            <Link to={item.link} onClick={() => { onRead(); onClose(); }} className="block border-b border-border last:border-0">
                {content}
            </Link>
        );
    }

    return (
        <div onClick={onRead} className="block border-b border-border last:border-0 cursor-default">
            {content}
        </div>
    );
};

const GroupHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="px-4 py-2 bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-md text-[10px] font-bold text-muted uppercase tracking-wider sticky top-0 z-10 border-b border-border/50 shadow-sm">
        {title}
    </div>
);

const NotificationPanel: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll, refresh } = useNotifications();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refresh();
        } finally {
            setTimeout(() => setIsRefreshing(false), 800); // Minimum spin time
        }
    }, [refresh, isRefreshing]);

    // Auto-refresh when opened
    useEffect(() => {
        if (isOpen) {
            handleRefresh();
        }
    }, [isOpen]);

    // Grouping Logic
    const groupedNotifications = useMemo(() => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const groups = {
            today: [] as NotificationItem[],
            yesterday: [] as NotificationItem[],
            older: [] as NotificationItem[]
        };

        notifications.forEach(item => {
            const itemDate = new Date(item.date);
            if (itemDate.toDateString() === today.toDateString()) {
                groups.today.push(item);
            } else if (itemDate.toDateString() === yesterday.toDateString()) {
                groups.yesterday.push(item);
            } else {
                groups.older.push(item);
            }
        });
        return groups;
    }, [notifications]);

    if (!isOpen) return null;

    return (
        <div className="fixed left-4 right-4 top-20 w-auto sm:absolute sm:top-full sm:right-0 sm:left-auto sm:-right-10 sm:mt-3 sm:w-96 bg-card dark:bg-gray-800 rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-fade-in-up origin-top sm:origin-top-right flex flex-col max-h-[80vh] sm:max-h-[500px]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-card dark:bg-gray-800 z-20">
                <div className="flex items-center gap-2">
                     <h3 className="font-bold font-jakarta text-base">Notifikasi</h3>
                     {unreadCount > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">{unreadCount}</span>}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-full transition-colors"
                        title="Refresh"
                    >
                        <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
                    </button>
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead} 
                            className="p-1.5 text-brand hover:bg-brand/10 rounded-full transition-colors"
                            title="Tandai semua sudah dibaca"
                        >
                            <CheckIcon className="h-4 w-4" />
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button 
                            onClick={clearAll} 
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                            title="Hapus semua"
                        >
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {notifications.length > 0 ? (
                    <>
                        {groupedNotifications.today.length > 0 && (
                            <>
                                <GroupHeader title="Hari Ini" />
                                {groupedNotifications.today.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onDelete={deleteNotification} onClose={onClose} />
                                ))}
                            </>
                        )}
                        {groupedNotifications.yesterday.length > 0 && (
                            <>
                                <GroupHeader title="Kemarin" />
                                {groupedNotifications.yesterday.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onDelete={deleteNotification} onClose={onClose} />
                                ))}
                            </>
                        )}
                        {groupedNotifications.older.length > 0 && (
                            <>
                                <GroupHeader title="Sebelumnya" />
                                {groupedNotifications.older.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onDelete={deleteNotification} onClose={onClose} />
                                ))}
                            </>
                        )}
                    </>
                ) : (
                    <div className="p-12 text-center text-muted flex flex-col items-center justify-center h-full">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-3">
                            <BellIcon className="h-8 w-8 opacity-30" />
                        </div>
                        <p className="text-sm font-medium">Belum ada notifikasi baru</p>
                        <p className="text-xs mt-1 opacity-70">Notifikasi aktivitas terbaru akan muncul di sini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
