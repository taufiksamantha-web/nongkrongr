
import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications, NotificationItem } from '../context/NotificationContext';
import { BellIcon, CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/solid';

const NotificationItemComp: React.FC<{ item: NotificationItem, onRead: () => void, onClose: () => void }> = ({ item, onRead, onClose }) => {
    const getIcon = () => {
        switch (item.type) {
            case 'success': return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
            case 'alert': return <XCircleIcon className="h-6 w-6 text-red-500" />;
            case 'warning': return <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />;
            default: return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
        }
    };

    const content = (
        <div className={`flex gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!item.isRead ? 'bg-brand/5 dark:bg-brand/10' : ''}`}>
            <div className="flex-shrink-0 mt-1">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold text-primary dark:text-gray-200 ${!item.isRead ? 'font-extrabold' : ''}`}>
                    {item.title}
                    {!item.isRead && <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>}
                </p>
                <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">
                    {item.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {item.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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

const NotificationPanel: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

    if (!isOpen) return null;

    return (
        <div className="absolute top-full right-0 sm:-right-10 mt-3 w-80 sm:w-96 bg-card dark:bg-gray-800 rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-fade-in-up origin-top-right">
            <div className="p-4 border-b border-border flex justify-between items-center bg-soft/50 backdrop-blur-sm">
                <h3 className="font-bold font-jakarta text-lg">Notifikasi</h3>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button 
                            onClick={markAllAsRead} 
                            className="p-1.5 text-brand hover:bg-brand/10 rounded-full transition-colors"
                            title="Tandai semua sudah dibaca"
                        >
                            <CheckIcon className="h-5 w-5" />
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button 
                            onClick={clearAll} 
                            className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                            title="Hapus semua"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notif => (
                        <NotificationItemComp 
                            key={notif.id} 
                            item={notif} 
                            onRead={() => markAsRead(notif.id)} 
                            onClose={onClose}
                        />
                    ))
                ) : (
                    <div className="p-8 text-center text-muted">
                        <BellIcon className="h-12 w-12 mx-auto mb-2 opacity-20" />
                        <p>Belum ada notifikasi baru</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
