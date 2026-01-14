
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Bell, User as UserIcon, ChevronDown, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { User } from '../types';
import { LazyImage } from './UI';
import { debounce } from '../services/dataService';
import { LOGO_HOME_URL, getOptimizedImageUrl } from '../constants';

interface MobileTopHeaderProps {
    user: User | null;
    selectedCityName: string;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onSearchClick: () => void;
    onNotifClick: () => void;
    onProfileClick: () => void;
    unreadCount: number;
    currentView: string;
    customTitle?: string | null;
    isLocating?: boolean;
    locationStatus?: 'prompt' | 'granted' | 'denied' | 'unsupported';
    onRequestGPS?: () => void;
}

export const MobileTopHeader: React.FC<MobileTopHeaderProps> = ({
    user, onSearchClick, 
    onNotifClick, onProfileClick, unreadCount, currentView, selectedCityName, customTitle, 
    isLocating, locationStatus, onRequestGPS
}) => {
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = debounce(() => {
            setIsScrolled(window.scrollY > 10);
        }, 10);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const hiddenViews = ['MAP', 'DETAIL', 'DASHBOARD', 'SUPPORT', 'EMAIL_CONFIRMED', 'PRIVACY_POLICY'];
    if (hiddenViews.includes(currentView)) return null;

    const isHome = currentView === 'HOME';
    
    // SOLID HEADER LOGIC
    const bgClass = 'bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-sm';
    
    // High contrast content colors
    const contentColor = 'text-gray-900 dark:text-white';
    const subTextColor = 'text-gray-400 dark:text-slate-500';
    const btnBg = 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700';

    const getViewTitle = (view: string) => {
        switch (view) {
            case 'EXPLORE': return 'Jelajah';
            case 'PROMO': return 'Promo Diskon';
            case 'COMMUNITY': return 'Warga Lokal';
            case 'COLLECTION': return 'Koleksi';
            default: return '';
        }
    };

    const pageTitle = customTitle || getViewTitle(currentView);

    // Dynamic Location Badge UI
    const renderLocationInfo = () => {
        if (locationStatus === 'denied') {
            return (
                <button 
                    onClick={onRequestGPS}
                    className="flex items-center gap-1 mb-0.5 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/40 animate-pulse"
                >
                    <ShieldAlert size={10} className="text-red-500" />
                    <span className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 tracking-tight">GPS Mati ⚠️</span>
                </button>
            );
        }

        return (
            <div className="flex items-center gap-1 mb-0.5">
                {isLocating ? (
                    <Loader2 size={10} className="text-orange-500 animate-spin" />
                ) : (
                    <MapPin size={10} className={locationStatus === 'granted' ? "text-green-500" : "text-orange-500"} fill="currentColor" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[120px] ${subTextColor} ${isLocating ? 'animate-pulse' : ''}`}>
                    {String(selectedCityName)}
                </span>
            </div>
        );
    };

    return (
        <div className={`
            fixed top-0 left-0 right-0 z-[60] md:hidden transition-all duration-300
            ${bgClass}
            pt-[calc(env(safe-area-inset-top)+0.2rem)] pb-2 px-5
        `}>
            <div className="flex items-center justify-between h-14">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col">
                        {renderLocationInfo()}
                        
                        {isHome ? (
                            <img 
                                src={getOptimizedImageUrl(LOGO_HOME_URL, 300)} 
                                className="h-6 w-auto transition-all" 
                                alt="Nongkrongr" 
                            />
                        ) : (
                            <h1 className={`text-xl font-display font-black tracking-tighter leading-none animate-in fade-in slide-in-from-left-4 duration-500 ${contentColor}`}>
                                {pageTitle}
                            </h1>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={onSearchClick} 
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 border shadow-sm ${btnBg} ${contentColor}`}
                    >
                        <Search size={18} />
                    </button>

                    {user && (
                        <button 
                            onClick={onNotifClick} 
                            className={`w-10 h-10 relative rounded-2xl flex items-center justify-center transition-all active:scale-90 border shadow-sm ${btnBg} ${contentColor}`}
                        >
                            <Bell size={20} strokeWidth={2.5} fill={unreadCount > 0 ? "currentColor" : "none"} />
                            {unreadCount > 0 && (
                                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>
                            )}
                        </button>
                    )}
                    
                    <button 
                        onClick={onProfileClick} 
                        className="w-10 h-10 rounded-2xl border-2 border-orange-500/20 shadow-md overflow-hidden active:scale-90 transition-transform"
                    >
                        {user ? (
                            <LazyImage src={user.avatar_url} className="w-full h-full object-cover" alt="Me" />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${btnBg} ${contentColor}`}>
                                <UserIcon size={16} />
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
