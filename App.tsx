
import React, { useState, useEffect, createContext, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Header from './components/Header';
// WelcomeModal sekarang di-lazy load karena tidak selalu dibutuhkan
const WelcomeModal = lazy(() => import('./components/WelcomeModal'));
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTopOnNavigate from './components/ScrollToTopOnNavigate';
import ScrollToTopButton from './components/ScrollToTopButton';
import InstallPrompt from './components/InstallPrompt'; // Import Install Prompt

// Contexts
import { CafeProvider } from './context/CafeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { NotificationProvider } from './context/NotificationContext';

// Icons for Overlay
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';

// Lazy Loaded Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-soft">
      <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// --- Logout Animation Component ---
const LogoutOverlay: React.FC = () => {
    const { isLoggingOut } = useAuth();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isLoggingOut) setIsVisible(true);
        else setTimeout(() => setIsVisible(false), 500); // Fade out delay
    }, [isLoggingOut]);

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[9999] bg-soft flex flex-col items-center justify-center transition-opacity duration-500 ${isLoggingOut ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="relative p-8 text-center">
                <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <ArrowRightOnRectangleIcon className="h-10 w-10 text-brand" />
                </div>
                <h2 className="text-2xl font-bold font-jakarta text-primary dark:text-white mb-2">Sampai Jumpa!</h2>
                <p className="text-muted mb-6">Sedang membersihkan sesi Anda...</p>
                <div className="w-48 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mx-auto">
                    <div className="h-full bg-brand animate-[width_1.5s_ease-in-out_infinite] rounded-full w-1/2 mx-auto"></div>
                </div>
            </div>
        </div>
    );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, isLoggingOut } = useAuth();
    
    // If we are currently logging out, do NOT redirect to login.
    // Just return null or a loader while the LogoutOverlay handles the visual transition
    // and the logout function handles the redirection to Home.
    if (isLoggingOut) return null;

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
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col transition-colors duration-300 w-full">
            <InstallPrompt /> {/* Add PWA Install Prompt here */}
            <LogoutOverlay /> {/* Global Logout Animation */}
            
            {showWelcome && isHomePage && (
                <Suspense fallback={null}>
                    <WelcomeModal onClose={handleCloseWelcome} />
                </Suspense>
            )}
            <Header />
            <main className="flex-grow pt-4 w-full">
                <Suspense fallback={<LoadingFallback />}>
                    <Outlet />
                </Suspense>
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
    return 'light';
  });
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0c0c0d';
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '#fbfaff';
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
                            <Suspense fallback={<LoadingFallback />}>
                                <GuestRoute>
                                    <LoginPage />
                                </GuestRoute>
                            </Suspense>
                        } />

                        <Route path="/reset-password" element={
                            <Suspense fallback={<LoadingFallback />}>
                                <ResetPasswordPage />
                            </Suspense>
                        } />
                        
                        {/* Role-based routes mapping to AdminPage */}
                        <Route path="/dashboard-admin" element={
                            <Suspense fallback={<LoadingFallback />}>
                                <ProtectedRoute>
                                    <AdminPage />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                         <Route path="/dashboard-pengelola" element={
                            <Suspense fallback={<LoadingFallback />}>
                                <ProtectedRoute>
                                    <AdminPage />
                                </ProtectedRoute>
                            </Suspense>
                        } />
                         <Route path="/dashboard-profile" element={
                            <Suspense fallback={<LoadingFallback />}>
                                <ProtectedRoute>
                                    <AdminPage />
                                </ProtectedRoute>
                            </Suspense>
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
