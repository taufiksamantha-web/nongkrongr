
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { ThemeContext } from '../App';
import NotificationPanel from './NotificationPanel';
import ConfirmationModal from './common/ConfirmationModal';
import { SunIcon, MoonIcon, UserCircleIcon, ArrowRightOnRectangleIcon, BellIcon } from '@heroicons/react/24/solid';

const getDashboardPath = (role?: string) => {
    switch (role) {
        case 'admin': return '/dashboard-admin';
        case 'admin_cafe': return '/dashboard-pengelola';
        default: return '/dashboard-profile';
    }
};

const getDashboardLabel = (role?: string) => {
    if (role === 'admin') return 'Dashboard Admin';
    if (role === 'admin_cafe') return 'Dashboard Pengelola Cafe';
    return 'Dashboard Profile';
};

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

const Header: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { currentUser, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await logout();
    setIsLogoutModalOpen(false);
    setIsLoggingOut(false);

    if (error) {
        console.error("Logout failed:", error.message);
        alert(`Gagal untuk logout: ${error.message}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [mobileMenuRef, notifRef]);

  return (
    <>
      <div className="container mx-auto px-4 pt-4 sticky top-4 z-50 w-full max-w-screen-2xl">
        <header className="bg-card/80 dark:bg-gray-800/80 backdrop-blur-md border border-border rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between transition-all duration-300">
          <nav className="w-full flex items-center justify-between relative">
            <Link to="/" className="flex items-center mr-6">
              <img 
                src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" 
                alt="Nongkrongr Logo" 
                className="h-12 w-auto block sm:hidden object-contain" 
              />
              <img 
                src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" 
                alt="Nongkrongr Logo" 
                className="h-10 w-auto hidden sm:block transition-all" 
              />
            </Link>
            
            <div className="absolute left-1/2 -translate-x-1/2">
                <NavPill />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center bg-brand/5 dark:bg-gray-700/50 rounded-full p-1.5 border border-brand/10 dark:border-gray-600">
                  <button 
                    onClick={toggleTheme} 
                    className="p-2 rounded-full text-muted hover:text-yellow-500 hover:bg-white dark:hover:bg-gray-600 transition-all"
                    aria-label="Toggle theme"
                  >
                    {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                  </button>

                  {currentUser && (
                     <>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                        <div className="relative" ref={notifRef}>
                              <button
                                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                                  className="p-2 rounded-full text-muted hover:text-brand hover:bg-white dark:hover:bg-gray-600 transition-all relative"
                                  aria-label="Notifikasi"
                              >
                                  <BellIcon className="h-5 w-5" />
                                  {unreadCount > 0 && (
                                      <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border border-card"></span>
                                  )}
                              </button>
                              <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
                          </div>
                     </>
                  )}
                  
                  <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                  
                  {currentUser ? (
                    <>
                        <Link to={getDashboardPath(currentUser.role)} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-primary dark:text-white hover:bg-white dark:hover:bg-gray-600 transition-all">
                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" className="h-6 w-6 rounded-full object-cover border border-brand/20" />
                            ) : (
                                <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold text-xs">
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="max-w-[80px] truncate">{currentUser.username}</span>
                        </Link>
                        <button onClick={() => setIsLogoutModalOpen(true)} className="hidden sm:flex p-2 rounded-full text-muted hover:text-red-500 hover:bg-white dark:hover:bg-gray-600 transition-all" title="Logout">
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="sm:hidden flex items-center gap-1 px-3 py-2 rounded-full bg-brand text-white hover:bg-brand/90 transition-all shadow-lg shadow-brand/20" aria-label="Buka menu pengguna">
                             <UserCircleIcon className="h-6 w-6 text-white"/>
                        </button>
                    </>
                  ) : (
                     <Link to="/login" className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold bg-brand text-white hover:bg-brand/90 transition-all shadow-md shadow-brand/20" aria-label="Login">
                        <span className="hidden sm:inline">Login</span>
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </Link>
                  )}
              </div>
            </div>
            
             {isMobileMenuOpen && currentUser && (
                  <div ref={mobileMenuRef} className="absolute top-full right-0 mt-4 w-64 bg-card dark:bg-gray-800 rounded-3xl shadow-xl border border-border p-3 z-50 sm:hidden animate-fade-in-down">
                      <Link to={getDashboardPath(currentUser.role)} onClick={() => setIsMobileMenuOpen(false)} className="block">
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-border mb-2 bg-soft dark:bg-gray-700/30 rounded-2xl hover:bg-brand/5 transition-colors group cursor-pointer">
                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                            ) : (
                                <UserCircleIcon className="h-12 w-12 text-brand" />
                            )}
                            <div className="overflow-hidden">
                                <p className="font-bold text-primary dark:text-white truncate group-hover:text-brand transition-colors">{currentUser.username}</p>
                                <p className="text-xs text-muted truncate font-semibold text-brand">{getDashboardLabel(currentUser.role)}</p>
                            </div>
                        </div>
                      </Link>
                      <div className="space-y-1">
                          <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'text-primary dark:text-white hover:bg-soft dark:hover:bg-gray-700'}`}>Home</NavLink>
                          <NavLink to="/explore" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'text-primary dark:text-white hover:bg-soft dark:hover:bg-gray-700'}`}>Explore</NavLink>
                           <NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'text-primary dark:text-white hover:bg-soft dark:hover:bg-gray-700'}`}>Tentang Kami</NavLink>
                           <div className="border-t border-border my-2"></div>
                          <button 
                              onClick={() => { setIsMobileMenuOpen(false); setIsLogoutModalOpen(true); }} 
                              className="block w-full text-left px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold transition-colors"
                          >
                              Logout
                          </button>
                      </div>
                  </div>
             )}
          </nav>
        </header>
      </div>

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
