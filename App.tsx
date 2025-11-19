
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
  
  const activeLinkClass = "bg-brand text-white";
  const inactiveLinkClass = "hover:bg-brand/10 dark:hover:bg-brand/20";
  const linkClass = "px-4 py-2 rounded-2xl font-bold transition-all duration-300";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await logout();
    // Selalu tutup modal dan reset status loading setelah percobaan logout.
    setIsLogoutModalOpen(false);
    setIsLoggingOut(false);

    if (error) {
        console.error("Logout failed:", error.message);
        alert(`Gagal untuk logout: ${error.message}`);
    }
    // Jika berhasil, UI akan diperbarui melalui AuthContext, dan modal sudah ditutup.
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
      <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-50 border-b border-border">
        <nav className="container mx-auto px-4 py-2 flex items-center justify-between relative">
          <Link to="/" className="flex items-center py-2">
            <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-8 w-auto" />
          </Link>
          
          <div className="hidden lg:flex items-center space-x-4 absolute left-1/2 -translate-x-1/2">
            <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Home</NavLink>
            <NavLink to="/explore" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
            <NavLink to="/about" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tentang Kami</NavLink>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
            </button>
            
            {currentUser ? (
              <div className="flex items-center gap-2">
                   {/* Notification Icon - Only for logged in users */}
                   <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 relative"
                            aria-label="Notifikasi"
                        >
                            <BellIcon className="h-6 w-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-card"></span>
                            )}
                        </button>
                        <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
                    </div>

                  <Link to="/admin" className="hidden sm:flex items-center gap-2 font-semibold text-primary dark:text-white p-2 rounded-xl hover:bg-soft dark:hover:bg-gray-700 transition-colors">
                      {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                          <UserCircleIcon className="h-6 w-6 text-brand" />
                      )}
                      <span>{currentUser.username}</span>
                  </Link>
                  <button onClick={() => setIsLogoutModalOpen(true)} className="hidden sm:flex p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Logout">
                      <ArrowRightOnRectangleIcon className="h-6 w-6" />
                  </button>
                  <button onClick={() => setIsMobileMenuOpen(prev => !prev)} className="sm:hidden p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" aria-label="Buka menu pengguna">
                      {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Profile" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                          <UserCircleIcon className="h-6 w-6 text-brand"/>
                      )}
                  </button>
              </div>
            ) : (
               <Link to="/login" className="p-2 rounded-full text-brand border-2 border-brand/50 hover:bg-brand hover:text-white transition-all" aria-label="Login">
                  <ArrowRightOnRectangleIcon className="h-6 w-6" />
              </Link>
            )}
          </div>
          
           {isMobileMenuOpen && currentUser && (
                <div ref={mobileMenuRef} className="absolute top-full right-4 mt-2 w-56 bg-card rounded-2xl shadow-lg border border-border p-2 z-50 sm:hidden animate-fade-in-down">
                    <div className="flex items-center gap-3 px-3 py-2 border-b border-border mb-1">
                        {currentUser.avatar_url ? (
                            <img src={currentUser.avatar_url} alt="Profile" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                            <UserCircleIcon className="h-10 w-10 text-brand" />
                        )}
                        <div>
                            <p className="font-bold text-primary truncate" title={currentUser.username}>{currentUser.username}</p>
                            <p className="text-sm text-muted truncate" title={currentUser.email}>{currentUser.email}</p>
                        </div>
                    </div>
                    <Link 
                        to="/admin" 
                        className="block w-full text-left px-3 py-2 rounded-lg hover:bg-soft dark:hover:bg-gray-700/50 font-semibold transition-colors" 
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Dashboard
                    </Link>
                    <button 
                        onClick={() => { setIsMobileMenuOpen(false); setIsLogoutModalOpen(true); }} 
                        className="block w-full text-left px-3 py-2 rounded-lg text-accent-pink hover:bg-soft dark:hover:bg-gray-700/50 font-semibold transition-colors"
                    >
                        Logout
                    </button>
                </div>
           )}
        </nav>
      </header>

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
      // Hanya jalankan pengecekan ini sekali setelah status otentikasi diketahui
      if (!authLoading) {
        const welcomeSeen = localStorage.getItem('nongkrongr_welcome_seen');
        // Tampilkan jika belum pernah dilihat DAN pengguna tidak login
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
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col">
            {showWelcome && isHomePage && <WelcomeModal onClose={handleCloseWelcome} />}
            <Header />
            <main className="flex-grow">
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
