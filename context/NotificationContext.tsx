
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

    const deletedIdsRef = useRef<Set<string>>(new Set());
    const readIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => { deletedIdsRef.current = deletedIds; }, [deletedIds]);
    useEffect(() => { readIdsRef.current = readIds; }, [readIds]);

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

    const isDeleted = useCallback((id: string) => deletedIdsRef.current.has(id), []);
    const isRead = useCallback((id: string) => readIds.has(id), [readIds]);

    const fetchNotifications = useCallback(async () => {
        if (!isStateLoaded) return;
        const fetchedNotifs: NotificationItem[] = [];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const dateLimit = sevenDaysAgo.toISOString();

        // Generic: New Cafes (Exclude Managers from seeing generic new cafe notifs to avoid clutter)
        if (currentUser?.role !== 'admin_cafe') {
            const { data: newCafes } = await supabase.from('cafes').select('id, name, slug, created_at, status').eq('status', 'approved').gt('created_at', dateLimit).limit(5);
            newCafes?.forEach(cafe => {
                const id = `new-cafe-${cafe.id}`;
                if (!isDeleted(id)) fetchedNotifs.push({ id, title: 'Cafe Baru!', message: `baru saja hadir.`, highlightText: cafe.name, type: 'success', date: new Date(cafe.created_at), link: `/cafe/${cafe.slug}`, isRead: isRead(id) });
            });
        }

        if (currentUser) {
            // --- SUPERADMIN LOGIC ---
            if (currentUser.role === 'admin') {
                // 1. Pusat Persetujuan: Pending Reviews (Updated for author_id relation)
                const { data: pReviews } = await supabase
                    .from('reviews')
                    .select('id, created_at, cafes(name), profile:profiles(username)')
                    .eq('status', 'pending')
                    .limit(10);
                
                pReviews?.forEach((r: any) => { 
                    const id = `admin-review-${r.id}`; 
                    const authorName = r.profile?.username || 'Pengguna';
                    if(!isDeleted(id)) fetchedNotifs.push({ 
                        id, 
                        title: 'Review Menunggu Approval', 
                        message: `${authorName} mereview ${r.cafes?.name}.`, 
                        type: 'warning', 
                        date: new Date(r.created_at), 
                        link: '/dashboard-admin', 
                        isRead: isRead(id) 
                    }); 
                });

                // 2. Pusat Persetujuan: Pending Cafes (Kafe Baru oleh Pengelola)
                const { data: pCafes } = await supabase.from('cafes').select('id, name, created_at, manager_id').eq('status', 'pending').limit(5);
                pCafes?.forEach(c => { 
                    const id = `admin-cafe-${c.id}`; 
                    if(!isDeleted(id)) fetchedNotifs.push({ 
                        id, 
                        title: 'Persetujuan Kafe Baru', 
                        message: `Kafe "${c.name}" menunggu persetujuan Anda.`, 
                        type: 'warning', 
                        date: new Date(c.created_at), 
                        link: '/dashboard-admin', 
                        isRead: isRead(id) 
                    }); 
                });
                
                // 3. Pusat Persetujuan: Pending Cafe Managers (Pengelola Baru)
                const { data: pManagers } = await supabase.from('profiles').select('id, username, created_at').eq('role', 'admin_cafe').eq('status', 'pending_approval').limit(5);
                pManagers?.forEach(u => {
                    const id = `admin-new-user-${u.id}`;
                    if (!isDeleted(id)) fetchedNotifs.push({
                        id,
                        title: 'Persetujuan Pengelola',
                        message: `${u.username} mendaftar sebagai pengelola kafe.`,
                        type: 'warning',
                        date: new Date(u.created_at || new Date()),
                        link: '/dashboard-admin',
                        isRead: isRead(id)
                    });
                });

                // 4. Saran & Masukan (Feedback)
                const { data: newFeedback } = await supabase.from('feedback').select('id, name, created_at').eq('status', 'new').limit(5);
                newFeedback?.forEach(f => {
                    const id = `admin-feedback-${f.id}`;
                    if (!isDeleted(id)) fetchedNotifs.push({
                        id,
                        title: 'Masukan Baru',
                        message: `Pesan baru dari ${f.name}.`,
                        type: 'info', 
                        date: new Date(f.created_at),
                        link: '/dashboard-admin',
                        isRead: isRead(id)
                    });
                });
            }

            // --- CAFE MANAGER LOGIC ---
            if (currentUser.role === 'admin_cafe') {
                const { data: myCafes } = await supabase.from('cafes').select('id, name, slug, status, created_at').eq('manager_id', currentUser.id).neq('status', 'pending');
                myCafes?.forEach(c => { const id = `mgr-cafe-${c.id}-${c.status}`; if(!isDeleted(id)) fetchedNotifs.push({ id, title: `Cafe ${c.status === 'approved' ? 'Disetujui' : 'Ditolak'}`, message: c.name, type: c.status==='approved'?'success':'alert', date: new Date(c.created_at), link: '/dashboard-pengelola', isRead: isRead(id) }); });
            }
            
            // --- USER COMMON LOGIC: My Reviews Status (Updated for author_id) ---
            const { data: myReviews } = await supabase
                .from('reviews')
                .select('id, status, created_at, cafes(name, slug)')
                .eq('author_id', currentUser.id) // Use author_id instead of author username
                .neq('status', 'pending')
                .limit(5);

            myReviews?.forEach((r: any) => { 
                const id = `my-review-${r.id}-${r.status}`; 
                if(!isDeleted(id)) fetchedNotifs.push({ 
                    id, 
                    title: 'Status Review', 
                    message: `Review di ${r.cafes?.name} ${r.status === 'approved' ? 'disetujui' : 'ditolak'}.`, 
                    type: r.status==='approved'?'success':'alert', 
                    date: new Date(r.created_at), 
                    link: `/cafe/${r.cafes?.slug}`, 
                    isRead: isRead(id) 
                }); 
            });
        }

        setNotifications(prev => {
            const combined = [...fetchedNotifs];
            const uniqueMap = new Map();
            prev.forEach(item => { if (!isDeleted(item.id)) uniqueMap.set(item.id, item); });
            combined.forEach(item => { if (!isDeleted(item.id)) uniqueMap.set(item.id, item); });
            return Array.from(uniqueMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
        });
    }, [currentUser, isStateLoaded, isDeleted, isRead]);

    useEffect(() => { fetchNotifications(); }, [isStateLoaded, fetchNotifications]);

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

    const refresh = async () => { await fetchCafes(); await fetchNotifications(); };
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
