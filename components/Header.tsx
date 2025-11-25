
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ThemeContext } from '../App';
import NotificationPanel from './NotificationPanel';
import ConfirmationModal from './common/ConfirmationModal';
import { 
    SunIcon, MoonIcon, ArrowRightOnRectangleIcon, BellIcon,
    HomeIcon, MapIcon, RocketLaunchIcon, FireIcon, Squares2X2Icon,
    UserIcon, ChartBarSquareIcon, TrophyIcon, EnvelopeIcon
} from '@heroicons/react/24/solid';
import {
    HomeIcon as HomeOutline,
    UserIcon as UserOutline,
} from '@heroicons/react/24/outline';

const getDashboardPath = (role?: string) => {
    switch (role) {
        case 'admin': return '/dashboard-admin';
        case 'admin_cafe': return '/dashboard-pengelola';
        default: return '/dashboard-profile';
    }
};

// --- Desktop Nav Pill ---
const NavPill: React.FC = () => {
    const location = useLocation();
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const navRef = useRef<HTMLDivElement>(null);

    const navLinks = [
        { path: '/', label: 'Home' },
        { path: '/explore', label: 'Explore' },
        { path: '/about', label: 'Tentang Kami' }
    ];

    useEffect(() => {
        const updatePill = () => {
            setTimeout(() => {
                const activeLink = navRef.current?.querySelector('a.active');
                if (activeLink instanceof HTMLElement) {
                    setPillStyle({
                        left: activeLink.offsetLeft,
                        width: activeLink.offsetWidth,
                        opacity: 1
                    });
                } else {
                    setPillStyle(prev => ({ ...prev, opacity: 0 }));
                }
            }, 50);
        };

        updatePill();
        window.addEventListener('resize', updatePill);
        return () => window.removeEventListener('resize', updatePill);
    }, [location.pathname]);

    return (
        <div className="hidden lg:flex relative bg-brand/5 dark:bg-gray-700/50 p-1.5 rounded-2xl border border-brand/10 dark:border-gray-600 items-center" ref={navRef}>
            <div 
                className="absolute bg-brand border border-brand rounded-xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-md shadow-brand/20 h-[calc(100%-12px)]"
                style={{ 
                    left: pillStyle.left, 
                    width: pillStyle.width, 
                    opacity: pillStyle.opacity,
                    top: '6px',
                    zIndex: 0
                }}
            />
            
            {navLinks.map((link) => (
                <NavLink 
                    key={link.path} 
                    to={link.path}
                    className={({ isActive }) => 
                        `relative z-10 px-5 py-2 rounded-xl font-bold transition-colors duration-300 text-sm ${
                            isActive 
                            ? 'active text-white' 
                            : 'text-gray-600 hover:text-brand dark:text-gray-300 dark:hover:text-white'
                        }`
                    }
                >
                    {link.label}
                </NavLink>
            ))}
        </div>
    );
};

// --- Mobile Bottom Navigation (Floating Dock Redesigned) ---
const MobileBottomNav: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const { currentUser } = useAuth();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const [showExploreMenu, setShowExploreMenu] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    
    const dockRef = useRef<HTMLDivElement>(null);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
                setShowExploreMenu(false);
                setShowProfileMenu(false);
            }
        };
        
        // Use click instead of mousedown for better mobile support
        document.addEventListener("click", handleClickOutside); 
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    // Close menus on navigation
    useEffect(() => {
        setShowExploreMenu(false);
        setShowProfileMenu(false);
    }, [location]);

    // HIDE Global Nav on Dashboard Routes (AdminPage handles its own nav)
    if (location.pathname.includes('/dashboard')) {
        return null;
    }

    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent immediate close from document listener
        if (!currentUser) {
            navigate('/login');
        } else {
            setShowProfileMenu(prev => !prev);
            setShowExploreMenu(false);
        }
    };

    const handleExploreClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent immediate close
        setShowExploreMenu(prev => !prev);
        setShowProfileMenu(false);
    };

    const handleMenuAction = (action: () => void) => {
        action();
        setShowProfileMenu(false);
    };

    // Helper for proportional spacing styles with Dark Mode Fix
    const navItemClass = ({ isActive }: { isActive: boolean }) => `
        flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300
        ${isActive 
            ? 'text-brand dark:text-brand-light bg-brand/10 dark:bg-brand/20' 
            : 'text-muted hover:text-primary dark:hover:text-white'}
    `;

    return (
        <div className="fixed bottom-6 left-0 right-0 z-[100] lg:hidden flex justify-center pointer-events-none px-4" ref={dockRef}>
            
            {/* Explore Popover Menu */}
            <div className={`absolute bottom-24 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom ${showExploreMenu ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto' : 'scale-75 opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="bg-card dark:bg-gray-900 border border-border shadow-2xl rounded-3xl p-3 flex flex-col gap-2 w-48 ring-1 ring-black/5">
                    <button onClick={() => navigate('/explore?sort=distance')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand/10 dark:hover:bg-white/5 transition-colors text-left group">
                        <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300 rounded-xl group-hover:scale-110 transition-transform">
                            <MapIcon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-sm text-primary dark:text-white">Terdekat</span>
                    </button>
                    <button onClick={() => navigate('/explore?sort=trending')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand/10 dark:hover:bg-white/5 transition-colors text-left group">
                        <div className="p-2 bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-300 rounded-xl group-hover:scale-110 transition-transform">
                            <FireIcon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-sm text-primary dark:text-white">Lagi Hits</span>
                    </button>
                    <button onClick={() => navigate('/explore')} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-brand/10 dark:hover:bg-white/5 transition-colors text-left group">
                        <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 rounded-xl group-hover:scale-110 transition-transform">
                            <RocketLaunchIcon className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-sm text-primary dark:text-white">Explore</span>
                    </button>
                </div>
            </div>

            {/* Profile Popover Menu - Redesigned: Big Horizontal Icons, Auto Close */}
            <div className={`absolute bottom-24 right-4 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right ${showProfileMenu ? 'scale-100 opacity-100 translate-y-0 pointer-events-auto' : 'scale-50 opacity-0 translate-y-10 pointer-events-none'}`}>
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-border shadow-2xl rounded-full p-3 flex items-center gap-3 ring-1 ring-black/5">
                    <div className="flex items-center gap-3">
                        {/* Dashboard Button */}
                        <button 
                            onClick={() => handleMenuAction(() => navigate(getDashboardPath(currentUser?.role)))} 
                            className="w-14 h-14 rounded-full bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand-light hover:bg-brand hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Dashboard"
                        >
                            <ChartBarSquareIcon className="h-7 w-7" />
                        </button>

                        {/* Theme Toggle */}
                        <button 
                            onClick={() => handleMenuAction(toggleTheme)} 
                            className="w-14 h-14 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Ganti Tema"
                        >
                            {theme === 'light' ? <MoonIcon className="h-7 w-7" /> : <SunIcon className="h-7 w-7" />}
                        </button>

                        {/* Logout */}
                        <button 
                            onClick={() => handleMenuAction(onLogout)} 
                            className="w-14 h-14 rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 flex items-center justify-center shadow-sm"
                            title="Keluar"
                        >
                            <ArrowRightOnRectangleIcon className="h-7 w-7" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Dock - Proportional 5 Items Layout using justify-between and fixed width */}
            <nav className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-brand/10 rounded-full px-2 h-16 flex items-center justify-between pointer-events-auto relative w-full max-w-[360px] transition-all duration-300">
                
                <NavLink to="/" className={navItemClass}>
                    {({ isActive }) => isActive ? <HomeIcon className="h-6 w-6" /> : <HomeOutline className="h-6 w-6" />}
                </NavLink>

                <NavLink to="/leaderboard" className={navItemClass}>
                    {({ isActive }) => <TrophyIcon className={`h-6 w-6 ${isActive ? 'text-accent-amber' : ''}`} />}
                </NavLink>

                {/* Big Center Button (Explore) - Slightly Elevated */}
                <div className="relative -top-5">
                    <button
                        onClick={handleExploreClick}
                        className={`
                            w-14 h-14 rounded-full flex items-center justify-center transform transition-all duration-300 hover:scale-105 border-4 border-white dark:border-gray-900
                            ${showExploreMenu 
                                ? 'bg-primary rotate-45 scale-95 text-white dark:text-gray-900' // Dark mode fix: Icon becomes dark when bg is white(primary)
                                : 'bg-brand text-white shadow-lg shadow-brand/40'
                            }
                        `}
                    >
                        <Squares2X2Icon className="h-6 w-6" />
                    </button>
                </div>

                <NavLink to="/feedback" className={navItemClass}>
                    {({ isActive }) => <EnvelopeIcon className={`h-6 w-6 ${isActive ? 'text-blue-500' : ''}`} />}
                </NavLink>

                <button
                    onClick={handleProfileClick}
                    className={`
                        flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-300 overflow-hidden
                        ${showProfileMenu ? 'ring-2 ring-brand ring-offset-2 dark:ring-offset-gray-900' : ''}
                    `}
                >
                    {currentUser?.avatar_url ? (
                        <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        currentUser ? (
                            <div className="w-full h-full bg-brand/10 flex items-center justify-center text-brand font-bold text-sm dark:bg-brand/20 dark:text-brand-light">
                                {currentUser.username.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-muted hover:text-primary dark:hover:text-white">
                                <UserOutline className="h-6 w-6" />
                            </div>
                        )
                    )}
                </button>
            </nav>
        </div>
    );
};

const Header: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { currentUser, logout, isLoggingOut } = useAuth();
  const { unreadCount } = useNotifications();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    // Rely on AuthContext global loading state for UI feedback
    const { error } = await logout();
    if (error) {
        console.error("Logout failed:", error.message);
        alert(`Gagal untuk logout: ${error.message}`);
    } else {
        // Force navigation to Homepage
        navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifRef]);

  return (
    <>
      {/* TOP HEADER (Desktop & Mobile) */}
      <div className="container mx-auto px-4 pt-safe-top sticky top-4 z-[60] w-full max-w-6xl">
        <header className="bg-card/80 dark:bg-gray-800/80 backdrop-blur-md border border-border rounded-full p-2 px-4 sm:p-4 shadow-sm flex items-center justify-between transition-all duration-300 relative min-h-[60px]">
          <nav className="w-full flex items-center relative justify-between">
            
            {/* Logo Section */}
            <Link 
                to="/" 
                className="flex items-center flex-shrink-0 transition-all duration-500 mr-auto lg:mr-6"
            >
              <img 
                src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" 
                alt="Nongkrongr Logo" 
                className="w-auto h-8 sm:h-10 object-contain transition-all" 
              />
            </Link>
            
            {/* Center Navigation (Desktop Only) */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden lg:block">
                <NavPill />
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              
              {/* Guest Mode: Only Theme Toggle (on Mobile) or Login (on Desktop) */}
              {!currentUser ? (
                  <div className="flex items-center gap-2">
                      <div className="flex items-center bg-brand/5 dark:bg-gray-700/50 rounded-full p-1 sm:p-1.5 border border-brand/10 dark:border-gray-600">
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full text-muted hover:text-yellow-500 hover:bg-white dark:hover:bg-gray-600 transition-all"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                        </button>
                      </div>
                      
                      {/* Desktop Login Button (Hidden on mobile as per request) */}
                      <Link to="/login" className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-brand text-white hover:bg-brand/90 transition-all shadow-md shadow-brand/20" aria-label="Login">
                        <span>Login</span>
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </Link>
                  </div>
              ) : (
                  /* Logged In User Actions */
                  <div className="flex items-center bg-brand/5 dark:bg-gray-700/50 rounded-full p-1 sm:p-1.5 border border-brand/10 dark:border-gray-600">
                      {/* Theme Toggle (Hidden on mobile for logged in user to save space, usually in profile menu) */}
                      <button 
                        onClick={toggleTheme} 
                        className="p-2 rounded-full text-muted hover:text-yellow-500 hover:bg-white dark:hover:bg-gray-600 transition-all hidden sm:block"
                        aria-label="Toggle theme"
                      >
                        {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                      </button>

                      <div className="hidden sm:block w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                      
                      {/* Notification Bell */}
                      <div className="relative" ref={notifRef}>
                          <button
                              onClick={() => setIsNotifOpen(!isNotifOpen)}
                              className="p-2 rounded-full text-muted hover:text-brand hover:bg-white dark:hover:bg-gray-600 transition-all relative"
                              aria-label="Notifikasi"
                          >
                              <BellIcon className="h-6 w-6 sm:h-5 sm:w-5" />
                              {unreadCount > 0 && (
                                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-card shadow-sm"></span>
                              )}
                          </button>
                          <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} origin="top" />
                      </div>
                      
                      {/* Desktop Profile/Logout (Hidden on Mobile) */}
                      <div className="hidden sm:flex items-center gap-1 ml-1">
                            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                            <Link to={getDashboardPath(currentUser.role)} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-primary dark:text-white hover:bg-white dark:hover:bg-gray-600 transition-all">
                                {currentUser.avatar_url ? (
                                    <img src={currentUser.avatar_url} alt="Profile" className="h-6 w-6 rounded-full object-cover border border-brand/20" />
                                ) : (
                                    <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                                        {currentUser.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="max-w-[80px] truncate">{currentUser.username}</span>
                            </Link>
                            <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 rounded-full text-muted hover:text-red-500 hover:bg-white dark:hover:bg-gray-600 transition-all" title="Logout">
                                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            </button>
                        </div>
                  </div>
              )}
            </div>
          </nav>
        </header>
      </div>

      {/* BOTTOM FLOATING DOCK (Mobile Only) */}
      <MobileBottomNav onLogout={() => setIsLogoutModalOpen(true)} />

      {isLogoutModalOpen && (
        <ConfirmationModal
          title="Konfirmasi Logout"
          message="Apakah Anda yakin ingin keluar dari sesi ini?"
          confirmText="Ya, Logout"
          cancelText="Batal"
          onConfirm={handleLogout}
          onCancel={() => setIsLogoutModalOpen(false)}
          isConfirming={isLoggingOut}
        />
      )}
    </>
  );
};

export default Header;
