
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CafeContext } from './CafeContext';
import { useAuth } from './AuthContext';

export interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'alert';
    date: Date;
    link?: string;
    isRead: boolean;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const READ_NOTIFS_KEY = 'nongkrongr_read_notifications';
const DELETED_NOTIFS_KEY = 'nongkrongr_deleted_notifications';

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { cafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(READ_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(DELETED_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    // Derive notifications from data
    useEffect(() => {
        const generatedNotifications: NotificationItem[] = [];
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));

        // 1. Global: New Cafes (last 3 days)
        cafes.forEach(cafe => {
            const cafeDate = cafe.created_at ? new Date(cafe.created_at) : new Date(0);
            if (cafeDate > threeDaysAgo && cafe.status === 'approved') {
                const id = `new-cafe-${cafe.id}`;
                if (!deletedIds.has(id)) {
                    generatedNotifications.push({
                        id,
                        title: 'Cafe Baru!',
                        message: `${cafe.name} baru saja hadir di Nongkrongr. Cek sekarang!`,
                        type: 'info',
                        date: cafeDate,
                        link: `/cafe/${cafe.slug}`,
                        isRead: readIds.has(id)
                    });
                }
            }
        });

        // 2. User Specific
        if (currentUser) {
            cafes.forEach(cafe => {
                // A. For Review Authors: Review Status Changes
                cafe.reviews.forEach(review => {
                    if (review.author === currentUser.username && review.status !== 'pending') {
                        // Create unique ID based on status to re-notify if status changes again (rare but possible)
                        const id = `review-status-${review.id}-${review.status}`;
                        if (!deletedIds.has(id)) {
                            const isApproved = review.status === 'approved';
                            generatedNotifications.push({
                                id,
                                title: isApproved ? 'Review Disetujui' : 'Review Ditolak',
                                message: isApproved 
                                    ? `Ulasanmu untuk ${cafe.name} telah ditayangkan.` 
                                    : `Ulasanmu untuk ${cafe.name} tidak dapat ditayangkan.`,
                                type: isApproved ? 'success' : 'alert',
                                date: new Date(review.createdAt), // Using review date as proxy
                                link: isApproved ? `/cafe/${cafe.slug}` : undefined,
                                isRead: readIds.has(id)
                            });
                        }
                    }
                });

                // B. For Cafe Managers: New Reviews
                if (cafe.manager_id === currentUser.id) {
                    cafe.reviews.forEach(review => {
                        const reviewDate = new Date(review.createdAt);
                        // Notify for reviews in the last 7 days to keep it relevant
                        const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
                        
                        if (reviewDate > sevenDaysAgo && review.author !== currentUser.username) {
                            const id = `manager-new-review-${review.id}`;
                            if (!deletedIds.has(id)) {
                                generatedNotifications.push({
                                    id,
                                    title: 'Ulasan Baru Masuk',
                                    message: `${review.author} baru saja mengulas ${cafe.name}.`,
                                    type: 'warning', // Using warning color for attention (yellow/orange)
                                    date: reviewDate,
                                    link: `/admin`, // Direct to dashboard
                                    isRead: readIds.has(id)
                                });
                            }
                        }
                    });
                }
            });
        }

        // Sort by date descending
        generatedNotifications.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(generatedNotifications);

    }, [cafes, currentUser, readIds, deletedIds]);

    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            const newReadIds = new Set(readIds).add(id);
            setReadIds(newReadIds);
            localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(newReadIds)));
        }
    };

    const markAllAsRead = () => {
        const newReadIds = new Set(readIds);
        notifications.forEach(n => newReadIds.add(n.id));
        setReadIds(newReadIds);
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(newReadIds)));
    };

    const clearAll = () => {
        const newDeletedIds = new Set(deletedIds);
        notifications.forEach(n => newDeletedIds.add(n.id));
        setDeletedIds(newDeletedIds);
        localStorage.setItem(DELETED_NOTIFS_KEY, JSON.stringify(Array.from(newDeletedIds)));
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
