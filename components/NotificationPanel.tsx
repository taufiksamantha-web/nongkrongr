
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { BellIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, TrashIcon, CheckIcon, EnvelopeIcon, UserPlusIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const NotificationItemComp: React.FC<{ item: NotificationItem, onRead: () => void, onClose: () => void }> = ({ item, onRead, onClose }) => {
    const getIcon = () => {
        if (item.id.includes('feedback')) return <EnvelopeIcon className="h-5 w-5 text-purple-500" />;
        if (item.id.includes('new-user')) return <UserPlusIcon className="h-5 w-5 text-blue-500" />;

        switch (item.type) {
            case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
            case 'alert': return <XCircleIcon className="h-5 w-5 text-red-500" />;
            case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />;
            default: return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
        }
    };

    const content = (
        <div className={`flex gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!item.isRead ? 'bg-brand/5 dark:bg-brand/10' : ''}`}>
            <div className="flex-shrink-0 mt-0.5">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm text-primary dark:text-gray-200 ${!item.isRead ? 'font-bold' : 'font-medium'}`}>
                    {item.title}
                    {!item.isRead && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full align-middle"></span>}
                </p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">
                    {item.highlightText && <span className="font-bold text-primary dark:text-white mr-1">{item.highlightText}</span>}
                    {item.message}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                    {item.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
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
    <div className="px-4 py-1 bg-gray-100 dark:bg-gray-700/80 text-[10px] font-bold text-muted uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm">
        {title}
    </div>
);

const NotificationPanel: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, refresh } = useNotifications();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refresh();
        } finally {
            setTimeout(() => setIsRefreshing(false), 500);
        }
    };

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
        <div className="fixed left-4 right-4 top-20 w-auto sm:absolute sm:top-full sm:right-0 sm:left-auto sm:-right-10 sm:mt-3 sm:w-96 bg-card dark:bg-gray-800 rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-fade-in-up origin-top sm:origin-top-right">
            <div className="p-4 border-b border-border flex justify-between items-center bg-soft/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                     <h3 className="font-bold font-jakarta text-base">Notifikasi</h3>
                     {unreadCount > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-full transition-colors"
                        title="Refresh"
                        disabled={isRefreshing}
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
            
            <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                {notifications.length > 0 ? (
                    <>
                        {groupedNotifications.today.length > 0 && (
                            <>
                                <GroupHeader title="Hari Ini" />
                                {groupedNotifications.today.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onClose={onClose} />
                                ))}
                            </>
                        )}
                        {groupedNotifications.yesterday.length > 0 && (
                            <>
                                <GroupHeader title="Kemarin" />
                                {groupedNotifications.yesterday.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onClose={onClose} />
                                ))}
                            </>
                        )}
                        {groupedNotifications.older.length > 0 && (
                            <>
                                <GroupHeader title="Sebelumnya" />
                                {groupedNotifications.older.map(notif => (
                                    <NotificationItemComp key={notif.id} item={notif} onRead={() => markAsRead(notif.id)} onClose={onClose} />
                                ))}
                            </>
                        )}
                    </>
                ) : (
                    <div className="p-8 text-center text-muted flex flex-col items-center">
                        <BellIcon className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-sm">Belum ada notifikasi baru</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
