

import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation, Navigate, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { CafeProvider } from './context/CafeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { SunIcon, MoonIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import ScrollToTopOnNavigate from './components/ScrollToTopOnNavigate';
import ScrollToTopButton from './components/ScrollToTopButton';

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
  const activeLinkClass = "bg-brand text-white";
  const inactiveLinkClass = "hover:bg-brand/10 dark:hover:bg-brand/20";
  const linkClass = "px-4 py-2 rounded-2xl font-bold transition-all duration-300";

  return (
    <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-50 border-b border-border">
      <nav className="container mx-auto px-4 py-2 flex items-center justify-between relative">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center py-2">
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-10 w-auto" />
        </Link>
        
        {/* Center (Desktop): Nav Links */}
        <div className="hidden lg:flex items-center space-x-4 absolute left-1/2 -translate-x-1/2">
          <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Home</NavLink>
          <NavLink to="/explore" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
          <NavLink to="/about" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tentang Kami</NavLink>
        </div>

        {/* Right: Theme Toggle */}
        <div className="flex items-center">
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
          </button>
        </div>
      </nav>
    </header>
  );
};

const FullScreenLoader: React.FC = () => (
    <div className="fixed inset-0 bg-soft flex flex-col items-center justify-center z-[2000]">
        <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-16 w-auto mb-6" />
        <div className="w-12 h-12 border-4 border-dashed rounded-full animate-spin border-brand"></div>
        <p className="mt-6 text-muted font-semibold">Memeriksa Sesi...</p>
    </div>
);

// NEW: Protected Route Guard Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) {
        return <FullScreenLoader />;
    }
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

// NEW: Guest Route Guard Component (for login page)
const GuestRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) {
        return <FullScreenLoader />;
    }
    if (currentUser) {
        return <Navigate to="/admin" replace />;
    }
    return <>{children}</>;
};

// NEW: Main Layout for all Public Pages
const MainLayout: React.FC<{ showWelcome: boolean; onCloseWelcome: () => void; }> = ({ showWelcome, onCloseWelcome }) => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col">
            {showWelcome && isHomePage && <WelcomeModal onClose={onCloseWelcome} />}
            <Header />
            <main className="flex-grow">
                <Outlet /> {/* Renders the matched child route component (HomePage, ExplorePage, etc.) */}
            </main>
            
            {/* Mobile Explore Button */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <Link 
                    to="/explore"
                    className="flex items-center gap-3 bg-brand hover:bg-brand/90 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-brand/30 transition-all duration-300 transform hover:scale-105 active:scale-95 animate-subtle-bounce"
                >
                    <MagnifyingGlassIcon className="h-6 w-6" />
                    <span>Jelajahi</span>
                </Link>
            </div>

            <Footer />
            <ScrollToTopButton />
        </div>
    );
};

const APP_VERSION = '1.3.0'; // Version for cache-busting logic

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('nongkrongr_welcome_seen'));
  const [theme, setTheme] = useState<Theme>('dark');
  
  useEffect(() => {
    const storedVersion = localStorage.getItem('nongkrongr_app_version');
    if (storedVersion !== APP_VERSION) {
      console.warn(
        `App version mismatch. Old: ${storedVersion}, New: ${APP_VERSION}. ` +
        `Clearing session data and forcing a refresh.`
      );

      // Preserve user favorites and welcome message status across updates
      const favorites = localStorage.getItem('nongkrongr_favorites');
      const welcomeSeen = localStorage.getItem('nongkrongr_welcome_seen');

      // Clear everything else
      localStorage.clear();
      sessionStorage.clear();

      // Restore preserved items
      if (favorites) {
        localStorage.setItem('nongkrongr_favorites', favorites);
      }
      if (welcomeSeen) {
        localStorage.setItem('nongkrongr_welcome_seen', welcomeSeen);
      }

      // Set the new version and reload
      localStorage.setItem('nongkrongr_app_version', APP_VERSION);
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme('dark');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleCloseWelcome = () => {
    localStorage.setItem('nongkrongr_welcome_seen', 'true');
    setShowWelcome(false);
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthProvider>
        <FavoriteProvider>
          <CafeProvider>
            <ErrorBoundary>
              <HashRouter>
                  <ScrollToTopOnNavigate />
                  <Routes>
                    {/* Public pages are wrapped in the MainLayout */}
                    <Route element={<MainLayout showWelcome={showWelcome} onCloseWelcome={handleCloseWelcome} />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/cafe/:slug" element={<DetailPage />} />
                        <Route path="/about" element={<AboutPage />} />
                    </Route>
                    
                    {/* A guest-only route for the login page */}
                    <Route path="/login" element={
                        <GuestRoute>
                            <LoginPage />
                        </GuestRoute>
                    } />
                    
                    {/* A protected route for the admin/user dashboard */}
                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <AdminPage />
                        </ProtectedRoute>
                    } />
                  </Routes>
              </HashRouter>
            </ErrorBoundary>
          </CafeProvider>
        </FavoriteProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;
