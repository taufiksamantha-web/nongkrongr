
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { CafeProvider } from './context/CafeContext';
import { AuthProvider } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
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
          {/* Full logo for medium screens and up */}
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-10 w-auto hidden md:block" />
          {/* Icon logo for small screens */}
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png" alt="Nongkrongr Icon" className="h-10 w-10 block md:hidden" />
        </Link>
        
        {/* Center (Desktop): Nav Links */}
        <div className="hidden md:flex items-center space-x-4 absolute left-1/2 -translate-x-1/2">
          <NavLink to="/" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Home</NavLink>
          <NavLink to="/explore" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
          <NavLink to="/about" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Tentang Kami</NavLink>
        </div>

        {/* Right: Mobile Explore + Theme Toggle */}
        <div className="flex items-center space-x-2">
          <NavLink to="/explore" className={({ isActive }) => `md:hidden ${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
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

const AdminHeader: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-50 border-b border-border">
      <nav className="container mx-auto px-4 py-2 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center py-2">
          {/* Full logo for medium screens and up */}
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-10 w-auto hidden md:block" />
          {/* Icon logo for small screens */}
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png" alt="Nongkrongr Icon" className="h-10 w-10 block md:hidden" />
        </Link>
        
        {/* Right: Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
        </button>
      </nav>
    </header>
  );
};

const AppContent: React.FC<{ showWelcome: boolean; onCloseWelcome: () => void; }> = ({ showWelcome, onCloseWelcome }) => {
    const location = useLocation();
    const isAdminPage = location.pathname.startsWith('/admin');

    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col">
          {showWelcome && <WelcomeModal onClose={onCloseWelcome} />}
          
          {isAdminPage ? <AdminHeader /> : <Header />}
          
          <main className="flex-grow">
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/cafe/:slug" element={<DetailPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/about" element={<AboutPage />} />
            </Routes>
          </main>

          {!isAdminPage && <Footer />}
        </div>
    );
};

const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme('light');
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
                  <AppContent showWelcome={showWelcome} onCloseWelcome={() => setShowWelcome(false)} />
              </HashRouter>
            </ErrorBoundary>
          </CafeProvider>
        </FavoriteProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;
