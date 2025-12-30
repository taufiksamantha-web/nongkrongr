
import React, { useState, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, Home, Sun, Moon, LogOut, X, 
    TrendingUp, ArrowUpRight, CheckSquare, 
    PieChart, Award, Star, Loader2, Save, UploadCloud, 
    Link as LinkIcon, Image as ImageIcon, Briefcase, Camera,
    Clock, CheckCircle, Users, Store, MessageSquare, Flag, Settings, User as UserIcon, BarChart3, MessageCircle, Heart, History, Plus, Trash2, Crosshair, AlertCircle,
    Wifi, Wind, Music, Zap, Car, LayoutGrid, Tag, Calendar, Ticket, Phone, MapPin, BadgeCheck, ChevronDown, Check, Search, Trophy, Medal, Copy, FileText, Upload, ChevronRight, Menu, FileCode, Bell, LifeBuoy, Receipt
} from 'lucide-react';
import { User, Cafe, AppNotification } from '../types';
import { GlassCard, Button, Input, Modal, LazyImage } from './UI';
import { getOptimizedImageUrl, formatRating, LOGO_HOME_URL, APP_CODE_STRUCTURE } from '../constants';
import { subscribeUserToPush } from '../services/dataService';
import { NotificationDrawer } from './NotificationDrawer';

export const MENU_ITEMS_USER = [
    { id: 'profile', label: 'Profil', icon: UserIcon },
    { id: 'favorites', label: 'Favorit', icon: Heart },
    { id: 'orders', label: 'Pesanan', icon: Receipt },
    { id: 'history', label: 'Jejak', icon: History },
    { id: 'support', label: 'Bantuan', icon: LifeBuoy },
];

export const DashboardHeader: React.FC<{ title: string, subtitle?: string, action?: React.ReactNode }> = ({ title, subtitle, action }) => (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-10 animate-in slide-in-from-top-4 fade-in duration-500">
        <div>
            <h1 className="text-3xl md:text-5xl font-display font-black text-gray-900 tracking-tight leading-tight mt-2 md:mt-0">{title}</h1>
            {subtitle && <p className="text-gray-500 text-sm md:text-base mt-2 font-medium max-w-xl leading-relaxed">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

export const DashboardLayout: React.FC<{
    user: User;
    menuItems: { id: string; label: string; icon: any }[];
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    onHome: () => void;
    children: React.ReactNode;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    notifications?: AppNotification[];
    onMarkRead?: (id: string) => void;
    onMarkAllRead?: () => void;
    onDeleteNotification?: (id: string) => void;
    onClearAllNotifications?: () => void;
    badges?: Record<string, boolean | number>;
    onNotificationClick?: (notification: AppNotification) => void;
}> = ({ 
    user, menuItems, activeTab, setActiveTab, onLogout, onHome, children, isDarkMode, toggleDarkMode,
    notifications = [], onMarkRead, onMarkAllRead, onDeleteNotification, onClearAllNotifications,
    badges = {}, onNotificationClick
}) => { 
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const lastScrollY = useRef(0);
    const currentTranslateY = useRef(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const navRef = useRef<HTMLDivElement>(null);
    const scrollTimeout = useRef<any>(null);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Logic to sync nav with inner container scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const currentScrollY = container.scrollTop;
            const delta = currentScrollY - lastScrollY.current;
            
            if (currentScrollY < 20) {
                currentTranslateY.current = 0;
            } else {
                currentTranslateY.current = Math.max(0, Math.min(150, currentTranslateY.current + (delta * 0.8)));
            }

            if (navRef.current) {
                navRef.current.style.transform = `translate(-50%, ${currentTranslateY.current}%)`;
            }
            
            lastScrollY.current = currentScrollY;

            // Snapping
            clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                if (currentTranslateY.current > 0 && currentTranslateY.current < 150) {
                    const target = currentTranslateY.current > 60 ? 150 : 0;
                    currentTranslateY.current = target;
                    if (navRef.current) {
                        navRef.current.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
                        navRef.current.style.transform = `translate(-50%, ${target}%)`;
                        setTimeout(() => {
                            if (navRef.current) navRef.current.style.transition = 'none';
                        }, 400);
                    }
                }
            }, 150);
        };

        if (navRef.current) navRef.current.style.transition = 'none';
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(scrollTimeout.current);
        };
    }, []);

    const handleBellClick = async () => {
        setIsNotifOpen(!isNotifOpen);
        if (Notification.permission === 'default') {
            await subscribeUserToPush(user.id);
        }
    };

    const handleNotifClick = (n: AppNotification) => {
        if (onNotificationClick) onNotificationClick(n);
        setIsNotifOpen(false);
    };

    const MobileDashboardNav = () => (
        <div 
            ref={navRef}
            style={{ transform: 'translate(-50%, 0%)', willChange: 'transform' }}
            className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+0.3rem)] left-1/2 z-[1000] w-[92%] max-w-md"
        >
            <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-white/10 rounded-[2.2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] p-2 flex items-center justify-between ring-1 ring-black/5">
                {menuItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`
                                relative flex items-center justify-center transition-all duration-500 ease-out h-14
                                ${isActive 
                                    ? 'bg-gradient-to-tr from-orange-500 to-red-600 text-white px-5 rounded-[1.6rem] shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] flex-grow' 
                                    : 'text-gray-400 dark:text-slate-500 w-14 hover:text-orange-500'
                                }
                                active:scale-90
                            `}
                        >
                            <item.icon size={22} strokeWidth={isActive ? 3 : 2.5} />
                            {isActive && (
                                <span className="ml-2.5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">
                                    {item.label}
                                </span>
                            )}
                            {badges[item.id] && !isActive && (
                                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-gray-800 flex transition-colors duration-300 font-sans selection:bg-orange-500/30">
            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex flex-col w-[280px] fixed left-6 top-6 bottom-6 bg-white/80 rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-white/50 z-50 overflow-hidden backdrop-blur-2xl transition-all duration-300">
                <div className="h-28 flex items-center justify-center shrink-0">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={onHome}>
                        <img src={getOptimizedImageUrl(LOGO_HOME_URL, 300)} className="h-7 w-auto object-contain" alt="Nongkrongr" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-1.5">
                    {menuItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => setActiveTab(item.id)} 
                            className={`
                                w-full flex items-center gap-4 px-6 py-4 rounded-[2rem] text-sm font-bold transition-all duration-300 relative overflow-hidden group
                                ${activeTab === item.id 
                                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/30' 
                                    : 'text-gray-500 hover:bg-white hover:text-gray-900'
                                }
                            `}
                        >
                            <item.icon size={20} className={`relative z-10 transition-transform group-hover:scale-110 ${activeTab === item.id ? "animate-pulse" : ""}`} />
                            <span className="relative z-10 flex-1 text-left">{item.label}</span>
                            {badges[item.id] && (
                                <span className="relative z-10 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
                <div className="p-4 mt-2">
                    <div className="bg-white/50 p-4 rounded-[2.5rem] border border-gray-100 backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <LazyImage src={user.avatar_url} className="w-10 h-10 rounded-full bg-gray-200 ring-2 ring-white shadow-sm" alt={user.name} />
                            <div className="min-w-0 overflow-hidden">
                                <p className="text-sm font-bold truncate text-gray-900">{user.name.split(' ')[0]}</p>
                                <p className="text-[9px] text-gray-500 truncate font-bold uppercase tracking-wider">{user.role}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleBellClick} className="flex-1 h-10 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-orange-600 transition-colors flex items-center justify-center text-gray-500 relative">
                                <Bell size={18} />
                                {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>}
                            </button>
                            <button onClick={onLogout} className="flex-1 h-10 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center text-gray-500">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MOBILE HEADER */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl z-40 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 transition-all border-b border-gray-100 shadow-sm">
                <div onClick={onHome} className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                    <Home size={20} />
                </div>
                
                <span className="font-display font-black text-gray-900 tracking-tight text-lg">
                    { menuItems.find(item => item.id === activeTab)?.label || 'Dashboard' }
                </span>

                <div className="flex items-center gap-2">
                    <button onClick={handleBellClick} className="relative w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
                        <Bell size={20} />
                        {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                    </button>
                    <button onClick={onLogout} className="w-10 h-10 bg-red-50 text-red-500 rounded-full flex items-center justify-center active:scale-90 transition-transform">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col h-screen overflow-hidden md:pl-[340px]">
                <div 
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 pb-40 md:pb-10 pt-[calc(env(safe-area-inset-top)+5rem)] md:pt-10 scroll-smooth"
                >
                    <div className="max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </div>
            </div>

            {/* MOBILE FLOATING NAV */}
            <MobileDashboardNav />

            <NotificationDrawer 
                isOpen={isNotifOpen} 
                onClose={() => setIsNotifOpen(false)} 
                notifications={notifications}
                onMarkAllRead={onMarkAllRead}
                onClearAll={onClearAllNotifications}
                onDelete={onDeleteNotification}
                onMarkRead={onMarkRead}
                onItemClick={handleNotifClick}
            />
        </div>
    ); 
};
