
// @ts-nocheck
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import React from 'react';
import { Loader2, MapPin, Search as SearchIcon, MapPinned, AlertCircle, RefreshCw, Zap, Sparkles } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Cafe, HeroConfig, CollectionItem, AppNotification } from './types';
import { SessionProvider, useSession } from './components/SessionContext';
import { SafeStorage, supabase } from './lib/supabase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { MobileTopHeader } from './components/MobileTopHeader';
import { MobileSearchOverlay } from './components/MobileSearchOverlay';
import { ToastContainer, ToastMessage, Button } from './components/UI';
import { AuthModal } from './components/AuthModal';
import { OnboardingModal } from './components/OnboardingModal';
import { CafeDetail } from './components/CafeDetail';
import { calculateDistance, DEFAULT_COLLECTIONS, APP_VERSION } from './constants'; 
import { 
    fetchCafesPaginated, reverseGeocode, updateUserProfile, fetchCollectionsFromDB, fetchHeroConfig,
    signOutUser, createCafeSlug, fetchCafeBySlug,
    toggleFavoriteDB, updateUserLocationDB, debounce, fetchDashboardStats
} from './services/dataService';
import { UpdaterService } from './services/updaterService';

import { HomeView } from './views/HomeView';
import { ExploreView } from './views/ExploreView';
import { MapView } from './views/MapView';
import { PromoView } from './views/PromoView';
import { CommunityView } from './views/CommunityView';
import { UserDashboard } from './views/UserDashboard';
import { CollectionView } from './views/CollectionView';
import { SupportChatView } from './views/SupportChatView'; 
import { NotificationDrawer } from './components/NotificationDrawer';
import { GlobalCartOverlay } from './components/GlobalCartOverlay';
import { ShoppingCart } from 'lucide-react';

const AppContent = () => {
    const { 
        user, setUser, isDarkMode, toggleDarkMode, notifications, setNotifications, isSessionLoading,
        markNotificationRead, markAllNotificationsRead, deleteNotification, clearAllNotifications,
        updateLocalUser, cart
    } = useSession();
    
    const [view, setView] = useState<string>('HOME');
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [dashboardStats, setDashboardStats] = useState({ promoCount: 0, openCount: 0 });
    const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalView, setAuthModalView] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'UPDATE_PASSWORD'>('LOGIN');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    
    const [activeLocation, setActiveLocation] = useState<{ lat: number, lng: number } | null>(null); 
    const [gpsLocation, setGpsLocation] = useState<{ lat: number, lng: number } | null>(null); 
    
    const [selectedCityName, setSelectedCityName] = useState<string>('Mencari Lokasi...');
    const [isInitialLocating, setIsInitialLocating] = useState(true);
    const [locatingError, setLocatingError] = useState<boolean>(false);
    
    const [isNavVisible, setIsNavVisible] = useState(true); 

    const [heroConfig, setHeroConfig] = useState<HeroConfig>({
        title: "Temukan Tempat Nongkrong Qsik",
        description: "Jelajahi kafe unik dan nyaman di sekitarmu.",
        backgroundImage: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop"
    });
    
    const [collections, setCollections] = useState<CollectionItem[]>(DEFAULT_COLLECTIONS);
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [exploreFilter, setExploreFilter] = useState<string | null>(null); 
    const [communityTab, setCommunityTab] = useState<'feed' | 'nearby'>('feed');
    const [currentTitle, setCurrentTitle] = useState<string | null>(null);

    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState('');
    const [globalSearchResults, setGlobalSearchResults] = useState<Cafe[]>([]);
    const [isGlobalSearching, setIsGlobalSearching] = useState(false);
    const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
    
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const addToast = (type: 'success' | 'error' | 'info', message: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    const isAIStudio = useMemo(() => {
        try {
            return window.self !== window.top || window.location.hostname.includes('aistudio.google.com');
        } catch (e) { return true; }
    }, []);

    // --- SMART BACK BUTTON LOGIC (PWA + NATIVE) ---
    const handleGlobalBack = useCallback(() => {
        // 1. Prioritaskan menutup overlay/modal yang sedang aktif
        if (isSearchOpen) { setIsSearchOpen(false); return; }
        if (isCartOpen) { setIsCartOpen(false); return; }
        if (showAuthModal) { setShowAuthModal(false); return; }
        if (isNotifDrawerOpen) { setIsNotifDrawerOpen(false); return; }

        // 2. Jika ada history di browser (PWA/Browser), gunakan history back
        if (window.history.state && window.history.state.view) {
            window.history.back();
            return;
        }
        
        // 3. Jika stack habis tapi masih di view bukan HOME, paksa ke HOME
        if (view !== 'HOME') {
            navigateTo('HOME');
        } else {
            // 4. Jika sudah di HOME, hanya keluar aplikasi kalau ini versi Native (Capacitor)
            if (Capacitor.isNativePlatform()) {
                CapacitorApp.exitApp();
            }
        }
    }, [view, isSearchOpen, isCartOpen, showAuthModal, isNotifDrawerOpen]);

    // Listener khusus untuk tombol hardware back di HP (Android)
    useEffect(() => {
        const backHandler = CapacitorApp.addListener('backButton', () => {
            handleGlobalBack();
        });
        return () => { backHandler.then(h => h.remove()); };
    }, [handleGlobalBack]);

    // Listener untuk Browser History (Tombol Back Browser / Gesture Swipe)
    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const state = event.state;
            if (state && state.view) {
                // Update view tanpa pushState lagi (karena kita sudah di-pop)
                setView(state.view);
                setSelectedCafe(state.selectedCafe || null);
                setSelectedCollectionId(state.selectedCollectionId || null);
                setExploreFilter(state.exploreFilter || null);
                setCurrentTitle(state.currentTitle || null);
            } else if (view !== 'HOME') {
                // Fallback jika state kosong tapi bukan di home
                setView('HOME');
                setSelectedCafe(null);
                setSelectedCollectionId(null);
                setExploreFilter(null);
                setCurrentTitle(null);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [view]);

    // --- REFINED NAVIGATION WITH HISTORY API ---
    const navigateTo = (targetView: string, cafeData: Cafe | null = null, collectionId: string | null = null, filter: string | null = null) => {
        if (targetView === view && !cafeData && !collectionId && filter === exploreFilter) return;

        // Push ke Browser History biar tombol Back Browser/HP kerja
        const stateObj = { 
            view: targetView, 
            selectedCafe: cafeData, 
            selectedCollectionId: collectionId, 
            exploreFilter: filter, 
            currentTitle: filter ? `Hasil: "${filter}"` : null 
        };
        
        // Hanya push jika bukan update state yang sama
        window.history.pushState(stateObj, '', '');

        // Update state internal
        setView(targetView);
        setSelectedCafe(cafeData);
        setSelectedCollectionId(collectionId);
        setExploreFilter(filter);
        setCurrentTitle(filter ? `Hasil: "${filter}"` : null);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- DATA FETCHING & OTHER LOGICS ---
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;
        UpdaterService.checkForUpdates(APP_VERSION);
        const stateHandler = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
            if (isActive) UpdaterService.checkForUpdates(APP_VERSION);
        });
        const lastVersion = SafeStorage.getItem('nongkrongr_last_version');
        if (lastVersion && lastVersion !== APP_VERSION) {
            addToast('success', `Nongkrongr Berhasil Diperbarui ke v${APP_VERSION}! ✨`);
            SafeStorage.setItem('nongkrongr_last_version', APP_VERSION);
        } else if (!lastVersion) {
            SafeStorage.setItem('nongkrongr_last_version', APP_VERSION);
        }
        return () => { stateHandler.then(h => h.remove()); };
    }, []);

    const cartCount = useMemo(() => {
        return Object.values(cart).reduce((acc, group) => acc + group.items.reduce((a, b) => a + b.quantity, 0), 0);
    }, [cart]);

    const fetchAllData = useCallback(async (searchLoc?: {lat: number, lng: number}, city?: string) => {
        const locForSearch = searchLoc || activeLocation;
        const currentCity = city || selectedCityName;
        setIsInitialLocating(true); 
        fetchDashboardStats(currentCity).then(stats => setDashboardStats(stats)).catch(() => {});
        fetchCafesPaginated(1, 100, '', 'active', currentCity, locForSearch)
            .then(res => { if (res && res.data) setCafes(res.data); })
            .finally(() => { setIsInitialLocating(false); });
        fetchCollectionsFromDB().then(res => { if (res && res.length > 0) setCollections(res); });
        fetchHeroConfig().then(res => { if (res) setHeroConfig(res); });
    }, [activeLocation, selectedCityName]);

    const performGlobalSearch = useMemo(
        () => debounce(async (query: string) => {
            if (query.trim().length < 2) { setGlobalSearchResults([]); setIsGlobalSearching(false); return; }
            setIsGlobalSearching(true);
            try {
                const { data } = await fetchCafesPaginated(1, 20, query, 'active', '', activeLocation, 'popularity', 9999);
                setGlobalSearchResults(data || []);
            } finally { setIsGlobalSearching(false); }
        }, 500),
        [activeLocation]
    );

    const handleSearchSubmit = (query: string) => {
        setGlobalSearchQuery('');
        setGlobalSearchResults([]);
        setIsSearchOpen(false);
        navigateTo('EXPLORE', null, null, query);
    };

    const handleCommunityNav = (tab: 'feed' | 'nearby' = 'feed') => {
        setCommunityTab(tab);
        navigateTo('COMMUNITY');
    };

    useEffect(() => { if (isSearchOpen) performGlobalSearch(globalSearchQuery); }, [globalSearchQuery, isSearchOpen, performGlobalSearch]);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await signOutUser();
            setUser(null);
            setView('HOME');
            addToast('success', 'Berhasil keluar.');
        } finally { setTimeout(() => setIsLoggingOut(false), 500); }
    };

    const findGPSLocation = async () => {
        setIsInitialLocating(true);
        setLocatingError(false);
        if (!navigator.geolocation) { setLocatingError(true); setIsInitialLocating(false); return; }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                const locObj = { lat, lng };
                setGpsLocation(locObj);
                setActiveLocation(locObj);
                SafeStorage.setItem('nongkrongr_user_loc', JSON.stringify(locObj));
                let cityName = "Lokasi Terdeteksi";
                try { cityName = await reverseGeocode(lat, lng); } catch(e) {}
                setSelectedCityName(cityName);
                SafeStorage.setItem('nongkrongr_user_city', cityName);
                await fetchAllData(locObj, cityName);
            },
            () => { setLocatingError(true); setIsInitialLocating(false); },
            { timeout: 10000, enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        findGPSLocation();
        const checkHash = async () => {
            const hash = window.location.hash;
            if (hash.startsWith('#/cafe/')) {
                const cafe = await fetchCafeBySlug(hash.replace('#/cafe/', ''));
                if (cafe) navigateTo('DETAIL', cafe);
            }
        };
        checkHash();
    }, []);

    const handleLocationUpdate = useCallback((data: { lat: number, lng: number, name: string, isGPS: boolean }) => {
        const { lat, lng, name, isGPS } = data;
        setSelectedCityName(name);
        SafeStorage.setItem('nongkrongr_user_city', name);
        const locObj = { lat, lng };
        setActiveLocation(locObj);
        if (isGPS) {
            setGpsLocation(locObj);
            if (user) updateUserLocationDB(user.id, lat, lng);
        }
        SafeStorage.setItem('nongkrongr_user_loc', JSON.stringify(locObj));
        fetchAllData(locObj, name);
        setLocatingError(false);
    }, [user, fetchAllData]);

    const handleExploreReset = () => {
        setExploreFilter(null);
        setCurrentTitle(null);
    };

    const handleNotificationClick = useCallback((n: AppNotification) => {
        markNotificationRead(n.id);
        setIsNotifDrawerOpen(false);
        if (!n.targetId) return;
        const targetCafe = cafes.find(c => c.id === n.targetId);
        if (targetCafe) navigateTo('DETAIL', targetCafe);
        else if (n.title.toLowerCase().includes('pesanan')) navigateTo('DASHBOARD');
        else fetchCafeBySlug(n.targetId).then(cafe => { if (cafe) navigateTo('DETAIL', cafe); });
    }, [cafes, markNotificationRead]);

    const renderView = () => {
        if (!activeLocation && !isInitialLocating && locatingError) return null;
        const distCoords = gpsLocation || activeLocation;
        switch (view) {
            case 'HOME':
                return (
                    <HomeView 
                        cafes={cafes}
                        collections={collections}
                        onCafeClick={(c) => navigateTo('DETAIL', c)}
                        onCollectionClick={(id) => {
                            const col = collections.find(c => c.id === id);
                            navigateTo('COLLECTION', null, id, col?.title || null);
                        }}
                        userLocation={distCoords} 
                        heroConfig={heroConfig}
                        user={user}
                        notifications={notifications}
                        isDarkMode={isDarkMode}
                        toggleDarkMode={toggleDarkMode}
                        selectedCityName={selectedCityName}
                        onExploreClick={(v, label) => navigateTo('EXPLORE', null, null, label || v)}
                        onSearchClick={() => setIsSearchOpen(true)}
                        onCommunityClick={(tab) => handleCommunityNav(tab)}
                        onPromoClick={() => navigateTo('PROMO')}
                        onMapClick={() => navigateTo('MAP')}
                        stats={dashboardStats}
                    />
                );
            case 'EXPLORE':
                return <ExploreView onCafeClick={(c) => navigateTo('DETAIL', c)} cafes={cafes} initialFilter={exploreFilter} userLocation={distCoords} selectedCityName={selectedCityName} onReset={handleExploreReset} />;
            case 'MAP':
                return <MapView onCafeClick={(c) => navigateTo('DETAIL', c)} cafes={cafes} focusedCafe={selectedCafe} userLocation={gpsLocation} activeLocation={activeLocation} onLocationUpdate={handleLocationUpdate} addToast={addToast} />;
            case 'PROMO':
                return <PromoView cafes={cafes} userLocation={distCoords} onCafeClick={(c) => navigateTo('DETAIL', c)} addToast={addToast} user={user} selectedCityName={selectedCityName} />;
            case 'COMMUNITY':
                return <CommunityView onCafeClick={(c) => navigateTo('DETAIL', c)} cafes={cafes} currentUser={user} onLoginReq={() => { setAuthModalView('LOGIN'); setShowAuthModal(true); }} selectedCityName={selectedCityName} userLocation={distCoords} addToast={addToast} initialTab={communityTab} />;
            case 'DASHBOARD':
                return <UserDashboard user={user} onLogout={handleLogout} onHome={() => navigateTo('HOME')} cafes={cafes} onCafeSelect={(c) => navigateTo('DETAIL', c)} addToast={addToast} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} notifications={notifications} onMarkRead={markNotificationRead} onMarkAllRead={markAllNotificationsRead} onDeleteNotification={deleteNotification} onClearAllNotifications={clearAllNotifications} onSupportClick={() => navigateTo('SUPPORT')} onNotificationClick={handleNotificationClick} />;
            case 'DETAIL':
                if (!selectedCafe) return null;
                return (
                    <CafeDetail 
                        cafe={selectedCafe} 
                        allCafes={cafes} 
                        userLocation={distCoords} 
                        onBack={handleGlobalBack} 
                        isSaved={user?.savedCafeIds?.includes(selectedCafe.id) || false} 
                        onToggleFavorite={async () => { 
                            if (!user) { setShowAuthModal(true); return; } 
                            const currentSavedIds = user.savedCafeIds || [];
                            const isSavedNow = currentSavedIds.includes(selectedCafe.id); 
                            try { 
                                await toggleFavoriteDB(user.id, selectedCafe.id, isSavedNow); 
                                const newIds = isSavedNow ? currentSavedIds.filter(id => id !== selectedCafe.id) : [...currentSavedIds, selectedCafe.id]; 
                                updateLocalUser({ savedCafeIds: newIds }); 
                                addToast('success', isSavedNow ? 'Dihapus dari koleksi' : 'Disimpan ke koleksi'); 
                            } catch (e) { addToast('error', 'Gagal memperbarui favorit'); } 
                        }} 
                        user={user} 
                        onLoginReq={() => setShowAuthModal(true)} 
                        onCafeClick={(c) => navigateTo('DETAIL', c)} 
                        onMapOverview={(c) => navigateTo('MAP', c)} 
                        addToast={addToast} 
                    />
                );
            case 'COLLECTION':
                return <CollectionView collectionId={selectedCollectionId || ''} cafes={cafes} cafesCount={cafes.length} collections={collections} onBack={handleGlobalBack} onCafeClick={(c) => navigateTo('DETAIL', c)} userLocation={distCoords} selectedCityName={selectedCityName} />;
            case 'SUPPORT':
                return <SupportChatView onBack={handleGlobalBack} onLoginReq={() => { setAuthModalView('LOGIN'); setShowAuthModal(true); }} onHome={() => navigateTo('HOME')} />;
            default:
                return null;
        }
    };

    if (isInitialLocating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
                <div className="relative flex items-center justify-center w-32 h-32 mb-10">
                    <div className="absolute inset-0 border-[6px] border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="relative bg-white rounded-full p-5 shadow-2xl shadow-orange-500/20">
                        <MapPin className="text-orange-500 animate-bounce" size={48} strokeWidth={2.5} />
                    </div>
                </div>
                <h2 className="text-2xl font-display font-black text-gray-900 mb-2 tracking-tight">Menentukan Lokasimu...</h2>
                <p className="text-gray-500 text-sm font-medium animate-pulse max-w-[240px] leading-relaxed">Tunggu sebentar ya, kami sedang mencari titik koordinat kafenya ☕</p>
            </div>
        );
    }

    if (locatingError && !activeLocation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mb-8 shadow-inner">
                    <MapPinned size={48} strokeWidth={1.5} />
                </div>
                <h2 className="text-3xl font-display font-black text-gray-900 mb-3">Lokasi Belum Ditemukan</h2>
                <p className="text-gray-500 text-base mb-10 max-w-sm leading-relaxed font-medium">Kami perlu akses lokasi untuk menampilkan kafe di sekitarmu. Pastikan GPS kamu aktif ya!</p>
                <div className="flex flex-col w-full gap-3 max-w-xs">
                    <Button onClick={findGPSLocation} className="h-14 rounded-2xl text-lg shadow-xl shadow-orange-500/20" icon={RefreshCw}>Coba Akses GPS Lagi</Button>
                </div>
            </div>
        );
    }

    const unreadNotifCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="bg-white min-h-screen transition-colors duration-300">
            {isLoggingOut && (
                <div className="fixed inset-0 z-[100000] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
                    <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-orange-500/10">
                        <Loader2 className="animate-spin text-orange-500" size={48} />
                    </div>
                    <p className="text-lg font-display font-black uppercase tracking-widest text-orange-600 animate-pulse">Menutup Sesi Nongkrongr...</p>
                    <p className="text-xs text-gray-400 mt-2 font-medium italic">Sampai jumpa lagi di kedai kopi favoritmu! ☕</p>
                </div>
            )}
            
            <MobileTopHeader 
                user={user} selectedCityName={selectedCityName} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} 
                onSearchClick={() => setIsSearchOpen(true)} onNotifClick={() => setIsNotifDrawerOpen(true)} 
                onProfileClick={() => user ? navigateTo('DASHBOARD') : (setAuthModalView('LOGIN'), setShowAuthModal(true))} 
                unreadCount={unreadNotifCount} currentView={view}
                customTitle={currentTitle}
            />

            <MobileSearchOverlay 
                isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} searchQuery={globalSearchQuery} 
                setSearchQuery={setGlobalSearchQuery} searchResults={globalSearchResults} isSearching={isGlobalSearching} 
                onCafeClick={(c) => navigateTo('DETAIL', c)} onSubmit={handleSearchSubmit} selectedCityName={selectedCityName}
            />

            <Navigation 
                currentView={view as any} setView={v => navigateTo(v)} userRole={user?.role || 'GUEST'} 
                isLoggedIn={!!user} onLoginClick={() => {setAuthModalView('LOGIN'); setShowAuthModal(true);}} 
                isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} user={user} onLogout={handleLogout} 
                notifications={notifications} isSessionLoading={isSessionLoading} onMarkRead={markNotificationRead} 
                onMarkAllRead={markAllNotificationsRead} onClearAllNotifications={clearAllNotifications} 
                onNotificationClick={handleNotificationClick} onDeleteNotification={deleteNotification} 
                onVisibilityChange={setIsNavVisible}
            />
            
            <main>{renderView() || null}</main>

            {cartCount > 0 && !isCartOpen && (
                <div className={`
                    fixed right-5 md:right-10 z-[8000] 
                    transition-all duration-[700ms]
                    ${isNavVisible 
                        ? 'bottom-[calc(env(safe-area-inset-bottom)+80px)] opacity-100 scale-100 ease-[cubic-bezier(0.22,1,0.36,1)]' 
                        : 'bottom-[calc(env(safe-area-inset-bottom)+20px)] opacity-100 scale-100 ease-[cubic-bezier(0.32,0,0.67,0)]'
                    }
                `}>
                    <button 
                        onClick={() => setIsCartOpen(true)}
                        className="w-16 h-16 bg-gray-900 text-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-center relative hover:scale-110 active:scale-90 transition-all border-2 border-white/20"
                    >
                        <ShoppingCart size={24} />
                        <span className="absolute -top-1 -right-1 bg-orange-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 border-gray-900 shadow-md">
                            {cartCount}
                        </span>
                    </button>
                </div>
            )}

            <GlobalCartOverlay isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} addToast={addToast} onLoginReq={() => { setAuthModalView('LOGIN'); setShowAuthModal(true); }} />
            <ToastContainer toasts={toasts} onClose={id => setToasts(prev => prev.filter(t => t.id !== id))} />
            {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => setShowAuthModal(false)} initialView={authModalView} />}
            {showOnboarding && user && <OnboardingModal user={user} onComplete={async data => { await updateUserProfile(user.id, { ...data, isOnboarded: true }); setUser({ ...user, ...data, isOnboarded: true }); setShowOnboarding(false); }} />}
            <NotificationDrawer isOpen={isNotifDrawerOpen} onClose={() => setIsNotifDrawerOpen(false)} notifications={notifications} onMarkAllRead={markAllNotificationsRead} onClearAll={clearAllNotifications} onItemClick={handleNotificationClick} onDelete={deleteNotification} onMarkRead={markNotificationRead} />
        </div>
    );
};

export const App = () => (<ErrorBoundary><SessionProvider><AppContent /></SessionProvider></ErrorBoundary>);
