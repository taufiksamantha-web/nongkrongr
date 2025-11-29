
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { ViewState, UserRole, Cafe, User, Notification, HeroConfig } from './types';
import { Navigation } from './components/Navigation';
import { HomeView } from './views/HomeView';
import { MapView } from './views/MapView';
import { ExploreView } from './views/ExploreView';
import { CafeDetail } from './components/CafeDetail';
import { fetchCafes, getUserProfile, createCafe, updateCafe, deleteCafe, toggleFavoriteDB, signOutUser, createFallbackUser, fetchNotifications, createCafeSlug, getIdFromSlug } from './services/dataService';
import { AuthModal } from './components/AuthModal';
import { ScrollToTopButton, ToastContainer, ToastMessage, ErrorBoundary } from './components/UI';
import { supabase } from './lib/supabase';
import { ShieldAlert, Lock, LogOut, CheckCircle } from 'lucide-react';
import { SEO } from './components/SEO';
import { ThirdPartyIntegrations } from './components/ThirdPartyIntegrations';

// --- LAZY LOADED COMPONENTS ---
const AdminDashboard = React.lazy(() => import('./views/Dashboards').then(module => ({ default: module.AdminDashboard })));
const CafeManagerDashboard = React.lazy(() => import('./views/Dashboards').then(module => ({ default: module.CafeManagerDashboard })));
const UserDashboard = React.lazy(() => import('./views/Dashboards').then(module => ({ default: module.UserDashboard })));

const DashboardLoading = () => (
    <div className="w-full h-screen flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#020617]">
        <div className="w-16 h-16 border-4 border-gray-200 dark:border-slate-800 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-bold">Memuat Dashboard...</p>
    </div>
);

const AppLoading = () => (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-[#8243F0] rounded-xl animate-pulse mb-4 shadow-lg shadow-purple-500/30"></div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 font-display">Nongkrongr</h2>
        <p className="text-xs text-gray-500 mt-2">Menyiapkan Sesi...</p>
    </div>
);

// --- SPLASH SCREEN COMPONENT ---
const SplashScreen = ({ type }: { type: 'LOGIN' | 'LOGOUT' }) => (
    <div className="fixed inset-0 z-[99999] bg-[#8243F0] flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
        <div className="p-6 bg-white/10 rounded-full mb-6 animate-bounce">
            {type === 'LOGIN' ? <CheckCircle size={48} className="text-white" /> : <LogOut size={48} className="text-white" />}
        </div>
        <h2 className="text-3xl font-display font-bold mb-2">
            {type === 'LOGIN' ? 'Selamat Datang!' : 'Sampai Jumpa!'}
        </h2>
        <p className="text-white/80">
            {type === 'LOGIN' ? 'Menyiapkan notifikasi & data Anda...' : 'Membersihkan sesi Anda...'}
        </p>
    </div>
);

export default function App() {
  const [view, setView] = useState<ViewState>('HOME');
  const [splashState, setSplashState] = useState<'IDLE' | 'LOGIN' | 'LOGOUT'>('IDLE');
  
  // --- AUTH STATE (Optimistic) ---
  const [user, setUser] = useState<User | null>(null); 
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  
  // --- DATA STATE ---
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null); 
  
  // --- UI STATE ---
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [heroConfig, setHeroConfig] = useState<HeroConfig>({
    title: "Temukan Spot Nongkrong Paling Asik.",
    description: "Jelajahi ratusan kafe unik, workspace nyaman, dan hidden gems kopi lokal dengan panduan komunitas.",
    backgroundImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop"
  });

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
  }, []);
  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // ======================================================================
  // 1. DATA & CONFIG
  // ======================================================================
  useEffect(() => {
    fetchCafes().then(data => setCafes(data)).catch(() => {});

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => {}
        );
    }
  }, []);

  // ======================================================================
  // 2. AUTHENTICATION & DATA SYNC
  // ======================================================================
  
  const refreshUserNotifications = useCallback(async (userId: string) => {
      const notifs = await fetchNotifications(userId);
      setNotifications(notifs);
  }, []);

  const refreshUserProfile = useCallback(async (userId: string) => {
      try {
          const profile = await getUserProfile(userId);
          if (profile) {
              setUser(profile);
              refreshUserNotifications(userId);
          }
      } catch (error: any) {
          if (error.message === 'AUTH_INVALID') {
              await signOutUser();
              setUser(null);
              // Instead of resetting view blindly, check if we are on a public route
              if (window.location.hash.includes('dashboard')) {
                  navigate('HOME');
              }
              addToast('error', 'Sesi Anda telah berakhir.');
          }
      }
  }, [addToast, refreshUserNotifications]);

  useEffect(() => {
      const initAuth = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session && session.user) {
              setUser(createFallbackUser(session.user));
              refreshUserProfile(session.user.id);
          }
          
          setIsAuthInitialized(true);
      };

      initAuth();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              if (session?.user) {
                  setUser(prev => prev ? prev : createFallbackUser(session.user));
                  refreshUserProfile(session.user.id);
              }
          } else if (event === 'SIGNED_OUT') {
              setUser(null);
              setNotifications([]);
              if (window.location.hash.includes('dashboard')) {
                  navigate('HOME');
              }
          }
      });

      return () => subscription.unsubscribe();
  }, [refreshUserProfile]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        refreshUserProfile(user.id);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, refreshUserProfile]);


  // ======================================================================
  // 3. ROUTING & NAVIGATION (Hash Router)
  // ======================================================================
  // Switched to Hash Router to prevent 404 errors on refresh/back/forward

  const navigate = (targetView: ViewState, cafeId?: string) => {
      let hash = '';

      if (targetView === 'HOME') hash = '/';
      else if (targetView === 'MAP') hash = '/map';
      else if (targetView === 'EXPLORE') hash = '/explore';
      else if (targetView === 'DASHBOARD') {
          if (user?.role === UserRole.ADMIN) hash = '/admin';
          else if (user?.role === UserRole.CAFE_MANAGER) hash = '/owner';
          else hash = '/dashboard';
      }
      else if (targetView === 'DETAIL' && cafeId) {
          const cafe = cafes.find(c => c.id === cafeId);
          if (cafe) {
              hash = `/cafe/${createCafeSlug(cafe)}`;
          }
      }
      
      // Force update hash
      window.location.hash = hash;
  };

  // Handle Hash Change
  useEffect(() => {
      const handleHashChange = () => {
          const hash = window.location.hash.substring(1); // Remove #

          if (hash === '' || hash === '/') { setView('HOME'); }
          else if (hash === '/map') { setView('MAP'); }
          else if (hash === '/explore') { setView('EXPLORE'); }
          else if (hash.startsWith('/dashboard') || hash.startsWith('/admin') || hash.startsWith('/owner')) { setView('DASHBOARD'); }
          else if (hash.startsWith('/cafe/')) {
              const slug = hash.split('/cafe/')[1];
              const id = getIdFromSlug(slug);
              if (id) {
                  setSelectedCafeId(id);
                  setView('DETAIL');
              }
          }
      };

      window.addEventListener('hashchange', handleHashChange);
      
      // Initial Load Route Handling
      handleHashChange();

      return () => window.removeEventListener('hashchange', handleHashChange);
  }, [cafes]); 

  // --- ACTIONS WITH ANIMATION ---
  
  const handleLoginSuccess = async () => {
      setShowLoginModal(false);
      setSplashState('LOGIN');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
           await refreshUserNotifications(session.user.id);
           await refreshUserProfile(session.user.id);
      }

      setTimeout(() => {
          setSplashState('IDLE');
      }, 2000);
  };

  const handleLogout = async () => {
      setSplashState('LOGOUT');
      setTimeout(async () => {
          await signOutUser();
          setSplashState('IDLE');
          navigate('HOME');
      }, 2000);
  };

  const activeCafe = cafes.find(c => c.id === selectedCafeId) || null;

  const handleCafeClick = (cafe: Cafe) => {
    navigate('DETAIL', cafe.id);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleCafeUpdate = async (updatedCafe: Cafe) => {
      try {
        if (updatedCafe.id.startsWith('c') && updatedCafe.id.length < 20) {
             const { id, ...cafeData } = updatedCafe;
             await createCafe(cafeData, user?.id);
        } else {
             await updateCafe(updatedCafe.id, updatedCafe);
        }
        const data = await fetchCafes();
        setCafes(data);
        addToast('success', 'Data tersimpan!');
      } catch (error: any) {
          addToast('error', 'Gagal menyimpan data.');
      }
  };

  const handleDeleteCafe = async (cafeId: string) => {
      try {
          await deleteCafe(cafeId);
          if (selectedCafeId === cafeId) { navigate('HOME'); setSelectedCafeId(null); }
          const data = await fetchCafes();
          setCafes(data);
          addToast('success', 'Kafe dihapus.');
      } catch (error: any) {
           addToast('error', 'Gagal menghapus kafe.');
      }
  };

  const handleToggleFavorite = async (cafeId: string) => {
      if (!user) { setShowLoginModal(true); return; }
      const isSaved = user.savedCafeIds?.includes(cafeId) || false;
      const newUser = { ...user, savedCafeIds: isSaved ? user.savedCafeIds?.filter(id => id !== cafeId) : [...(user.savedCafeIds || []), cafeId] };
      setUser(newUser);
      try { await toggleFavoriteDB(user.id, cafeId, isSaved); } 
      catch (error) { setUser(user); addToast('error', 'Gagal update favorit'); } 
  };

  const renderView = () => {
      if (!isAuthInitialized) return <AppLoading />;

      if (user && user.status !== 'active') {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${user.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'}`}>
                    {user.status === 'pending' ? <Lock size={40} /> : <ShieldAlert size={40} />}
                </div>
                <h2 className="text-2xl font-bold mb-3 text-gray-800 dark:text-gray-100">
                    {user.status === 'pending' ? 'Menunggu Persetujuan' : 'Akun Ditolak'}
                </h2>
                <button onClick={handleLogout} className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-full font-bold shadow-lg">Keluar Akun</button>
            </div>
        );
      }

      if (view === 'DETAIL' && activeCafe) {
        return <CafeDetail cafe={activeCafe} allCafes={cafes} userLocation={userLocation} onBack={() => window.history.back()} isSaved={user?.savedCafeIds?.includes(activeCafe.id) || false} onToggleFavorite={() => handleToggleFavorite(activeCafe.id)} user={user} onLoginReq={() => setShowLoginModal(true)} onCafeClick={handleCafeClick} />;
      }
      
      if (view === 'EXPLORE') return <ExploreView cafes={cafes} onCafeClick={handleCafeClick} />;
      
      if (view === 'DASHBOARD') {
        if (!user) { navigate('HOME'); return null; }
        
        const props = { user, onLogout: handleLogout, onHome: () => navigate('HOME'), cafes, onCafeUpdate: handleCafeUpdate, onCafeDelete: handleDeleteCafe, onCafeSelect: handleCafeClick };
        return (
            <Suspense fallback={<DashboardLoading />}>
                <ErrorBoundary>
                    <SEO title="Dashboard User" description="Kelola profil dan aktivitas Nongkrongr Anda." />
                    {user.role === UserRole.ADMIN ? <AdminDashboard {...props} heroConfig={heroConfig} onUpdateHeroConfig={setHeroConfig} /> :
                     user.role === UserRole.CAFE_MANAGER ? <CafeManagerDashboard {...props} /> : <UserDashboard {...props} />}
                </ErrorBoundary>
            </Suspense>
        );
      }
      
      if (view === 'MAP') {
          return null; // Handled outside to keep state
      }

      return (
        <>
            <SEO title="Home" />
            <HomeView cafes={cafes} onCafeClick={handleCafeClick} onGoToMap={() => navigate('MAP')} onReviewClick={(id) => { const c = cafes.find(x => x.id === id); if(c) handleCafeClick(c); }} heroConfig={heroConfig} userLocation={userLocation} />
        </>
      );
  };

  return (
    <div className={`font-sans text-gray-800 dark:text-gray-100 min-h-screen relative transition-colors duration-300 overflow-x-hidden`}>
      <ThirdPartyIntegrations />
      {splashState !== 'IDLE' && <SplashScreen type={splashState === 'LOGIN' ? 'LOGIN' : 'LOGOUT'} />}

      {view !== 'DASHBOARD' && (
          <Navigation 
            currentView={view} 
            setView={(v) => navigate(v)} 
            userRole={user?.role || UserRole.GUEST}
            isLoggedIn={!!user}
            onLoginClick={() => setShowLoginModal(true)}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            user={user}
            onLogout={handleLogout}
            notifications={notifications}
            onNotificationClick={(n) => {
                // Logic handled inside nav or here if needed
            }}
          />
      )}
      
      <main className="min-h-screen w-full">
        {/* MAP VIEW KEPT IN DOM FOR PERFORMANCE */}
        <div style={{ display: view === 'MAP' ? 'block' : 'none', height: '100vh', width: '100%' }}>
             <SEO title="Peta Kafe" description="Jelajahi lokasi kafe di peta interaktif." />
             <MapView cafes={cafes} onCafeClick={handleCafeClick} isVisible={view === 'MAP'} />
        </div>
        
        {view !== 'MAP' && (
            <div key={view} className="page-enter">
                <ErrorBoundary>
                    {renderView()} 
                </ErrorBoundary>
            </div>
        )}
      </main>

      {showLoginModal && <AuthModal onClose={() => setShowLoginModal(false)} onSuccess={handleLoginSuccess} />}
      <ScrollToTopButton />
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
