
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
    highlightText?: string;
}

interface NotificationContextType {
    notifications: NotificationItem[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    clearAll: () => void;
    refresh: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const GUEST_READ_KEY = 'nongkrongr_guest_read_notifications';
const GUEST_DELETED_KEY = 'nongkrongr_guest_deleted_notifications';

interface MinimalFeedback { id: number; name: string; message: string; created_at: string; status: string; }
interface MinimalProfile { id: string; username: string; role: string; status: string; created_at?: string; }
interface MinimalCafe { id: string; name: string; slug: string; manager_id: string; status: string; created_at: string; }
interface MinimalReview { id: string; cafe_id: string; author: string; status: string; created_at: string; }

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fetchCafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isStateLoaded, setIsStateLoaded] = useState(false);

    // Refs for caching IDs to check against during realtime events
    const deletedIdsRef = useRef<Set<string>>(new Set());
    const readIdsRef = useRef<Set<string>>(new Set());
    const managedCafeIdsRef = useRef<Set<string>>(new Set()); // For Managers: IDs of cafes they own
    const interactedCafeIdsRef = useRef<Set<string>>(new Set()); // For Users: IDs of cafes they have reviewed

    useEffect(() => {
        deletedIdsRef.current = deletedIds;
    }, [deletedIds]);

    useEffect(() => {
        readIdsRef.current = readIds;
    }, [readIds]);

    // Load Read/Deleted State
    useEffect(() => {
        const loadState = async () => {
            setIsStateLoaded(false);
            
            if (currentUser) {
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

    // Load Contextual Data (Managed Cafes / Interacted Cafes)
    useEffect(() => {
        const loadContextData = async () => {
            if (!currentUser) return;

            if (currentUser.role === 'admin_cafe') {
                const { data } = await supabase.from('cafes').select('id').eq('manager_id', currentUser.id);
                if (data) managedCafeIdsRef.current = new Set(data.map(c => c.id));
            } else if (currentUser.role === 'user') {
                const { data } = await supabase.from('reviews').select('cafe_id').eq('author', currentUser.username);
                if (data) interactedCafeIdsRef.current = new Set(data.map(r => r.cafe_id));
            }
        };
        loadContextData();
    }, [currentUser]);

    const persistReadState = async (id: string) => {
        if (currentUser) {
            const { error } = await supabase.from('user_notifications_state').upsert({
                user_id: currentUser.id,
                notification_id: id,
                is_read: true,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,notification_id' });
            if (error) console.error("Error persisting read state:", error);
        } else {
            const currentRead = new Set(readIdsRef.current).add(id);
            localStorage.setItem(GUEST_READ_KEY, JSON.stringify(Array.from(currentRead)));
        }
    };

    const persistDeletedState = async (id: string) => {
        if (currentUser) {
            const isCurrentlyRead = readIdsRef.current.has(id);
            const { error } = await supabase.from('user_notifications_state').upsert({
                user_id: currentUser.id,
                notification_id: id,
                is_deleted: true,
                is_read: isCurrentlyRead, 
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,notification_id' });
            if (error) console.error("Error persisting deleted state:", error);
        } else {
            const currentDeleted = new Set(deletedIdsRef.current).add(id);
            localStorage.setItem(GUEST_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));
        }
    };

    const persistBatchState = async (ids: string[], type: 'read' | 'deleted') => {
        if (currentUser) {
             const updates = ids.map(id => ({
                user_id: currentUser.id,
                notification_id: id,
                is_read: type === 'read' ? true : readIdsRef.current.has(id),
                is_deleted: type === 'deleted' ? true : deletedIdsRef.current.has(id),
                updated_at: new Date().toISOString()
             }));
             const { error } = await supabase.from('user_notifications_state').upsert(updates, { onConflict: 'user_id,notification_id' });
             if (error) console.error(`Error persisting batch ${type}:`, error);
        } else {
            if (type === 'read') {
                const currentRead = new Set([...readIdsRef.current, ...ids]);
                localStorage.setItem(GUEST_READ_KEY, JSON.stringify(Array.from(currentRead)));
            } else {
                const currentDeleted = new Set([...deletedIdsRef.current, ...ids]);
                localStorage.setItem(GUEST_DELETED_KEY, JSON.stringify(Array.from(currentDeleted)));
            }
        }
    }

    const isDeleted = useCallback((id: string) => deletedIdsRef.current.has(id), []);
    const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

    const sendBrowserNotification = useCallback((title: string, body: string, link?: string) => {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, {
                    body: body,
                    icon: 'https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png',
                    tag: 'nongkrongr-notification',
                });
            } catch (e) { console.error("Notification Error:", e); }
        }
    }, []);

    // --- CORE FETCH LOGIC ---
    const fetchNotifications = useCallback(async () => {
        if (!isStateLoaded) return;
        
        const fetchedNotifs: NotificationItem[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateLimit = sevenDaysAgo.toISOString();

        // 1. LOGIC FOR ALL (Termasuk Guest): Cafe Baru Approved
        const { data: newCafes } = await supabase
            .from('cafes')
            .select('id, name, slug, created_at, status')
            .eq('status', 'approved')
            .gt('created_at', dateLimit)
            .order('created_at', { ascending: false })
            .limit(5);

        newCafes?.forEach(cafe => {
            const id = `new-cafe-${cafe.id}`;
            if (!isDeleted(id)) {
                fetchedNotifs.push({
                    id,
                    title: 'Cafe Baru!',
                    message: `baru saja hadir di Nongkrongr.`,
                    highlightText: cafe.name,
                    type: 'success',
                    date: new Date(cafe.created_at),
                    link: `/cafe/${cafe.slug}`,
                    isRead: isRead(id)
                });
            }
        });

        if (currentUser) {
            // 2. LOGIC FOR ADMIN
            if (currentUser.role === 'admin') {
                // a. Pending Reviews
                const { data: pendingReviews } = await supabase.from('reviews').select('id, author, created_at, cafes(name)').eq('status', 'pending').order('created_at', {ascending: false}).limit(10);
                pendingReviews?.forEach((r: any) => {
                    const id = `admin-review-${r.id}`;
                    if(!isDeleted(id)) {
                        fetchedNotifs.push({ id, title: 'Review Perlu Moderasi', message: `${r.author} mereview ${r.cafes?.name}.`, type: 'info', date: new Date(r.created_at), link: '/dashboard-admin', isRead: isRead(id) });
                    }
                });

                // b. Pending Cafes
                const { data: pendingCafes } = await supabase.from('cafes').select('id, name, created_at').eq('status', 'pending').order('created_at', {ascending: false}).limit(5);
                pendingCafes?.forEach(c => {
                    const id = `admin-cafe-${c.id}`;
                    if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Pendaftaran Cafe Baru', message: `${c.name} menunggu persetujuan.`, type: 'info', date: new Date(c.created_at), link: '/dashboard-admin', isRead: isRead(id) });
                });

                // c. New Feedback
                const { data: feedback } = await supabase.from('feedback').select('id, name, message, created_at').eq('status', 'new').order('created_at', {ascending: false}).limit(5);
                feedback?.forEach(f => {
                    const id = `admin-feedback-${f.id}`;
                    if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Masukan Baru', message: `Dari ${f.name}: ${f.message.substring(0,30)}...`, type: 'warning', date: new Date(f.created_at), link: '/dashboard-admin', isRead: isRead(id) });
                });

                 // d. New Users (Pending/New)
                 const { data: newUsers } = await supabase.from('profiles').select('id, username, role, created_at').gt('created_at', dateLimit).neq('id', currentUser.id).order('created_at', {ascending: false}).limit(5);
                 newUsers?.forEach(u => {
                    const id = `admin-user-${u.id}`;
                    if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'User Baru', message: `${u.username} mendaftar sebagai ${u.role}.`, type: 'info', date: new Date(u.created_at || new Date()), link: '/dashboard-admin', isRead: isRead(id) });
                 });
            }

            // 3. LOGIC FOR CAFE MANAGER
            if (currentUser.role === 'admin_cafe') {
                // a. Status Cafe (Approved/Rejected)
                const { data: myCafes } = await supabase.from('cafes').select('id, name, slug, status, created_at').eq('manager_id', currentUser.id).neq('status', 'pending').gt('created_at', dateLimit);
                myCafes?.forEach(c => {
                    const id = `mgr-cafe-${c.id}-${c.status}`;
                    if(!isDeleted(id)) {
                        const isApproved = c.status === 'approved';
                        fetchedNotifs.push({
                            id, title: isApproved ? 'Cafe Disetujui' : 'Cafe Ditolak',
                            message: isApproved ? `Selamat! ${c.name} kini live.` : `Maaf, ${c.name} ditolak.`,
                            type: isApproved ? 'success' : 'alert', date: new Date(c.created_at), link: isApproved ? `/cafe/${c.slug}` : '/dashboard-pengelola', isRead: isRead(id)
                        });
                    }
                });

                // b. Reviews on My Cafes
                const { data: reviewsOnMyCafes } = await supabase.from('reviews').select('id, author, ratingAesthetic, created_at, cafes!inner(id, name, slug, manager_id)').eq('cafes.manager_id', currentUser.id).eq('status', 'approved').gt('created_at', dateLimit).limit(10);
                reviewsOnMyCafes?.forEach((r: any) => {
                     const id = `mgr-review-${r.id}`;
                     if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Ulasan Baru Masuk', message: `${r.author} memberi nilai ${r.ratingAesthetic}/10 di ${r.cafes.name}.`, type: 'info', date: new Date(r.created_at), link: `/cafe/${r.cafes.slug}`, isRead: isRead(id) });
                });
            }

            // 4. LOGIC FOR USER (Community)
            if (currentUser.role === 'user') {
                // a. Reviews from others on cafes I also reviewed
                // Fetch IDs of cafes reviewed by current user first
                const { data: myReviewedCafes } = await supabase.from('reviews').select('cafe_id').eq('author', currentUser.username);
                const myCafeIds = myReviewedCafes?.map(c => c.cafe_id) || [];

                if (myCafeIds.length > 0) {
                    const { data: communityReviews } = await supabase
                        .from('reviews')
                        .select('id, author, created_at, cafes(name, slug)')
                        .in('cafe_id', myCafeIds)
                        .neq('author', currentUser.username)
                        .eq('status', 'approved')
                        .gt('created_at', dateLimit)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    
                    communityReviews?.forEach((r: any) => {
                         const id = `comm-review-${r.id}`;
                         if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Diskusi Baru', message: `${r.author} juga mengulas ${r.cafes?.name}. Cek pendapat mereka!`, type: 'info', date: new Date(r.created_at), link: `/cafe/${r.cafes?.slug}`, isRead: isRead(id) });
                    });
                }
            }

            // 5. COMMON FOR ALL LOGGED IN: Status of my own reviews
            const { data: myReviews } = await supabase.from('reviews').select('id, status, created_at, cafes(name, slug)').eq('author', currentUser.username).neq('status', 'pending').gt('created_at', dateLimit).limit(5);
            myReviews?.forEach((r: any) => {
                const id = `my-review-${r.id}-${r.status}`;
                if(!isDeleted(id)) {
                    const isApproved = r.status === 'approved';
                    fetchedNotifs.push({ id, title: isApproved ? 'Review Tayang' : 'Review Ditolak', message: `Ulasanmu di ${r.cafes?.name} ${isApproved ? 'sudah aktif' : 'ditolak'}.`, type: isApproved ? 'success' : 'alert', date: new Date(r.created_at), link: isApproved ? `/cafe/${r.cafes?.slug}` : undefined, isRead: isRead(id) });
                }
            });
        }

        // Merge and Deduplicate
        setNotifications(prev => {
            const combined = [...fetchedNotifs];
            const uniqueMap = new Map();
            // Keep existing visible notifications if they aren't deleted
            prev.forEach(item => { if (!isDeleted(item.id)) uniqueMap.set(item.id, item); });
            // Add/Update with fetched ones
            combined.forEach(item => { if (!isDeleted(item.id)) uniqueMap.set(item.id, item); });
            
            return Array.from(uniqueMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
        });
    }, [currentUser, isStateLoaded, isDeleted, isRead]);

    useEffect(() => {
        fetchNotifications();
    }, [isStateLoaded, fetchNotifications]);

    // --- REALTIME SUBSCRIPTIONS ---
    useEffect(() => {
        if (!isStateLoaded) return;

        const channels: ReturnType<typeof supabase.channel>[] = [];

        // 1. Global Channel (Cafe Approved)
        const globalChannel = supabase.channel('global-notif').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: 'status=eq.approved' }, (payload) => {
             const cafe = payload.new as MinimalCafe;
             const id = `new-cafe-${cafe.id}`;
             if (!isDeleted(id)) {
                 const n = { id, title: 'Cafe Baru!', message: `baru saja hadir.`, highlightText: cafe.name, type: 'success' as const, date: new Date(), link: `/cafe/${cafe.slug}`, isRead: false };
                 setNotifications(p => [n, ...p]);
                 sendBrowserNotification(n.title, `${cafe.name} ${n.message}`, n.link);
             }
        }).subscribe();
        channels.push(globalChannel);

        if (currentUser) {
            // 2. Personal State Channel (Read/Delete sync)
            const stateChannel = supabase.channel(`user-state-${currentUser.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_notifications_state', filter: `user_id=eq.${currentUser.id}` }, (payload) => {
                 const { new: newData } = payload;
                 if (newData) {
                    if (newData.is_read) setReadIds(prev => new Set(prev).add(newData.notification_id));
                    if (newData.is_deleted) {
                        setDeletedIds(prev => new Set(prev).add(newData.notification_id));
                        setNotifications(prev => prev.filter(n => n.id !== newData.notification_id));
                    }
                 }
            }).subscribe();
            channels.push(stateChannel);

            if (currentUser.role === 'admin') {
                const adminChannel = supabase.channel('admin-realtime')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
                         const r = payload.new as MinimalReview;
                         if (r.status === 'pending') {
                             const id = `admin-review-${r.id}`;
                             if(!isDeleted(id)) setNotifications(p => [{ id, title: 'Review Baru', message: `Review baru menunggu moderasi.`, type: 'info', date: new Date(), link: '/dashboard-admin', isRead: false }, ...p]);
                         }
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cafes' }, (payload) => {
                         const c = payload.new as MinimalCafe;
                         if (c.status === 'pending') {
                             const id = `admin-cafe-${c.id}`;
                             if(!isDeleted(id)) setNotifications(p => [{ id, title: 'Cafe Pending', message: `${c.name} menunggu persetujuan.`, type: 'info', date: new Date(), link: '/dashboard-admin', isRead: false }, ...p]);
                         }
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
                        const u = payload.new as MinimalProfile;
                        const id = `admin-user-${u.id}`;
                        if(!isDeleted(id)) setNotifications(p => [{ id, title: 'User Baru', message: `${u.username} (${u.role}) bergabung.`, type: 'info', date: new Date(), link: '/dashboard-admin', isRead: false }, ...p]);
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, (payload) => {
                        const f = payload.new as MinimalFeedback;
                        const id = `admin-feedback-${f.id}`;
                        if(!isDeleted(id)) setNotifications(p => [{ id, title: 'Masukan Baru', message: `Pesan baru dari ${f.name}.`, type: 'warning', date: new Date(), link: '/dashboard-admin', isRead: false }, ...p]);
                    })
                    .subscribe();
                channels.push(adminChannel);
            }

            if (currentUser.role === 'admin_cafe') {
                const managerChannel = supabase.channel(`manager-${currentUser.id}`)
                    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cafes', filter: `manager_id=eq.${currentUser.id}` }, (payload) => {
                        const c = payload.new as MinimalCafe;
                        if (c.status !== 'pending') {
                            const id = `mgr-cafe-${c.id}-${c.status}`;
                            const isApproved = c.status === 'approved';
                            if(!isDeleted(id)) setNotifications(p => [{ id, title: `Cafe ${isApproved ? 'Disetujui' : 'Ditolak'}`, message: `Status ${c.name} diperbarui.`, type: isApproved?'success':'alert', date: new Date(), link: '/dashboard-pengelola', isRead: false }, ...p]);
                        }
                    })
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, async (payload) => {
                        const r = payload.new as MinimalReview;
                        // Check if this review belongs to a cafe managed by this user
                        if (managedCafeIdsRef.current.has(r.cafe_id) && r.status === 'approved') {
                             const { data: cafe } = await supabase.from('cafes').select('name, slug').eq('id', r.cafe_id).single();
                             const id = `mgr-review-${r.id}`;
                             if(!isDeleted(id)) setNotifications(p => [{ id, title: 'Ulasan Masuk', message: `Ulasan baru di ${cafe?.name}.`, type: 'info', date: new Date(), link: `/cafe/${cafe?.slug}`, isRead: false }, ...p]);
                        }
                    })
                    .subscribe();
                 channels.push(managerChannel);
            }

            if (currentUser.role === 'user') {
                const userChannel = supabase.channel(`user-comm-${currentUser.id}`)
                     .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, async (payload) => {
                        const r = payload.new as MinimalReview;
                         // Logic: Review author is NOT me, BUT cafe ID is in my interacted list
                        if (r.author !== currentUser.username && interactedCafeIdsRef.current.has(r.cafe_id) && r.status === 'approved') {
                            const { data: cafe } = await supabase.from('cafes').select('name, slug').eq('id', r.cafe_id).single();
                            const id = `comm-review-${r.id}`;
                            if(!isDeleted(id)) {
                                const n = { id, title: 'Diskusi Baru', message: `${r.author} mengulas ${cafe?.name}.`, type: 'info' as const, date: new Date(), link: `/cafe/${cafe?.slug}`, isRead: false };
                                setNotifications(p => [n, ...p]);
                                sendBrowserNotification(n.title, n.message, n.link);
                            }
                        }
                    })
                    .subscribe();
                channels.push(userChannel);
            }
            
            // Listen for Profile Activation (Manager/User)
            const profileChannel = supabase.channel(`profile-status-${currentUser.id}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${currentUser.id}` }, (payload) => {
                    const p = payload.new as MinimalProfile;
                    const old = payload.old as MinimalProfile;
                    if (old?.status !== 'active' && p.status === 'active') {
                         const id = `acc-active-${p.id}`;
                         if(!isDeleted(id)) setNotifications(prev => [{ id, title: 'Akun Aktif', message: 'Akun Anda telah disetujui Admin.', type: 'success', date: new Date(), link: p.role === 'admin_cafe' ? '/dashboard-pengelola' : '/', isRead: false }, ...prev]);
                    }
                })
                .subscribe();
            channels.push(profileChannel);
        }

        return () => {
            channels.forEach(c => supabase.removeChannel(c));
        };
    }, [currentUser, isStateLoaded, isDeleted, sendBrowserNotification]);

    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            setReadIds(prev => new Set(prev).add(id));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            persistReadState(id);
        }
    };
    
    const deleteNotification = (id: string) => {
        setDeletedIds(prev => new Set(prev).add(id));
        setNotifications(prev => prev.filter(n => n.id !== id));
        persistDeletedState(id);
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
            setReadIds(newReadIds);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            persistBatchState(idsToUpdate, 'read');
        }
    };

    const clearAll = () => {
        const idsToDelete = notifications.map(n => n.id);
        if (idsToDelete.length > 0) {
            const newDeletedIds = new Set(deletedIds);
            idsToDelete.forEach(id => newDeletedIds.add(id));
            setDeletedIds(newDeletedIds);
            setNotifications([]);
            persistBatchState(idsToDelete, 'deleted');
        }
    };

    const refresh = async () => {
        await fetchCafes();
        await fetchNotifications();
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll, refresh }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
    return context;
};
