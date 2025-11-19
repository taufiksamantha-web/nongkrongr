
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CafeContext } from './CafeContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

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

// Define minimal interfaces for Realtime payloads
interface MinimalFeedback { id: number; name: string; message: string; created_at: string; status: string; }
interface MinimalProfile { id: string; username: string; role: string; created_at?: string; }
interface MinimalCafe { id: string; name: string; slug: string; manager_id: string; status: string; created_at: string; }
interface MinimalReview { id: string; author: string; cafe_id: string; status: string; created_at: string; }

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { cafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    // Persistence states
    const [readIds, setReadIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(READ_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(DELETED_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    // Setup Realtime Subscriptions and Notifications
    useEffect(() => {
        const channels: ReturnType<typeof supabase.channel>[] = [];

        // Helper to check if deleted
        const isDeleted = (id: string) => deletedIds.has(id);
        const isRead = (id: string) => readIds.has(id);

        if (currentUser?.role === 'admin') {
            // --- ADMIN REALTIME NOTIFICATIONS ---
            const adminChannel = supabase.channel('admin-notifications')
                // 1. New User Registration
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                    const user = payload.new as MinimalProfile;
                    const notifId = `admin-new-user-${user.id}`;
                    
                    if (!isDeleted(notifId)) {
                        const newItem: NotificationItem = {
                            id: notifId,
                            title: 'Pendaftaran User Baru',
                            message: `${user.username} mendaftar sebagai ${user.role === 'admin_cafe' ? 'Pengelola' : 'User'}.`,
                            type: 'info',
                            date: new Date(), // Use current time for realtime
                            link: '/admin',
                            isRead: false
                        };
                        setNotifications(prev => [newItem, ...prev]);
                    }
                })
                // 2. New Feedback
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
                    const fb = payload.new as MinimalFeedback;
                    const notifId = `admin-feedback-${fb.id}`;

                    if (!isDeleted(notifId)) {
                        const newItem: NotificationItem = {
                            id: notifId,
                            title: 'Masukan Baru',
                            message: `Dari ${fb.name}: "${fb.message.substring(0, 40)}..."`,
                            type: 'warning',
                            date: new Date(),
                            link: '/admin',
                            isRead: false
                        };
                        setNotifications(prev => [newItem, ...prev]);
                    }
                })
                // 3. New Cafe (Pending)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafes' }, (payload) => {
                    const cafe = payload.new as MinimalCafe;
                    if (cafe.status === 'pending') {
                        const notifId = `admin-new-cafe-${cafe.id}`;
                        if (!isDeleted(notifId)) {
                            const newItem: NotificationItem = {
                                id: notifId,
                                title: 'Cafe Baru Menunggu Review',
                                message: `${cafe.name} perlu persetujuan untuk ditayangkan.`,
                                type: 'info',
                                date: new Date(),
                                link: '/admin',
                                isRead: false
                            };
                            setNotifications(prev => [newItem, ...prev]);
                        }
                    }
                })
                .subscribe();
            
            channels.push(adminChannel);
        } 
        
        if (currentUser) {
            // --- USER/MANAGER NOTIFICATIONS (Existing Logic + Realtime) ---
            
            // We still need to check existing data (cafes context) for reviews and status updates 
            // that happened while offline or on load.
            const derivedNotifications: NotificationItem[] = [];
            
            // Cafe Status Changes (Approved/Rejected) logic is tricky in realtime because we need 'old' and 'new'.
            // We rely on the CafeContext keeping 'cafes' updated, and we re-run this effect when 'cafes' changes?
            // Ideally, we separate "Historical/Data-driven" notifs from "Realtime/Event" notifs.
            
            // 1. Check Loaded Data for notifications
            cafes.forEach(cafe => {
                // Check for Review Status (User)
                cafe.reviews.forEach(review => {
                    if (review.author === currentUser.username && review.status !== 'pending') {
                        const id = `review-status-${review.id}-${review.status}`;
                        if (!isDeleted(id)) {
                            const isApproved = review.status === 'approved';
                            derivedNotifications.push({
                                id,
                                title: isApproved ? 'Review Disetujui' : 'Review Ditolak',
                                message: isApproved 
                                    ? `Ulasanmu untuk ${cafe.name} telah ditayangkan.` 
                                    : `Ulasanmu untuk ${cafe.name} tidak dapat ditayangkan.`,
                                type: isApproved ? 'success' : 'alert',
                                date: new Date(review.createdAt),
                                link: isApproved ? `/cafe/${cafe.slug}` : undefined,
                                isRead: isRead(id)
                            });
                        }
                    }
                });

                // Check for Cafe Approval (Manager)
                if (cafe.manager_id === currentUser.id) {
                    if (cafe.status === 'approved') {
                        const id = `cafe-approved-${cafe.id}`;
                         if (!isDeleted(id)) {
                            derivedNotifications.push({
                                id,
                                title: 'Cafe Anda Disetujui!',
                                message: `Selamat! ${cafe.name} telah disetujui dan sekarang tayang di publik.`,
                                type: 'success',
                                date: cafe.created_at ? new Date(cafe.created_at) : new Date(), // Approximate
                                link: `/cafe/${cafe.slug}`,
                                isRead: isRead(id)
                            });
                         }
                    } else if (cafe.status === 'rejected') {
                        const id = `cafe-rejected-${cafe.id}`;
                        if (!isDeleted(id)) {
                            derivedNotifications.push({
                                id,
                                title: 'Pendaftaran Cafe Ditolak',
                                message: `Maaf, ${cafe.name} belum memenuhi kriteria kami. Silakan cek kembali data Anda.`,
                                type: 'alert',
                                date: cafe.created_at ? new Date(cafe.created_at) : new Date(),
                                link: '/admin',
                                isRead: isRead(id)
                            });
                        }
                    }
                }
            });

            // Merge derived with existing (avoid duplicates)
            setNotifications(prev => {
                const existingIds = new Set(prev.map(n => n.id));
                const newUnique = derivedNotifications.filter(n => !existingIds.has(n.id));
                return [...newUnique, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime());
            });
        }

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [currentUser, cafes, readIds, deletedIds]);

    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            const newReadIds = new Set(readIds).add(id);
            setReadIds(newReadIds);
            localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(newReadIds)));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        }
    };

    const markAllAsRead = () => {
        const newReadIds = new Set(readIds);
        notifications.forEach(n => newReadIds.add(n.id));
        setReadIds(newReadIds);
        localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(Array.from(newReadIds)));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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
