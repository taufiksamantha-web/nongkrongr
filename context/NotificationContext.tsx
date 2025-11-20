
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

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { fetchCafes } = useContext(CafeContext)!;
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
    const [isStateLoaded, setIsStateLoaded] = useState(false);

    // Refs to hold latest state values for realtime callbacks
    const deletedIdsRef = useRef<Set<string>>(new Set());
    const readIdsRef = useRef<Set<string>>(new Set());
    const currentUserRef = useRef(currentUser);

    useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);
    useEffect(() => { readIdsRef.current = readIds; }, [readIds]);
    useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

    // Helper to check if deleted (using ref for realtime context)
    const isDeleted = useCallback((id: string) => deletedIdsRef.current.has(id), []);
    const isRead = useCallback((id: string) => readIdsRef.current.has(id), []);

    // --- 1. Load Read/Deleted State from Persistence ---
    useEffect(() => {
        const loadState = async () => {
            setIsStateLoaded(false);
            if (currentUser) {
                const { data, error } = await supabase.from('user_notifications_state').select('notification_id, is_read, is_deleted').eq('user_id', currentUser.id);
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
                try {
                    const storedRead = localStorage.getItem(GUEST_READ_KEY);
                    const storedDeleted = localStorage.getItem(GUEST_DELETED_KEY);
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

    // --- 2. Initial Fetch (Historical Data) ---
    const fetchInitialNotifications = useCallback(async () => {
        if (!isStateLoaded) return;
        const fetchedNotifs: NotificationItem[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateLimit = sevenDaysAgo.toISOString();

        // 2.1 Generic: New Cafes (Exclude Managers)
        if (currentUser?.role !== 'admin_cafe') {
            const { data: newCafes } = await supabase.from('cafes').select('id, name, slug, created_at, status').eq('status', 'approved').gt('created_at', dateLimit).limit(5);
            newCafes?.forEach(cafe => {
                const id = `new-cafe-${cafe.id}`;
                if (!isDeleted(id)) fetchedNotifs.push({ id, title: 'Cafe Baru!', message: `baru saja hadir.`, highlightText: cafe.name, type: 'success', date: new Date(cafe.created_at), link: `/cafe/${cafe.slug}`, isRead: isRead(id) });
            });
        }

        if (currentUser) {
            // 2.2 Superadmin Logic
            if (currentUser.role === 'admin') {
                const { data: pReviews } = await supabase.from('reviews').select('id, created_at, cafes(name), profile:profiles(username)').eq('status', 'pending').limit(10);
                pReviews?.forEach((r: any) => { 
                    const id = `admin-review-${r.id}`; 
                    if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Review Menunggu Approval', message: `${r.profile?.username || 'User'} mereview ${r.cafes?.name}.`, type: 'warning', date: new Date(r.created_at), link: '/dashboard-admin', isRead: isRead(id) }); 
                });
                const { data: pCafes } = await supabase.from('cafes').select('id, name, created_at').eq('status', 'pending').limit(5);
                pCafes?.forEach(c => { const id = `admin-cafe-${c.id}`; if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Persetujuan Kafe Baru', message: `Kafe "${c.name}" menunggu persetujuan Anda.`, type: 'warning', date: new Date(c.created_at), link: '/dashboard-admin', isRead: isRead(id) }); });
                const { data: pManagers } = await supabase.from('profiles').select('id, username, created_at').eq('role', 'admin_cafe').eq('status', 'pending_approval').limit(5);
                pManagers?.forEach(u => { const id = `admin-new-user-${u.id}`; if (!isDeleted(id)) fetchedNotifs.push({ id, title: 'Persetujuan Pengelola', message: `${u.username} mendaftar sebagai pengelola.`, type: 'warning', date: new Date(u.created_at || new Date()), link: '/dashboard-admin', isRead: isRead(id) }); });
                const { data: newFeedback } = await supabase.from('feedback').select('id, name, created_at').eq('status', 'new').limit(5);
                newFeedback?.forEach(f => { const id = `admin-feedback-${f.id}`; if (!isDeleted(id)) fetchedNotifs.push({ id, title: 'Masukan Baru', message: `Pesan baru dari ${f.name}.`, type: 'info', date: new Date(f.created_at), link: '/dashboard-admin', isRead: isRead(id) }); });
            }
            // 2.3 Cafe Manager Logic
            if (currentUser.role === 'admin_cafe') {
                const { data: myCafes } = await supabase.from('cafes').select('id, name, slug, status, created_at').eq('manager_id', currentUser.id).neq('status', 'pending');
                myCafes?.forEach(c => { const id = `mgr-cafe-${c.id}-${c.status}`; if(!isDeleted(id)) fetchedNotifs.push({ id, title: `Cafe ${c.status === 'approved' ? 'Disetujui' : 'Ditolak'}`, message: c.name, type: c.status==='approved'?'success':'alert', date: new Date(c.created_at), link: '/dashboard-pengelola', isRead: isRead(id) }); });
            }
            // 2.4 User Common Logic
            const { data: myReviews } = await supabase.from('reviews').select('id, status, created_at, cafes(name, slug)').eq('author_id', currentUser.id).neq('status', 'pending').limit(5);
            myReviews?.forEach((r: any) => { const id = `my-review-${r.id}-${r.status}`; if(!isDeleted(id)) fetchedNotifs.push({ id, title: 'Status Review', message: `Review di ${r.cafes?.name} ${r.status === 'approved' ? 'disetujui' : 'ditolak'}.`, type: r.status==='approved'?'success':'alert', date: new Date(r.created_at), link: `/cafe/${r.cafes?.slug}`, isRead: isRead(id) }); });
        }

        setNotifications(prev => {
             // Merge, deduplicate by ID, filter deleted, sort by date DESC
             const combined = [...prev, ...fetchedNotifs];
             const uniqueMap = new Map();
             combined.forEach(item => { if (!isDeleted(item.id)) uniqueMap.set(item.id, item); });
             return Array.from(uniqueMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
        });
    }, [currentUser, isStateLoaded, isDeleted, isRead]);

    useEffect(() => { fetchInitialNotifications(); }, [fetchInitialNotifications]);


    // --- 3. REALTIME SUBSCRIPTION LOGIC ---
    useEffect(() => {
        if (!isStateLoaded) return;

        const handleRealtimeEvent = async (payload: any) => {
            const user = currentUserRef.current;
            const eventType = payload.eventType;
            const table = payload.table;
            const newRecord = payload.new;

            let newItem: NotificationItem | null = null;

            // CASE: New Review (Admin only)
            if (table === 'reviews' && eventType === 'INSERT' && user?.role === 'admin') {
                // Need to fetch relation data manually as realtime payload doesn't include joins
                const { data: relData } = await supabase.from('reviews').select('cafes(name), profile:profiles(username)').eq('id', newRecord.id).single();
                const id = `admin-review-${newRecord.id}`;
                if (!deletedIdsRef.current.has(id)) {
                    newItem = {
                        id,
                        title: 'Review Baru Masuk!',
                        message: `${relData?.profile?.username || 'User'} baru saja mereview ${relData?.cafes?.name}.`,
                        type: 'warning',
                        date: new Date(newRecord.createdAt),
                        link: '/dashboard-admin',
                        isRead: false
                    };
                }
            }

            // CASE: Review Status Update (User who owns the review)
            if (table === 'reviews' && eventType === 'UPDATE' && user && newRecord.author_id === user.id && newRecord.status !== 'pending') {
                 const { data: relData } = await supabase.from('reviews').select('cafes(name, slug)').eq('id', newRecord.id).single();
                 const id = `my-review-${newRecord.id}-${newRecord.status}`;
                 if (!deletedIdsRef.current.has(id)) {
                     newItem = {
                         id,
                         title: 'Status Review Diperbarui',
                         message: `Review Anda di ${relData?.cafes?.name} telah ${newRecord.status === 'approved' ? 'disetujui' : 'ditolak'}.`,
                         type: newRecord.status === 'approved' ? 'success' : 'alert',
                         date: new Date(), // Use current time for status change notification
                         link: `/cafe/${relData?.cafes?.slug}`,
                         isRead: false
                     };
                 }
            }

            // CASE: New Cafe (Everyone except admins/managers to avoid noise, OR admins to approve)
            if (table === 'cafes' && eventType === 'INSERT') {
                if (newRecord.status === 'approved' && user?.role !== 'admin_cafe') {
                    const id = `new-cafe-${newRecord.id}`;
                    if (!deletedIdsRef.current.has(id)) {
                         newItem = { id, title: 'Cafe Baru!', message: 'baru saja hadir di Nongkrongr.', highlightText: newRecord.name, type: 'success', date: new Date(newRecord.created_at), link: `/cafe/${newRecord.slug}`, isRead: false };
                    }
                } else if (newRecord.status === 'pending' && user?.role === 'admin') {
                    const id = `admin-cafe-${newRecord.id}`;
                     if (!deletedIdsRef.current.has(id)) {
                        newItem = { id, title: 'Kafe Baru Menunggu', message: `Kafe "${newRecord.name}" menunggu persetujuan.`, type: 'warning', date: new Date(newRecord.created_at), link: '/dashboard-admin', isRead: false };
                    }
                }
            }

            // CASE: Cafe Status Update (Owner)
            if (table === 'cafes' && eventType === 'UPDATE' && user?.role === 'admin_cafe' && newRecord.manager_id === user.id && newRecord.status !== 'pending') {
                 const id = `mgr-cafe-${newRecord.id}-${newRecord.status}`;
                 if (!deletedIdsRef.current.has(id)) {
                    newItem = { id, title: `Status Kafe Diperbarui`, message: `Kafe "${newRecord.name}" ${newRecord.status === 'approved' ? 'telah disetujui' : 'ditolak'}.`, type: newRecord.status === 'approved' ? 'success' : 'alert', date: new Date(), link: '/dashboard-pengelola', isRead: false };
                 }
            }

            // CASE: New Feedback (Admin)
            if (table === 'feedback' && eventType === 'INSERT' && user?.role === 'admin') {
                 const id = `admin-feedback-${newRecord.id}`;
                 if (!deletedIdsRef.current.has(id)) {
                     newItem = { id, title: 'Masukan Baru', message: `Pesan baru dari ${newRecord.name}.`, type: 'info', date: new Date(newRecord.created_at), link: '/dashboard-admin', isRead: false };
                 }
            }
            
            // CASE: New Manager Signup (Admin)
            if (table === 'profiles' && eventType === 'INSERT' && user?.role === 'admin' && newRecord.role === 'admin_cafe') {
                const id = `admin-new-user-${newRecord.id}`;
                if (!deletedIdsRef.current.has(id)) {
                    newItem = { id, title: 'Registrasi Pengelola', message: `${newRecord.username} mendaftar sebagai pengelola.`, type: 'warning', date: new Date(), link: '/dashboard-admin', isRead: false };
                }
            }

            if (newItem) {
                setNotifications(prev => [newItem!, ...prev]);
            }
        };

        const channel = supabase.channel('realtime-notifications')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, handleRealtimeEvent)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes' }, handleRealtimeEvent)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feedback' }, handleRealtimeEvent)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, handleRealtimeEvent)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isStateLoaded]); // Only re-subscribe if init state changes, internal refs handle user changes


    const markAsRead = (id: string) => {
        if (!readIds.has(id)) {
            setReadIds(prev => new Set(prev).add(id));
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            if (currentUser) supabase.from('user_notifications_state').upsert({ user_id: currentUser.id, notification_id: id, is_read: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,notification_id' }).then();
            else localStorage.setItem(GUEST_READ_KEY, JSON.stringify(Array.from(new Set([...readIds, id]))));
        }
    };
    
    const deleteNotification = (id: string) => {
        setDeletedIds(prev => new Set(prev).add(id));
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (currentUser) supabase.from('user_notifications_state').upsert({ user_id: currentUser.id, notification_id: id, is_deleted: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id,notification_id' }).then();
        else localStorage.setItem(GUEST_DELETED_KEY, JSON.stringify(Array.from(new Set([...deletedIds, id]))));
    };

    const markAllAsRead = () => {
        const ids = notifications.filter(n => !n.isRead).map(n => n.id);
        if (ids.length > 0) {
            setReadIds(prev => { const next = new Set(prev); ids.forEach(i => next.add(i)); return next; });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
             if (currentUser) {
                 const updates = ids.map(id => ({ user_id: currentUser.id, notification_id: id, is_read: true, updated_at: new Date().toISOString() }));
                 supabase.from('user_notifications_state').upsert(updates, { onConflict: 'user_id,notification_id' }).then();
             }
        }
    };

    const clearAll = () => {
        const ids = notifications.map(n => n.id);
        if (ids.length > 0) {
            setDeletedIds(prev => { const next = new Set(prev); ids.forEach(i => next.add(i)); return next; });
            setNotifications([]);
             if (currentUser) {
                 const updates = ids.map(id => ({ user_id: currentUser.id, notification_id: id, is_deleted: true, updated_at: new Date().toISOString() }));
                 supabase.from('user_notifications_state').upsert(updates, { onConflict: 'user_id,notification_id' }).then();
             }
        }
    };

    const refresh = async () => { await fetchCafes(); await fetchInitialNotifications(); };
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
