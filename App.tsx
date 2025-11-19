
import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation, Navigate, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FeedbackPage from './pages/FeedbackPage';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { CafeProvider } from './context/CafeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import NotificationPanel from './components/NotificationPanel';
import { SunIcon, MoonIcon, UserCircleIcon, ArrowRightOnRectangleIcon, BellIcon } from '@heroicons/react/24/solid';
import ScrollToTopOnNavigate from './components/ScrollToTopOnNavigate';
import ScrollToTopButton from './components/ScrollToTopButton';
import ConfirmationModal from './components/common/ConfirmationModal';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

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
  
  const activeLinkClass = "bg-brand text-white shadow-md shadow-brand/20";
  const inactiveLinkClass = "hover:bg-brand/10 dark:hover:bg-brand/20 text-muted hover:text-primary dark:hover:text-white";
  const linkClass = "px-4 py-2 rounded-xl font-bold transition-all duration-300 text-sm";

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
      <div className="container mx-auto px-4 pt-4 sticky top-4 z-50">
        <header className="bg-card/80 dark:bg-gray-800/80 backdrop-blur-md border border-border rounded-3xl p-3 sm:p-4 shadow-sm flex items-center justify-between">
          <nav className="w-full flex items-center justify-between relative">
            <Link to="/" className="flex items-center mr-6">
              <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-6 sm:h-10 w-auto" />
            </Link>
            
            <div className="hidden lg:flex items-center space-x-2 absolute left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600">
              <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Home</NavLink>
              <NavLink to="/explore" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
              <NavLink to="/about" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tentang Kami</NavLink>
            </div>

            <div className="flex items-center gap-3">
              {/* Right Controls Container */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-full p-1.5 border border-gray-200 dark:border-gray-600">
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
                        <Link to="/admin" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-primary dark:text-white hover:bg-white dark:hover:bg-gray-600 transition-all">
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
                        {/* Mobile Trigger - Always Icon */}
                        <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="sm:hidden flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white dark:hover:bg-gray-600 transition-all" aria-label="Buka menu pengguna">
                             <UserCircleIcon className="h-7 w-7 text-brand"/>
                        </button>
                    </>
                  ) : (
                     <Link to="/login" className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-brand hover:bg-white dark:hover:bg-gray-600 transition-all" aria-label="Login">
                        <span className="hidden sm:inline">Login</span>
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    </Link>
                  )}
              </div>
            </div>
            
             {isMobileMenuOpen && currentUser && (
                  <div ref={mobileMenuRef} className="absolute top-full right-0 mt-4 w-64 bg-card dark:bg-gray-800 rounded-3xl shadow-xl border border-border p-3 z-50 sm:hidden animate-fade-in-down">
                      <div className="flex items-center gap-3 px-4 py-4 border-b border-border mb-2 bg-soft dark:bg-gray-700/30 rounded-2xl">
                          {currentUser.avatar_url ? (
                              <img src={currentUser.avatar_url} alt="Profile" className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                              <UserCircleIcon className="h-12 w-12 text-brand" />
                          )}
                          <div className="overflow-hidden">
                              <p className="font-bold text-primary dark:text-white truncate">{currentUser.username}</p>
                              <p className="text-xs text-muted truncate">{currentUser.email}</p>
                          </div>
                      </div>
                      <div className="space-y-1">
                          <NavLink to="/" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'hover:bg-soft dark:hover:bg-gray-700'}`}>Home</NavLink>
                          <NavLink to="/explore" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'hover:bg-soft dark:hover:bg-gray-700'}`}>Explore</NavLink>
                           <NavLink to="/about" onClick={() => setIsMobileMenuOpen(false)} className={({ isActive }) => `block w-full text-left px-4 py-3 rounded-xl font-semibold transition-colors ${isActive ? 'bg-brand text-white' : 'hover:bg-soft dark:hover:bg-gray-700'}`}>Tentang Kami</NavLink>
                           <div className="border-t border-border my-2"></div>
                          <Link 
                              to="/admin" 
                              className="block w-full text-left px-4 py-3 rounded-xl hover:bg-soft dark:hover:bg-gray-700 font-semibold transition-colors text-primary dark:text-white" 
                              onClick={() => setIsMobileMenuOpen(false)}
                          >
                              Dashboard
                          </Link>
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    if (currentUser) {
        return <Navigate to="/" replace />;
    }
    return <>{children}</>;
};

const MainLayout: React.FC = () => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';
    const { currentUser, loading: authLoading } = useAuth();
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
      if (!authLoading) {
        const welcomeSeen = localStorage.getItem('nongkrongr_welcome_seen');
        if (!welcomeSeen && !currentUser) {
          setShowWelcome(true);
        }
      }
    }, [authLoading, currentUser]);

    const handleCloseWelcome = () => {
        localStorage.setItem('nongkrongr_welcome_seen', 'true');
        setShowWelcome(false);
    };

    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col transition-colors duration-300">
            {showWelcome && isHomePage && <WelcomeModal onClose={handleCloseWelcome} />}
            <Header />
            <main className="flex-grow pt-4">
                <Outlet />
            </main>
            
            <Footer />
            <ScrollToTopButton />
        </div>
    );
};

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      return storedTheme;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthProvider>
        <FavoriteProvider>
          <CafeProvider>
            <NotificationProvider>
                <ErrorBoundary>
                  <HashRouter>
                      <ScrollToTopOnNavigate />
                      <Routes>
                        <Route element={<MainLayout />}>
                            <Route path="/" element={<HomePage />} />
                            <Route path="/explore" element={<ExplorePage />} />
                            <Route path="/cafe/:slug" element={<DetailPage />} />
                            <Route path="/about" element={<AboutPage />} />
                            <Route path="/leaderboard" element={<LeaderboardPage />} />
                            <Route path="/feedback" element={<FeedbackPage />} />
                        </Route>
                        
                        <Route path="/login" element={
                            <GuestRoute>
                                <LoginPage />
                            </GuestRoute>
                        } />
                        
                        <Route path="/admin" element={
                            <ProtectedRoute>
                                <AdminPage />
                            </ProtectedRoute>
                        } />
                      </Routes>
                  </HashRouter>
                </ErrorBoundary>
            </NotificationProvider>
          </CafeProvider>
        </FavoriteProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;
