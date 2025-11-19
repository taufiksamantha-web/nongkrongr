
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
    
    // Realtime Data Buffers
    const [newFeedbacks, setNewFeedbacks] = useState<MinimalFeedback[]>([]);
    const [newUsers, setNewUsers] = useState<MinimalProfile[]>([]);
    const [newCafes, setNewCafes] = useState<MinimalCafe[]>([]);
    const [newReviews, setNewReviews] = useState<MinimalReview[]>([]);

    const [readIds, setReadIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(READ_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });
    const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(DELETED_NOTIFS_KEY);
        return stored ? new Set(JSON.parse(stored)) : new Set();
    });

    // 1. Realtime Subscriptions based on Role
    useEffect(() => {
        const channels: ReturnType<typeof supabase.channel>[] = [];

        if (currentUser?.role === 'admin') {
            // --- ADMIN SUBSCRIPTIONS ---
            const adminChannel = supabase.channel('admin-dashboard-notifications')
                // New Users
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                    const newUser = payload.new as MinimalProfile;
                    // Inject current time if created_at is missing in DB schema for profiles
                    const userWithTime = { ...newUser, created_at: newUser.created_at || new Date().toISOString() };
                    setNewUsers(prev => [userWithTime, ...prev]);
                })
                // New Feedback
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
                    setNewFeedbacks(prev => [payload.new as MinimalFeedback, ...prev]);
                })
                // New Cafes (Pending)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafes' }, (payload) => {
                    if (payload.new.status === 'pending') {
                        setNewCafes(prev => [payload.new as MinimalCafe, ...prev]);
                    }
                })
                // New Reviews (Pending)
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
                     if (payload.new.status === 'pending') {
                        setNewReviews(prev => [payload.new as MinimalReview, ...prev]);
                    }
                })
                .subscribe();
            
            channels.push(adminChannel);
        } 
        
        if (currentUser) {
            // --- USER/MANAGER SUBSCRIPTIONS ---
            const userChannel = supabase.channel(`user-notifications-${currentUser.id}`)
                // Cafe Status Changes (For Managers)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes' }, (payload) => {
                    const newCafe = payload.new as MinimalCafe;
                    const oldCafe = payload.old as MinimalCafe;
                    
                    // Notify if I am the manager and status changed
                    if (newCafe.manager_id === currentUser.id && newCafe.status !== oldCafe.status) {
                         // Add to local state to trigger re-render of notifications list
                         // We reuse the newCafes buffer but mark it specially or handle in derivation logic
                         setNewCafes(prev => [newCafe, ...prev]);
                    }
                })
                .subscribe();
            
            channels.push(userChannel);
        }

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [currentUser]);

    // 2. Derive notifications from Data & Realtime Buffers
    useEffect(() => {
        const generatedNotifications: NotificationItem[] = [];
        const now = new Date();
        
        // Helper to add notification safely
        const addNotif = (item: NotificationItem) => {
            if (!deletedIds.has(item.id)) generatedNotifications.push(item);
        };

        // --- ADMIN NOTIFICATIONS ---
        if (currentUser?.role === 'admin') {
            // 1. New Users (Realtime)
            newUsers.forEach(user => {
                addNotif({
                    id: `admin-new-user-${user.id}`,
                    title: 'Pendaftaran User Baru',
                    message: `${user.username} mendaftar sebagai ${user.role === 'admin_cafe' ? 'Pengelola' : 'User'}.`,
                    type: 'info',
                    date: user.created_at ? new Date(user.created_at) : new Date(),
                    link: '/admin',
                    isRead: readIds.has(`admin-new-user-${user.id}`)
                });
            });

            // 2. New Feedback (Realtime)
            newFeedbacks.forEach(fb => {
                addNotif({
                    id: `admin-feedback-${fb.id}`,
                    title: 'Masukan Baru',
                    message: `Dari ${fb.name}: "${fb.message.substring(0, 40)}..."`,
                    type: 'warning',
                    date: new Date(fb.created_at),
                    link: '/admin',
                    isRead: readIds.has(`admin-feedback-${fb.id}`)
                });
            });

            // 3. New Cafes (Realtime)
            newCafes.forEach(cafe => {
                if (cafe.status === 'pending') {
                     addNotif({
                        id: `admin-new-cafe-${cafe.id}`,
                        title: 'Cafe Baru Menunggu Review',
                        message: `${cafe.name} perlu persetujuan untuk ditayangkan.`,
                        type: 'info',
                        date: new Date(cafe.created_at),
                        link: '/admin',
                        isRead: readIds.has(`admin-new-cafe-${cafe.id}`)
                    });
                }
            });

            // 4. New Reviews (Realtime)
            newReviews.forEach(review => {
                if (review.status === 'pending') {
                    addNotif({
                        id: `admin-new-review-${review.id}`,
                        title: 'Review Baru Masuk',
                        message: `Review baru dari ${review.author} menunggu moderasi.`,
                        type: 'info',
                        date: new Date(review.created_at),
                        link: '/admin',
                        isRead: readIds.has(`admin-new-review-${review.id}`)
                    });
                }
            });
        }

        // --- USER / MANAGER NOTIFICATIONS ---
        if (currentUser) {
             // 1. Cafe Status Updates (Approved/Rejected) - From Realtime Buffer or existing List
             // Checking Realtime Buffer for immediate updates
             newCafes.forEach(cafe => {
                if (cafe.manager_id === currentUser.id) {
                    if (cafe.status === 'approved') {
                         addNotif({
                            id: `cafe-approved-${cafe.id}-${Date.now()}`, // Unique ID per event
                            title: 'Cafe Anda Disetujui!',
                            message: `Selamat! ${cafe.name} telah disetujui dan sekarang tayang di publik.`,
                            type: 'success',
                            date: new Date(),
                            link: `/cafe/${cafe.slug}`,
                            isRead: false
                        });
                    } else if (cafe.status === 'rejected') {
                         addNotif({
                            id: `cafe-rejected-${cafe.id}-${Date.now()}`,
                            title: 'Pendaftaran Cafe Ditolak',
                            message: `Maaf, ${cafe.name} belum memenuhi kriteria kami. Silakan cek kembali data Anda.`,
                            type: 'alert',
                            date: new Date(),
                            link: '/admin',
                            isRead: false
                        });
                    }
                }
             });

            // 2. Review Status (Approved/Rejected) - From Loaded Data
            cafes.forEach(cafe => {
                cafe.reviews.forEach(review => {
                    if (review.author === currentUser.username && review.status !== 'pending') {
                        const id = `review-status-${review.id}-${review.status}`;
                        const isApproved = review.status === 'approved';
                        addNotif({
                            id,
                            title: isApproved ? 'Review Disetujui' : 'Review Ditolak',
                            message: isApproved 
                                ? `Ulasanmu untuk ${cafe.name} telah ditayangkan.` 
                                : `Ulasanmu untuk ${cafe.name} tidak dapat ditayangkan.`,
                            type: isApproved ? 'success' : 'alert',
                            date: new Date(review.createdAt),
                            link: isApproved ? `/cafe/${cafe.slug}` : undefined,
                            isRead: readIds.has(id)
                        });
                    }
                });
            });
        }

        // Sort: Unread first, then by date
        generatedNotifications.sort((a, b) => {
            if (a.isRead === b.isRead) {
                return b.date.getTime() - a.date.getTime();
            }
            return a.isRead ? 1 : -1;
        });

        setNotifications(generatedNotifications);

    }, [cafes, currentUser, readIds, deletedIds, newFeedbacks, newUsers, newCafes, newReviews]);

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
        
        // Also clear buffers to remove realtime items from view
        setNewFeedbacks([]);
        setNewUsers([]);
        setNewCafes([]);
        setNewReviews([]);
        
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
