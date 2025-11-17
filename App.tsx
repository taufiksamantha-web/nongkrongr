import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, NavLink, useLocation, Navigate, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import LeaderboardPage from './pages/LeaderboardPage';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { CafeProvider } from './context/CafeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { SunIcon, MoonIcon, MagnifyingGlassIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
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
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const activeLinkClass = "bg-brand text-white";
  const inactiveLinkClass = "hover:bg-brand/10 dark:hover:bg-brand/20";
  const linkClass = "px-4 py-2 rounded-2xl font-bold transition-all duration-300";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await logout();
    if (error) {
        console.error("Logout failed:", error.message);
        // Notify user about the failure and reset the UI state
        alert(`Gagal untuk logout: ${error.message}`);
        setIsLogoutModalOpen(false);
        setIsLoggingOut(false);
    }
    // On successful logout, the onAuthStateChange listener in AuthContext
    // will update the state, causing a re-render where this component
    // shows the "Login" button, so we don't need to manually reset state here.
  };

  return (
    <>
      <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-50 border-b border-border">
        <nav className="container mx-auto px-4 py-2 flex items-center justify-between relative">
          <Link to="/" className="flex items-center py-2">
            <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-10 w-auto" />
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
                  <Link to="/admin" className="hidden sm:flex items-center gap-2 font-semibold text-primary dark:text-white p-2 rounded-xl hover:bg-soft dark:hover:bg-gray-700 transition-colors">
                      <UserCircleIcon className="h-6 w-6 text-brand" />
                      <span>{currentUser.username}</span>
                  </Link>
                  <button onClick={() => setIsLogoutModalOpen(true)} className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Logout">
                      <ArrowRightOnRectangleIcon className="h-6 w-6" />
                  </button>
              </div>
            ) : (
               <Link to="/login" className="bg-brand text-white font-bold py-2 px-5 rounded-xl hover:bg-brand/90 transition-all">
                  Login
              </Link>
            )}
          </div>
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
        return <Navigate to="/admin" replace />;
    }
    return <>{children}</>;
};

const MainLayout: React.FC<{ showWelcome: boolean; onCloseWelcome: () => void; }> = ({ showWelcome, onCloseWelcome }) => {
    const location = useLocation();
    const isHomePage = location.pathname === '/';

    return (
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col">
            {showWelcome && isHomePage && <WelcomeModal onClose={onCloseWelcome} />}
            <Header />
            <main className="flex-grow">
                <Outlet />
            </main>
            
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
                  <Routes>
                    <Route element={<MainLayout showWelcome={showWelcome} onCloseWelcome={handleCloseWelcome} />}>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/explore" element={<ExplorePage />} />
                        <Route path="/cafe/:slug" element={<DetailPage />} />
                        <Route path="/about" element={<AboutPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
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
          </CafeProvider>
        </FavoriteProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;