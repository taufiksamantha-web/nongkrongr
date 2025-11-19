
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

// Constants for storage keys without suffix (suffix added dynamically)
const READ_NOTIFS_PREFIX = 'nongkrongr_read_notifications';
const DELETED_NOTIFS_PREFIX = 'nongkrongr_deleted_notifications';

// Define minimal interfaces for Realtime payloads
interface MinimalFeedback { id: number; name: string; message: string; created_at: string; status: string; }
interface MinimalProfile { id: string; username: string; role: string; created_at?: string; }
interface MinimalCafe { id: string; name: string; slug: string; manager_id: string; status: string; created_at: string; }

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fetchCafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    // Persistence states
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    // Track if we have successfully loaded state for the current user to prevent overwriting
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);

    // Helper to get user-specific keys
    const getStorageKeys = (userId: string | undefined) => {
        const suffix = userId ? `_${userId}` : '_guest';
        return {
            read: `${READ_NOTIFS_PREFIX}${suffix}`,
            deleted: `${DELETED_NOTIFS_PREFIX}${suffix}`
        };
    };

    // Load read/deleted state when currentUser changes
    useEffect(() => {
        setIsStorageLoaded(false); 
        
        const keys = getStorageKeys(currentUser?.id);
        const storedRead = localStorage.getItem(keys.read);
        const storedDeleted = localStorage.getItem(keys.deleted);
        
        if (storedRead) {
            try {
                setReadIds(new Set(JSON.parse(storedRead)));
            } catch (e) {
                setReadIds(new Set());
            }
        } else {
            setReadIds(new Set());
        }
        
        if (storedDeleted) {
             try {
                setDeletedIds(new Set(JSON.parse(storedDeleted)));
             } catch (e) {
                setDeletedIds(new Set());
             }
        } else {
            setDeletedIds(new Set());
        }

        setIsStorageLoaded(true); 
    }, [currentUser?.id]);

    const isDeleted = useCallback((id: string) => deletedIds.has(id), [deletedIds]);
    const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

    // --- MAIN FETCHING LOGIC ---
    const fetchNotifications = useCallback(async () => {
        if (!isStorageLoaded) return;
        
        const fetchedNotifs: NotificationItem[] = [];

        // 1. GLOBAL: New Cafes (Last 7 Days) - For Everyone
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data: recentCafes } = await supabase
            .from('cafes')
            .select('id, name, slug, created_at, status, isSponsored')
            .eq('status', 'approved')
            .gt('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5); // Top 5 newest

        recentCafes?.forEach(cafe => {
            const id = `new-cafe-${cafe.id}`;
            if (!isDeleted(id)) {
                fetchedNotifs.push({
                    id,
                    title: 'Cafe Baru!',
                    message: `${cafe.name} baru saja hadir di Nongkrongr. Cek sekarang!`,
                    type: 'success',
                    date: new Date(cafe.created_at),
                    link: `/cafe/${cafe.slug}`,
                    isRead: isRead(id)
                });
            }
        });

        // 2. PERSONAL: User & Manager Specifics
        if (currentUser) {
            // A. Review Status (For Users)
            const { data: myReviews } = await supabase
                .from('reviews')
                .select('id, status, created_at, cafes(name, slug)')
                .eq('author', currentUser.username)
                .neq('status', 'pending') // Only care about resolved reviews
                .order('created_at', { ascending: false })
                .limit(10);
            
            myReviews?.forEach((r: any) => {
                // Create a unique ID based on status to allow re-notification if status changes again
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

            // B. Cafe Status (For Managers)
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
                                ? `Selamat! ${cafe.name} telah disetujui.` 
                                : `Maaf, pendaftaran ${cafe.name} ditolak.`,
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
            // Preserve existing realtime notifications (start with 'rt-' or 'admin-')
            const existingPreserved = prev.filter(n => n.id.startsWith('rt-') || n.id.startsWith('admin-'));
            // Merge and Deduplicate
            const combined = [...fetchedNotifs, ...existingPreserved];
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
            return unique.sort((a, b) => b.date.getTime() - a.date.getTime());
        });
    }, [currentUser, isStorageLoaded, isDeleted, isRead]);

    // Initial Fetch
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // --- REALTIME SUBSCRIPTIONS ---
    useEffect(() => {
        if (!isStorageLoaded) return;

        const channels: ReturnType<typeof supabase.channel>[] = [];

        // 1. GLOBAL LISTENER: New Cafe Approved
        // Note: Supabase realtime filtering is limited. We listen to UPDATEs where status changes to approved.
        const globalChannel = supabase.channel('global-cafe-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: 'status=eq.approved' }, (payload) => {
                const cafe = payload.new as MinimalCafe;
                const id = `new-cafe-${cafe.id}`; // Use consistent ID
                if (!isDeleted(id)) {
                    setNotifications(prev => [{
                        id,
                        title: 'Cafe Baru!',
                        message: `${cafe.name} baru saja hadir di Nongkrongr.`,
                        type: 'success',
                        date: new Date(),
                        link: `/cafe/${cafe.slug}`,
                        isRead: false
                    }, ...prev]); // Add to top
                }
            })
            .subscribe();
        channels.push(globalChannel);

        // 2. ADMIN LISTENERS
        if (currentUser?.role === 'admin') {
            const adminChannel = supabase.channel('admin-notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                    const user = payload.new as MinimalProfile;
                    const notifId = `admin-new-user-${user.id}`;
                    if (!isDeleted(notifId)) {
                        setNotifications(prev => [{
                            id: notifId,
                            title: 'Pendaftaran User Baru',
                            message: `${user.username} mendaftar sebagai ${user.role === 'admin_cafe' ? 'Pengelola' : 'User'}.`,
                            type: 'info',
                            date: new Date(),
                            link: '/dashboard-admin',
                            isRead: false
                        }, ...prev]);
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
                    const fb = payload.new as MinimalFeedback;
                    const notifId = `admin-feedback-${fb.id}`;
                    if (!isDeleted(notifId)) {
                        setNotifications(prev => [{
                            id: notifId,
                            title: 'Masukan Baru',
                            message: `Dari ${fb.name}: "${fb.message.substring(0, 40)}..."`,
                            type: 'warning',
                            date: new Date(),
                            link: '/dashboard-admin',
                            isRead: false
                        }, ...prev]);
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafes' }, (payload) => {
                    const cafe = payload.new as MinimalCafe;
                    if (cafe.status === 'pending') {
                        const notifId = `admin-new-cafe-${cafe.id}`;
                        if (!isDeleted(notifId)) {
                            setNotifications(prev => [{
                                id: notifId,
                                title: 'Cafe Baru Menunggu Review',
                                message: `${cafe.name} perlu persetujuan untuk ditayangkan.`,
                                type: 'info',
                                date: new Date(),
                                link: '/dashboard-admin',
                                isRead: false
                            }, ...prev]);
                        }
                    }
                })
                .subscribe();
            channels.push(adminChannel);
        }

        // 3. PERSONAL LISTENERS (User/Manager)
        if (currentUser) {
            const userChannel = supabase.channel(`user-personal-${currentUser.id}`)
                // Listen for Review Updates
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reviews', filter: `author=eq.${currentUser.username}` }, async (payload) => {
                    const r = payload.new as any;
                    if (r.status === 'pending') return;

                    // Fetch cafe details for better message
                    const { data: cafe } = await supabase.from('cafes').select('name, slug').eq('id', r.cafe_id).single();
                    
                    const id = `rt-review-${r.id}-${r.status}-${Date.now()}`; // Realtime unique ID
                    const isApproved = r.status === 'approved';
                    
                    setNotifications(prev => [{
                        id,
                        title: isApproved ? 'Review Disetujui' : 'Review Ditolak',
                        message: isApproved 
                            ? `Ulasanmu di ${cafe?.name || 'cafe'} telah ditayangkan.` 
                            : `Ulasanmu di ${cafe?.name || 'cafe'} tidak dapat ditayangkan.`,
                        type: isApproved ? 'success' : 'alert',
                        date: new Date(),
                        link: isApproved ? `/cafe/${cafe?.slug}` : undefined,
                        isRead: false
                    }, ...prev]);
                })
                .subscribe();
            channels.push(userChannel);

            if (currentUser.role === 'admin_cafe') {
                 const managerChannel = supabase.channel(`manager-personal-${currentUser.id}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: `manager_id=eq.${currentUser.id}` }, (payload) => {
                        const cafe = payload.new as MinimalCafe;
                        if (cafe.status === 'pending') return;

                        const id = `rt-cafe-${cafe.id}-${cafe.status}-${Date.now()}`;
                        const isApproved = cafe.status === 'approved';

                        setNotifications(prev => [{
                            id,
                            title: isApproved ? 'Cafe Disetujui' : 'Cafe Ditolak',
                            message: isApproved 
                                ? `Selamat! ${cafe.name} telah disetujui.` 
                                : `Maaf, pendaftaran ${cafe.name} ditolak.`,
                            type: isApproved ? 'success' : 'alert',
                            date: new Date(),
                            link: isApproved ? `/cafe/${cafe.slug}` : '/dashboard-pengelola',
                            isRead: false
                        }, ...prev]);
                    })
                    .subscribe();
                 channels.push(managerChannel);
            }
        }

        return () => {
            channels.forEach(channel => supabase.removeChannel(channel));
        };
    }, [currentUser, isStorageLoaded, isDeleted]);


    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            const newReadIds = new Set(readIds).add(id);
            setReadIds(newReadIds);
            const keys = getStorageKeys(currentUser?.id);
            localStorage.setItem(keys.read, JSON.stringify(Array.from(newReadIds)));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        }
    };

    const markAllAsRead = () => {
        const newReadIds = new Set(readIds);
        notifications.forEach(n => newReadIds.add(n.id));
        setReadIds(newReadIds);
        const keys = getStorageKeys(currentUser?.id);
        localStorage.setItem(keys.read, JSON.stringify(Array.from(newReadIds)));
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const clearAll = () => {
        const newDeletedIds = new Set(deletedIds);
        notifications.forEach(n => newDeletedIds.add(n.id));
        setDeletedIds(newDeletedIds);
        const keys = getStorageKeys(currentUser?.id);
        localStorage.setItem(keys.deleted, JSON.stringify(Array.from(newDeletedIds)));
        setNotifications([]);
    };

    const refresh = async () => {
        await fetchCafes(); // Update global data
        await fetchNotifications(); // Re-run notification logic
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
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
