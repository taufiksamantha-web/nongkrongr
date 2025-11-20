
import React, { useState, useEffect, createContext, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Components
import Header from './components/Header';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTopOnNavigate from './components/ScrollToTopOnNavigate';
import ScrollToTopButton from './components/ScrollToTopButton';

// Contexts
import { CafeProvider } from './context/CafeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FavoriteProvider } from './context/FavoriteContext';
import { NotificationProvider } from './context/NotificationContext';

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
        <div className="bg-soft min-h-screen font-sans text-primary dark:text-gray-200 flex flex-col transition-colors duration-300 w-full">
            {showWelcome && isHomePage && <WelcomeModal onClose={handleCloseWelcome} />}
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
