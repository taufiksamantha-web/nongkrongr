
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
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
        <p className="mt-6 text-muted font-semibold">Mempersiapkan Aplikasi...</p>
    </div>
);


const AppContent: React.FC<{ showWelcome: boolean; onCloseWelcome: () => void; }> = ({ showWelcome, onCloseWelcome }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, loading: authLoading } = useAuth();
    const [isNavigating, setIsNavigating] = useState(true);
    
    const isAdminPage = location.pathname.startsWith('/admin');
    const isHomePage = location.pathname === '/';

    useEffect(() => {
        // Jangan lakukan apa-apa sampai pengecekan otentikasi awal selesai.
        if (authLoading) {
            return;
        }

        let didNavigate = false;

        // Logika redirect:
        // 1. Jika user sudah login dan berada di halaman publik, paksa ke dashboard.
        if (currentUser && !isAdminPage) {
            navigate('/admin', { replace: true });
            didNavigate = true;
        } 
        // 2. Jika user tidak login (misal sesi expired) tapi masih di URL admin, paksa ke home.
        else if (!currentUser && isAdminPage) {
            navigate('/', { replace: true });
            didNavigate = true;
        }

        // Jika tidak ada navigasi yang terjadi, kita siap untuk merender.
        if (!didNavigate) {
            setIsNavigating(false);
        }

    }, [currentUser, isAdminPage, authLoading, navigate]);

    // Tampilkan loader selama pengecekan otentikasi awal ATAU selama logika navigasi internal kita berjalan.
    // Ini adalah 'gerbang' yang mencegah race condition.
    if (authLoading || isNavigating) {
        return <FullScreenLoader />;
    }


    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col">
          {showWelcome && isHomePage && <WelcomeModal onClose={onCloseWelcome} />}
          
          {!isAdminPage && <Header />}
          
          <main className="flex-grow">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/cafe/:slug" element={<DetailPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>

          {!isAdminPage && (
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
                <Link 
                    to="/explore"
                    className="flex items-center gap-3 bg-brand hover:bg-brand/90 text-white font-bold py-4 px-8 rounded-full shadow-lg hover:shadow-brand/30 transition-all duration-300 transform hover:scale-105 active:scale-95 animate-subtle-bounce"
                >
                    <MagnifyingGlassIcon className="h-6 w-6" />
                    <span>Jelajahi</span>
                </Link>
            </div>
          )}

          {!isAdminPage && <Footer />}
          {!isAdminPage && <ScrollToTopButton />}
        </div>
    );
};

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('nongkrongr_welcome_seen'));
  const [theme, setTheme] = useState<Theme>('dark');

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
                  <AppContent showWelcome={showWelcome} onCloseWelcome={handleCloseWelcome} />
              </HashRouter>
            </ErrorBoundary>
          </CafeProvider>
        </FavoriteProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;
