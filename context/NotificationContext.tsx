
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
    highlightText?: string; // New field for cafe name or key info
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearAll: () => void;
    refresh: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Constants for Guest storage keys
const GUEST_READ_KEY = 'nongkrongr_guest_read_notifications';
const GUEST_DELETED_KEY = 'nongkrongr_guest_deleted_notifications';

// Define minimal interfaces for Realtime payloads
interface MinimalFeedback { id: number; name: string; message: string; created_at: string; status: string; }
interface MinimalProfile { id: string; username: string; role: string; created_at?: string; }
interface MinimalCafe { id: string; name: string; slug: string; manager_id: string; status: string; created_at: string; }

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fetchCafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    // State for Read/Deleted IDs (In-Memory Source of Truth)
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isStateLoaded, setIsStateLoaded] = useState(false);

    // --- PERSISTENCE LOGIC ---

    // 1. Load State (DB for User, LocalStorage for Guest)
    useEffect(() => {
        const loadState = async () => {
            setIsStateLoaded(false);
            
            if (currentUser) {
                // USER: Fetch from Database
                const { data, error } = await supabase
                    .from('user_notifications_state')
                    .select('notification_id, is_read, is_deleted')
                    .eq('user_id', currentUser.id);
                
                if (!error && data) {
                    const newReadIds = new Set<string>();
                    const newDeletedIds = new Set<string>();
                    
                    data.forEach(row => {
                        if (row.is_read) newReadIds.add(row.notification_id);
                        if (row.is_deleted) newDeletedIds.add(row.notification_id);
                    });
                    
                    setReadIds(newReadIds);
                    setDeletedIds(newDeletedIds);
                }
            } else {
                // GUEST: Fetch from LocalStorage
                const storedRead = localStorage.getItem(GUEST_READ_KEY);
                const storedDeleted = localStorage.getItem(GUEST_DELETED_KEY);
                
                try {
                    setReadIds(new Set(storedRead ? JSON.parse(storedRead) : []));
                    setDeletedIds(new Set(storedDeleted ? JSON.parse(storedDeleted) : []));
                } catch (e) {
                    setReadIds(new Set());
                    setDeletedIds(new Set());
                }
            }
            
            setIsStateLoaded(true);
        };

        loadState();
    }, [currentUser]);

    // 2. Save State Helpers
    const persistReadState = async (id: string) => {
        if (currentUser) {
            // DB Upsert
            await supabase.from('user_notifications_state').upsert({
                user_id: currentUser.id,
                notification_id: id,
                is_read: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id, notification_id' });
        } else {
            // LocalStorage
            const currentRead = new Set(readIds).add(id);
            localStorage.setItem(GUEST_READ_KEY, JSON.stringify(Array.from(currentRead)));
        }
    };

    const persistBatchState = async (ids: string[], type: 'read' | 'deleted') => {
        if (currentUser) {
             const updates = ids.map(id => ({
                user_id: currentUser.id,
                notification_id: id,
                [type === 'read' ? 'is_read' : 'is_deleted']: true,
                updated_at: new Date().toISOString()
             }));
             
             await supabase.from('user_notifications_state').upsert(updates, { onConflict: 'user_id, notification_id' });
        } else {
            if (type === 'read') {
                const currentRead = new Set([...readIds, ...ids]);
                localStorage.setItem(GUEST_READ_KEY, JSON.stringify(Array.from(currentRead)));
            } else {
                const currentDeleted = new Set([...deletedIds, ...ids]);
                localStorage.setItem(GUEST_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));
            }
        }
    }


    // --- NOTIFICATION GENERATION LOGIC ---
    
    const isDeleted = useCallback((id: string) => deletedIds.has(id), [deletedIds]);
    const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

    const sendBrowserNotification = useCallback((title: string, body: string, link?: string) => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                const notification = new Notification(title, {
                    body: body,
                    icon: 'https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png',
                    tag: 'nongkrongr-notification',
                });
                if (link) {
                    notification.onclick = () => {
                        window.location.href = `#${link}`;
                        window.focus();
                    };
                }
            } catch (e) { console.error("Notification Error:", e); }
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!isStateLoaded) return;
        
        const fetchedNotifs: NotificationItem[] = [];

        // 1. GLOBAL: New Cafes (Last 7 Days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentCafes } = await supabase
            .from('cafes')
            .select('id, name, slug, created_at, status')
            .eq('status', 'approved')
            .gt('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        recentCafes?.forEach(cafe => {
            const id = `new-cafe-${cafe.id}`;
            if (!isDeleted(id)) {
                fetchedNotifs.push({
                    id,
                    title: 'Cafe Baru!',
                    message: `baru saja hadir di Nongkrongr. Cek sekarang!`,
                    highlightText: cafe.name,
                    type: 'success',
                    date: new Date(cafe.created_at),
                    link: `/cafe/${cafe.slug}`,
                    isRead: isRead(id)
                });
            }
        });

        // 2. PERSONAL: User & Manager
        if (currentUser) {
            // A. Reviews
            const { data: myReviews } = await supabase
                .from('reviews')
                .select('id, status, created_at, cafes(name, slug)')
                .eq('author', currentUser.username)
                .neq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(10);
            
            myReviews?.forEach((r: any) => {
                const id = `review-${r.id}-${r.status}`;
                if (!isDeleted(id)) {
                    const isApproved = r.status === 'approved';
                    fetchedNotifs.push({
                        id,
                        title: isApproved ? 'Review Disetujui' : 'Review Ditolak',
                        message: isApproved 
                            ? `Ulasanmu di ${r.cafes?.name || 'cafe'} telah ditayangkan.` 
                            : `Ulasanmu di ${r.cafes?.name || 'cafe'} tidak dapat ditayangkan.`,
                        type: isApproved ? 'success' : 'alert',
                        date: new Date(r.created_at),
                        link: isApproved ? `/cafe/${r.cafes?.slug}` : undefined,
                        isRead: isRead(id)
                    });
                }
            });

            // B. Cafe Status
            if (currentUser.role === 'admin_cafe') {
                const { data: myCafes } = await supabase
                    .from('cafes')
                    .select('id, name, slug, status, created_at')
                    .eq('manager_id', currentUser.id)
                    .in('status', ['approved', 'rejected'])
                    .order('created_at', { ascending: false })
                    .limit(5);

                myCafes?.forEach(cafe => {
                     const id = `cafe-status-${cafe.id}-${cafe.status}`;
                     if (!isDeleted(id)) {
                        const isApproved = cafe.status === 'approved';
                        fetchedNotifs.push({
                            id,
                            title: isApproved ? 'Cafe Disetujui' : 'Cafe Ditolak',
                            message: isApproved 
                                ? `Selamat! telah disetujui.` 
                                : `Maaf, pendaftaran ditolak.`,
                            highlightText: cafe.name,
                            type: isApproved ? 'success' : 'alert',
                            date: new Date(cafe.created_at),
                            link: isApproved ? `/cafe/${cafe.slug}` : '/dashboard-pengelola',
                            isRead: isRead(id)
                        });
                     }
                });
            }
        }

        setNotifications(prev => {
            const combined = [...fetchedNotifs];
            const uniqueMap = new Map();
            combined.forEach(item => uniqueMap.set(item.id, item));
            
            // Merge with previous items not in fetch (realtime ones)
            prev.forEach(item => {
                if (!uniqueMap.has(item.id)) {
                     uniqueMap.set(item.id, { ...item, isRead: isRead(item.id) });
                }
            });

            const unique = Array.from(uniqueMap.values());
            return unique.sort((a, b) => b.date.getTime() - a.date.getTime());
        });
    }, [currentUser, isStateLoaded, isDeleted, isRead]);

    useEffect(() => {
        fetchNotifications();
    }, [isStateLoaded, fetchNotifications]);

    // --- REALTIME ---
    useEffect(() => {
        if (!isStateLoaded) return;

        const channels: ReturnType<typeof supabase.channel>[] = [];

        // 1. New Cafe
        const globalChannel = supabase.channel('global-cafe-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: 'status=eq.approved' }, (payload) => {
                const cafe = payload.new as MinimalCafe;
                const id = `new-cafe-${cafe.id}`;
                if (!isDeleted(id)) {
                    const title = 'Cafe Baru!';
                    const msg = `baru saja hadir di Nongkrongr.`;
                    const link = `/cafe/${cafe.slug}`;
                    
                    setNotifications(prev => {
                        const filtered = prev.filter(n => n.id !== id);
                        return [{
                            id, title, message: msg, highlightText: cafe.name, type: 'success', date: new Date(), link, isRead: isRead(id)
                        }, ...filtered];
                    });
                    sendBrowserNotification(title, `${cafe.name} ${msg}`, link);
                }
            })
            .subscribe();
        channels.push(globalChannel);
        
        // 2. Watch notification state changes (Sync across devices)
        if (currentUser) {
            const stateChannel = supabase.channel(`user-notif-state-${currentUser.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications_state', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
                    // Refresh internal state from DB to sync read/deleted status
                     const { new: newData } = payload;
                     if (newData) {
                        if (newData.is_read) setReadIds(prev => new Set(prev).add(newData.notification_id));
                        if (newData.is_deleted) setDeletedIds(prev => new Set(prev).add(newData.notification_id));
                     }
                })
                .subscribe();
             channels.push(stateChannel);
        }
        
        // 2. ADMIN LISTENERS
        if (currentUser?.role === 'admin') {
            const adminChannel = supabase.channel('admin-notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                    const user = payload.new as MinimalProfile;
                    const notifId = `admin-new-user-${user.id}`;
                    if (!isDeleted(notifId)) {
                        const title = 'Pendaftaran User Baru';
                        const msg = `${user.username} mendaftar sebagai ${user.role === 'admin_cafe' ? 'Pengelola' : 'User'}.`;
                        const link = '/dashboard-admin';
                        
                        setNotifications(prev => [{
                            id: notifId,
                            title,
                            message: msg,
                            type: 'info',
                            date: new Date(),
                            link,
                            isRead: isRead(notifId)
                        }, ...prev]);

                        sendBrowserNotification(title, msg, link);
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
                    const fb = payload.new as MinimalFeedback;
                    const notifId = `admin-feedback-${fb.id}`;
                    if (!isDeleted(notifId)) {
                        const title = 'Masukan Baru';
                        const msg = `Dari ${fb.name}: "${fb.message.substring(0, 40)}..."`;
                        const link = '/dashboard-admin';
                        
                        setNotifications(prev => [{
                            id: notifId,
                            title,
                            message: msg,
                            type: 'warning',
                            date: new Date(),
                            link,
                            isRead: isRead(notifId)
                        }, ...prev]);

                        sendBrowserNotification(title, msg, link);
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafes' }, (payload) => {
                    const cafe = payload.new as MinimalCafe;
                    if (cafe.status === 'pending') {
                        const notifId = `admin-new-cafe-${cafe.id}`;
                        if (!isDeleted(notifId)) {
                            const title = 'Cafe Baru Menunggu Review';
                            const msg = `perlu persetujuan untuk ditayangkan.`;
                            const link = '/dashboard-admin';

                            setNotifications(prev => [{
                                id: notifId,
                                title,
                                message: msg,
                                highlightText: cafe.name,
                                type: 'info',
                                date: new Date(),
                                link,
                                isRead: isRead(notifId)
                            }, ...prev]);

                            sendBrowserNotification(title, `${cafe.name} ${msg}`, link);
                        }
                    }
                })
                .subscribe();
            channels.push(adminChannel);
        }

        // 3. PERSONAL LISTENERS (User/Manager)
        if (currentUser) {
            const userChannel = supabase.channel(`user-personal-${currentUser.id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews', filter: `author=eq.${currentUser.username}` }, async (payload) => {
                    const r = payload.new as any;
                    if (r.status === 'pending') return;

                    const { data: cafe } = await supabase.from('cafes').select('name, slug').eq('id', r.cafe_id).single();
                    
                    const id = `review-${r.id}-${r.status}`; 
                    const isApproved = r.status === 'approved';
                    const title = isApproved ? 'Review Disetujui' : 'Review Ditolak';
                    const msg = isApproved 
                        ? `Ulasanmu di ${cafe?.name || 'cafe'} telah ditayangkan.` 
                        : `Ulasanmu di ${cafe?.name || 'cafe'} tidak dapat ditayangkan.`;
                    const link = isApproved ? `/cafe/${cafe?.slug}` : undefined;
                    
                    if (!isDeleted(id)) {
                         setNotifications(prev => {
                             const filtered = prev.filter(n => n.id !== id);
                             return [{
                                id,
                                title,
                                message: msg,
                                type: isApproved ? 'success' : 'alert',
                                date: new Date(),
                                link,
                                isRead: isRead(id)
                            }, ...filtered];
                        });
                        
                        if (!isRead(id)) {
                            sendBrowserNotification(title, msg, link);
                        }
                    }
                })
                .subscribe();
            channels.push(userChannel);

            if (currentUser.role === 'admin_cafe') {
                 const managerChannel = supabase.channel(`manager-personal-${currentUser.id}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: `manager_id=eq.${currentUser.id}` }, (payload) => {
                        const cafe = payload.new as MinimalCafe;
                        if (cafe.status === 'pending') return;

                        const id = `cafe-status-${cafe.id}-${cafe.status}`;
                        const isApproved = cafe.status === 'approved';
                        const title = isApproved ? 'Cafe Disetujui' : 'Cafe Ditolak';
                        const msg = isApproved 
                            ? `Selamat! telah disetujui.` 
                            : `Maaf, pendaftaran ditolak.`;
                        const link = isApproved ? `/cafe/${cafe.slug}` : '/dashboard-pengelola';

                         if (!isDeleted(id)) {
                             setNotifications(prev => {
                                 const filtered = prev.filter(n => n.id !== id);
                                 return [{
                                    id,
                                    title,
                                    message: msg,
                                    highlightText: cafe.name,
                                    type: isApproved ? 'success' : 'alert',
                                    date: new Date(),
                                    link,
                                    isRead: isRead(id)
                                }, ...filtered];
                            });

                            if (!isRead(id)) {
                                sendBrowserNotification(title, `${cafe.name} ${msg}`, link);
                            }
                         }
                    })
                    .subscribe();
                 channels.push(managerChannel);
            }
        }

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [currentUser, isStateLoaded, isDeleted, isRead, sendBrowserNotification]);

    // --- ACTIONS ---

    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            // Optimistic Update
            setReadIds(prev => new Set(prev).add(id));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            // Persist
            persistReadState(id);
        }
    };

    const markAllAsRead = () => {
        const idsToUpdate: string[] = [];
        const newReadIds = new Set(readIds);
        
        notifications.forEach(n => {
            if (!n.isRead) {
                newReadIds.add(n.id);
                idsToUpdate.push(n.id);
            }
        });

        if (idsToUpdate.length > 0) {
             // Optimistic
            setReadIds(newReadIds);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            // Persist Batch
            persistBatchState(idsToUpdate, 'read');
        }
    };

    const clearAll = () => {
        const idsToDelete = notifications.map(n => n.id);
        if (idsToDelete.length > 0) {
            // Optimistic
            const newDeletedIds = new Set(deletedIds);
            idsToDelete.forEach(id => newDeletedIds.add(id));
            setDeletedIds(newDeletedIds);
            setNotifications([]);
            // Persist Batch
            persistBatchState(idsToDelete, 'deleted');
        }
    };

    const refresh = async () => {
        await fetchCafes();
        await fetchNotifications();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearAll, refresh }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};
