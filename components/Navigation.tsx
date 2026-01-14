
import React, { useState, useRef, useEffect } from 'react';
import { Home, Map as MapIcon, Compass, Bell, LayoutDashboard, LogOut, Ticket, Users } from 'lucide-react';
import { ViewState, User, AppNotification } from '../types';
import { LOGO_HOME_URL, getOptimizedImageUrl } from '../constants';
import { LazyImage } from './UI';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { NotificationDrawer } from './NotificationDrawer'; 
import { subscribeUserToPush } from '../services/dataService'; 

type NavigationProps = {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  userRole: string;
  isLoggedIn: boolean;
  onLoginClick: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  user?: User | null;
  onLogout?: () => void;
  notifications?: AppNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAllNotifications?: () => void; 
  onNotificationClick?: (notification: AppNotification) => void;
  onDeleteNotification?: (id: string) => void; 
  isSessionLoading?: boolean; 
  onVisibilityChange?: (isVisible: boolean) => void; 
};

export const Navigation: React.FC<NavigationProps> = ({
  currentView, setView, isLoggedIn, onLoginClick, isDarkMode, toggleDarkMode, user, onLogout,
  notifications = [], onMarkRead, onMarkAllRead, onClearAllNotifications, onNotificationClick, onDeleteNotification, isSessionLoading = true,
  onVisibilityChange
}) => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  
  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const currentTranslateY = useRef(0);
  const scrollTimeout = useRef<any>(null);

  useEffect(() => {
    if (isDesktop) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (currentScrollY < 20) {
        currentTranslateY.current = 0;
      } else {
        currentTranslateY.current = Math.max(0, Math.min(150, currentTranslateY.current + (delta * 0.8)));
      }

      if (navRef.current) {
        navRef.current.style.transform = `translate(-50%, ${currentTranslateY.current}%)`;
        
        if (currentTranslateY.current > 75) {
            onVisibilityChange?.(false);
        } else {
            onVisibilityChange?.(true);
        }
      }

      lastScrollY.current = currentScrollY;

      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        if (currentTranslateY.current > 0 && currentTranslateY.current < 150) {
            const target = currentTranslateY.current > 60 ? 150 : 0;
            currentTranslateY.current = target;
            if (navRef.current) {
                navRef.current.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
                navRef.current.style.transform = `translate(-50%, ${target}%)`;
                onVisibilityChange?.(target === 0);
                setTimeout(() => {
                    if (navRef.current) navRef.current.style.transition = 'none';
                }, 400);
            }
        }
      }, 150);
    };

    if (navRef.current) navRef.current.style.transition = 'none';

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout.current);
    };
  }, [isDesktop, onVisibilityChange]);

  if (currentView === 'DASHBOARD') return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotifClick = (n: AppNotification) => {
      if (onNotificationClick) onNotificationClick(n);
      setIsNotifOpen(false);
  };

  const DesktopHeader = () => (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-[1000] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 h-20 items-center">
      <div className="w-full max-w-7xl mx-auto px-6 flex justify-between items-center relative h-full">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('HOME')}>
          <img src={getOptimizedImageUrl(LOGO_HOME_URL, 400)} alt="Nongkrongr Logo" className="h-8 w-auto" />
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-gray-50 dark:bg-slate-800 p-1.5 rounded-full border border-gray-100 dark:border-slate-700 shadow-inner">
          {[
            { id: 'HOME', label: 'Beranda', icon: Home },
            { id: 'EXPLORE', label: 'Jelajah', icon: Compass },
            { id: 'PROMO', label: 'Promo', icon: Ticket },
            { id: 'COMMUNITY', label: 'Komunitas', icon: Users },
            { id: 'MAP', label: 'Peta', icon: MapIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-black transition-all ${
                currentView === item.id
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'text-gray-500 dark:text-slate-400 hover:text-orange-500'
              }`}
            >
              <item.icon size={16} strokeWidth={3} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {!isSessionLoading && isLoggedIn && user ? (
            <>
              <button
                onClick={async () => {
                    setIsNotifOpen(!isNotifOpen);
                    if (Notification.permission === 'default') await subscribeUserToPush(user.id);
                }}
                className="w-11 h-11 rounded-full flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-500 transition-all relative border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <Bell size={20} strokeWidth={2.5} />
                {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800 animate-pulse"></span>}
              </button>

              <div className="dropdown relative group">
                <div className="w-11 h-11 rounded-full p-0.5 border-2 border-orange-500/20 cursor-pointer overflow-hidden transition-transform active:scale-95 shadow-sm">
                  <LazyImage src={user.avatar_url} className="w-full h-full rounded-full object-cover" alt={user.name} />
                </div>
                <div className="absolute right-0 top-full pt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden ring-1 ring-black/5">
                    <div className="px-5 py-3 border-b border-gray-50 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                        <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Sesi Aktif</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    </div>
                    <button onClick={() => setView('DASHBOARD')} className="w-full text-left px-5 py-4 text-sm font-bold text-gray-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-3">
                      <LayoutDashboard size={18} /> Dashboard
                    </button>
                    <button onClick={onLogout} className="w-full text-left px-5 py-4 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 border-t border-gray-50 dark:border-slate-700">
                      <LogOut size={18} /> Keluar Akun
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : !isSessionLoading && (
            <button onClick={onLoginClick} className="px-8 py-3 bg-orange-500 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-xl shadow-orange-500/30 active:scale-95 transition-all hover:bg-orange-600 hover:shadow-orange-500/50">
              Masuk
            </button>
          )}
        </div>
      </div>
    </nav>
  );

  const MobileBottomNav = () => {
    if (currentView === 'DETAIL' || currentView === 'EMAIL_CONFIRMED' || currentView === 'SUPPORT') return null;
    const navItems = [
      { id: 'HOME', icon: Home, label: 'Beranda' },
      { id: 'EXPLORE', icon: Compass, label: 'Eksplor' },
      { id: 'MAP', icon: MapIcon, label: 'Peta' },
      { id: 'PROMO', icon: Ticket, label: 'Promo' },
      { id: 'COMMUNITY', icon: Users, label: 'Warga' },
    ];

    return (
      <div 
        ref={navRef}
        style={{ transform: 'translate(-50%, 0%)', willChange: 'transform' }}
        className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+0.3rem)] left-1/2 z-[9000] w-[92%] max-w-md pointer-events-none"
      >
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-[2.2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] p-2 flex items-center justify-between pointer-events-auto ring-1 ring-black/5">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button 
                key={item.id} 
                onClick={() => setView(item.id as ViewState)} 
                className={`
                  relative flex items-center justify-center transition-all duration-500 ease-out h-14
                  ${isActive 
                    ? 'bg-gradient-to-tr from-orange-500 to-red-600 text-white px-5 rounded-[1.6rem] shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] flex-grow' 
                    : 'text-gray-400 dark:text-slate-500 w-14 hover:text-orange-500'
                  }
                  active:scale-90
                `}
              >
                <div className="relative flex items-center justify-center">
                  <item.icon size={22} strokeWidth={isActive ? 3 : 2.5} className="transition-transform duration-300" />
                  {!isActive && item.id === 'MAP' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                  )}
                </div>
                
                {isActive && (
                  <span className="ml-2.5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-left-4 duration-300">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {isDesktop ? <DesktopHeader /> : <MobileBottomNav />}
      <NotificationDrawer 
          isOpen={isNotifOpen} 
          onClose={() => setIsNotifOpen(false)} 
          notifications={notifications}
          onMarkAllRead={onMarkAllRead}
          onClearAll={onClearAllNotifications}
          onItemClick={handleNotifClick}
          onDelete={onDeleteNotification}
          onMarkRead={onMarkRead}
      />
    </>
  );
};
