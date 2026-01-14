
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { User, AppNotification, GlobalCart, MenuItem, Cafe } from '../types';
import { SafeStorage, supabase } from '../lib/supabase';
import { 
    fetchNotifications, markNotificationReadDB, 
    markAllNotificationsReadDB, deleteNotificationDB, deleteAllNotificationsDB,
    getUserProfile, ensureUserProfile, signOutUser
} from '../services/dataService';

interface SessionContextType {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    notifications: AppNotification[];
    setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
    cart: GlobalCart;
    addToGlobalCart: (item: MenuItem, cafe: Cafe) => void;
    removeFromGlobalCart: (itemId: string, cafeId: string) => void;
    clearCafeCart: (cafeId: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    refreshUserProfile: (userId: string) => Promise<User | null>;
    updateLocalUser: (updates: Partial<User>) => void; 
    isSessionLoading: boolean; 
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    deleteNotification: (id: string) => void;
    clearAllNotifications: () => void;
    onlineUserIds: string[]; 
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const USER_DATA_KEY = 'nongkrongr_user_data';
    const CART_DATA_KEY = 'nongkrongr_global_cart';
    const THEME_KEY = 'nongkrongr_theme';
    const mounted = useRef(true);
    const initialCheckDone = useRef(false);

    const [user, setUser] = useState<User | null>(() => {
        const cached = SafeStorage.getItem(USER_DATA_KEY);
        if (cached) {
            try { return JSON.parse(cached); } catch { return null; }
        }
        return null;
    });

    const [cart, setCart] = useState<GlobalCart>(() => {
        const cached = SafeStorage.getItem(CART_DATA_KEY);
        if (cached) {
            try { return JSON.parse(cached); } catch { return {}; }
        }
        return {};
    });

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [isSessionLoading, setIsSessionLoading] = useState(!initialCheckDone.current);
    const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]); 
    
    // Fungsionalitas Dark Mode yang mendeteksi sistem secara otomatis
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        const cachedTheme = SafeStorage.getItem(THEME_KEY);
        if (cachedTheme) return cachedTheme === 'dark';
        // Fallback ke preferensi sistem browser/OS
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    // Sinkronisasi class dark ke root HTML dan dengarkan perubahan sistem
    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Listener untuk perubahan tema sistem secara real-time
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            // Hanya ikuti sistem jika user belum pernah set manual
            if (!SafeStorage.getItem(THEME_KEY)) {
                setIsDarkMode(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [isDarkMode]);

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        SafeStorage.setItem(THEME_KEY, newMode ? 'dark' : 'light');
    };

    useEffect(() => {
        SafeStorage.setItem(CART_DATA_KEY, JSON.stringify(cart));
    }, [cart]);

    const addToGlobalCart = (item: MenuItem, cafe: Cafe) => {
        setCart(prev => {
            const newCart = { ...prev };
            const cafeId = cafe.id;
            
            if (!newCart[cafeId]) {
                newCart[cafeId] = {
                    cafe: { id: cafe.id, name: cafe.name, image: cafe.image, owner_id: cafe.owner_id },
                    items: []
                };
            }

            const existingItem = newCart[cafeId].items.find(i => i.menu_item_id === item.id);
            if (existingItem) {
                newCart[cafeId].items = newCart[cafeId].items.map(i => 
                    i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                newCart[cafeId].items.push({
                    menu_item_id: item.id,
                    quantity: 1,
                    price_at_order: parseInt(item.price),
                    menu_item: item
                });
            }
            return newCart;
        });
    };

    const removeFromGlobalCart = (itemId: string, cafeId: string) => {
        setCart(prev => {
            const newCart = { ...prev };
            if (!newCart[cafeId]) return prev;

            const existingItem = newCart[cafeId].items.find(i => i.menu_item_id === itemId);
            if (existingItem && existingItem.quantity > 1) {
                newCart[cafeId].items = newCart[cafeId].items.map(i => 
                    i.menu_item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i
                );
            } else {
                newCart[cafeId].items = newCart[cafeId].items.filter(i => i.menu_item_id !== itemId);
            }

            if (newCart[cafeId].items.length === 0) {
                delete newCart[cafeId];
            }

            return newCart;
        });
    };

    const clearCafeCart = (cafeId: string) => {
        setCart(prev => {
            const newCart = { ...prev };
            delete newCart[cafeId];
            return newCart;
        });
    };

    const saveUser = (userData: User | null) => {
        if (!mounted.current) return;
        if (userData) {
            setUser(userData);
            SafeStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        } else {
            setUser(null);
            SafeStorage.removeItem(USER_DATA_KEY);
        }
    };

    useEffect(() => {
        if (!user) {
            setOnlineUserIds([]);
            return;
        }

        const presenceChannel = supabase.channel('global_online_users');
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const ids: string[] = [];
                for (const key in newState) {
                    const users = newState[key] as any[];
                    users.forEach(u => {
                        if (u.user_id) ids.push(u.user_id);
                    });
                }
                setOnlineUserIds([...new Set(ids)]);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
                }
            });

        const notifChannel = supabase.channel(`notifs:${user.id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications', 
                filter: `user_id=eq.${user.id}` 
            }, (payload) => {
                const newNotif = payload.new as any;
                setNotifications(prev => [
                    {
                        id: newNotif.id,
                        title: newNotif.title,
                        message: newNotif.message,
                        type: newNotif.type,
                        isRead: newNotif.is_read,
                        time: newNotif.created_at,
                        targetId: newNotif.target_id
                    },
                    ...prev
                ]);
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(presenceChannel); 
            supabase.removeChannel(notifChannel);
        };
    }, [user?.id]);

    const syncProfileBackground = async (userId: string, email?: string) => {
        try {
            const profile = await ensureUserProfile({ id: userId, email });
            if (profile && (profile.role === 'ADMIN' || profile.role === 'CAFE_MANAGER')) {
                await signOutUser();
                saveUser(null);
                return;
            }

            if (profile && mounted.current) {
                setUser(prev => {
                    if (JSON.stringify(prev) !== JSON.stringify(profile)) {
                        SafeStorage.setItem(USER_DATA_KEY, JSON.stringify(profile));
                        return profile;
                    }
                    return prev;
                });
                fetchNotifications(userId).then(notifs => {
                    if (mounted.current) setNotifications(notifs);
                }).catch(() => {});
            }
        } catch (error) {
            console.error("Background sync failed", error);
        }
    };

    const restoreSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                syncProfileBackground(session.user.id, session.user.email);
            }
            if (mounted.current) setIsSessionLoading(false);
            initialCheckDone.current = true;
        } catch (e) {
            if (mounted.current) setIsSessionLoading(false);
            initialCheckDone.current = true;
        }
    };

    useEffect(() => {
        mounted.current = true;
        restoreSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted.current) return;
            if (event === 'SIGNED_IN' && session?.user) {
                syncProfileBackground(session.user.id, session.user.email);
                setIsSessionLoading(false);
            } 
            else if (event === 'SIGNED_OUT') {
                saveUser(null);
                setNotifications([]);
                setIsSessionLoading(false);
            }
        });

        return () => {
            mounted.current = false;
            authListener.subscription.unsubscribe();
        };
    }, []); 

    const refreshUserProfile = async (userId: string) => {
        await syncProfileBackground(userId);
        return user;
    };
    const updateLocalUser = (updates: Partial<User>) => {
        if (!user) return;
        const updated = { ...user, ...updates };
        saveUser(updated);
    };
    const markNotificationRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try { await markNotificationReadDB(id); } catch(e) {}
    };
    const markAllNotificationsRead = async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try { await markAllNotificationsReadDB(user.id); } catch(e) {}
    };
    const deleteNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        try { await deleteNotificationDB(id); } catch(e) {}
    };
    const clearAllNotifications = async () => {
        if (!user) return;
        setNotifications([]);
        try { await deleteAllNotificationsDB(user.id); } catch(e) {}
    };

    return (
        <SessionContext.Provider value={{ 
            user, setUser, notifications, setNotifications, 
            cart, addToGlobalCart, removeFromGlobalCart, clearCafeCart,
            isDarkMode, toggleDarkMode, 
            refreshUserProfile, updateLocalUser, isSessionLoading,
            markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications, onlineUserIds
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) throw new Error('useSession must be used within a SessionProvider');
    return context;
};
