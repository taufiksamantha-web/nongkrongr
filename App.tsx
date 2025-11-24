
import React, { useState, useEffect, useRef, Suspense } from 'react';
import Navbar from './components/Navbar';
import LoadingScreen from './components/LoadingScreen';
import ScrollToTop from './components/ScrollToTop';
import Toast, { ToastType } from './components/Toast';
import { fetchAllNews, fetchAllTickets, createTicket, fetchSiteSettings, incrementVisitorCount } from './services/dataService';
import { loginAdmin } from './services/authService';
import { supabase } from './services/supabaseClient';
import { MapPin, Phone, Mail, Twitter, Instagram, Youtube, Lock, Loader2, Globe, ExternalLink, Users, BarChart3 } from 'lucide-react';
import { AppConfig, NewsItem, TicketData as TicketType } from './types';

// --- PERFORMANCE: LAZY LOADING COMPONENTS (Code Splitting) ---
// Komponen ini tidak akan diload di awal (initial bundle), tapi hanya saat route diakses.
// Ini sangat menghemat bandwidth dan mempercepat LCP (Largest Contentful Paint).

const HomePage = React.lazy(() => import('./components/HomePage'));
const NewsDetail = React.lazy(() => import('./components/NewsDetail'));
const ReportForm = React.lazy(() => import('./components/ReportForm'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard'));
const TicketTracker = React.lazy(() => import('./components/TicketTracker'));
const StatsPage = React.lazy(() => import('./components/StatsPage'));
const DeepfakeChecker = React.lazy(() => import('./components/DeepfakeChecker')); 

type PageType = 'home' | 'report' | 'ticket' | 'stats' | 'admin-login' | 'admin-dashboard' | 'detail' | 'deepfake';

const App: React.FC = () => {
  // Theme State
  const [darkMode, setDarkMode] = useState(false);
  
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const [page, setPage] = useState<PageType>('home');
  const pageRef = useRef<PageType>(page);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [selectedNewsId, setSelectedNewsId] = useState<string | null>(null);
  
  // Data State
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [visitorCount, setVisitorCount] = useState<number>(0);

  // App Configuration
  const [appConfig, setAppConfig] = useState<AppConfig>({
    heroTitle: 'Saring Sebelum Sharing.\nJaga Sumsel Kondusif.',
    heroDescription: 'Layanan resmi verifikasi informasi Pemerintah Provinsi Sumatera Selatan.',
    secondaryLogoUrl: '',
    cta: {
      title: 'Bantu Kami Melawan Hoax',
      description: 'Partisipasi Anda sangat berharga.',
      showFormBtn: true,
      showWaBtn: true,
      waNumber: '6281234567890'
    },
    socials: {
      twitter: 'https://twitter.com/sumselprov',
      instagram: 'https://instagram.com/sumselprov',
      youtube: 'https://youtube.com/sumselprov'
    }
  });

  // Auth State
  // Initialize from localStorage so session persists on refresh
  const [isAdmin, setIsAdmin] = useState(() => {
      return localStorage.getItem('scf_admin_session') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // New State for Logout Animation

  // Toast Notification
  const [toast, setToast] = useState<{message: string, type: ToastType} | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
      setToast({ message, type });
  };

  useEffect(() => {
      pageRef.current = page;
  }, [page]);
  
  useEffect(() => {
    if (page === 'admin-login' && usernameInputRef.current) {
        usernameInputRef.current.focus();
    }
  }, [page]);

  // --- NAVIGATION LOGIC (FIXED FOR PREVIEWS/IFRAMES) ---

  const navigateTo = (targetPage: PageType, params?: { id?: string, replace?: boolean }) => {
    // 1. PRIORITAS UTAMA: Update State UI agar navigasi terasa instan
    setPage(targetPage);
    
    if (targetPage === 'detail' && params?.id) {
        setSelectedNewsId(params.id);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 2. UPDATE URL (Dibungkus try-catch agar tidak crash di Google Studio/Preview)
    try {
        const url = new URL(window.location.href);
        
        // Set Search Params
        url.searchParams.set('page', targetPage);
        
        if (targetPage === 'detail' && params?.id) {
            url.searchParams.set('id', params.id);
        } else {
            url.searchParams.delete('id');
        }

        const newUrlString = url.toString();

        // Gunakan pushState agar URL browser berubah tanpa reload
        if (params?.replace) {
            window.history.replaceState({}, '', newUrlString);
        } else {
            window.history.pushState({}, '', newUrlString);
        }
    } catch (error) {
        // Error ini wajar di environment preview (iframe restrictions)
        // Kita ignore saja karena UI state sudah terupdate di langkah 1
        console.warn("URL update skipped due to environment restrictions (safe to ignore).");
    }
  };

  // Handle Browser URL on Load & Back/Forward (Deep Linking Support)
  useEffect(() => {
    const handleLocationChange = () => {
        // Bungkus try-catch juga saat membaca URL
        try {
            const searchParams = new URLSearchParams(window.location.search);
            const pageParam = searchParams.get('page') as PageType;
            const idParam = searchParams.get('id');

            if (pageParam) {
                // Validasi halaman yang diizinkan
                if (['home', 'stats', 'ticket', 'report', 'admin-login', 'admin-dashboard', 'detail', 'deepfake'].includes(pageParam)) {
                    // Proteksi halaman admin dashboard
                    if (pageParam === 'admin-dashboard' && !isAdmin) {
                        setPage('admin-login');
                    } else {
                        setPage(pageParam);
                    }

                    if (pageParam === 'detail' && idParam) {
                        setSelectedNewsId(idParam);
                    }
                } else {
                    setPage('home');
                }
            } else {
                // Default ke home jika tidak ada param
                setPage('home');
            }
        } catch (e) {
            console.warn("Error reading URL params, defaulting to Home.");
            setPage('home');
        }
    };

    // Listen to popstate (Back button)
    window.addEventListener('popstate', handleLocationChange);
    
    // Run on initial mount
    handleLocationChange();

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [isAdmin]);


  // --- DATA LOADING & SUBSCRIPTIONS ---
  useEffect(() => {
    const loadData = async () => {
        setIsInitialLoading(true);
        const settings = await fetchSiteSettings();
        if (settings) setAppConfig(settings);

        // Fetch Visitor Count
        const count = await incrementVisitorCount();
        setVisitorCount(count);

        const news = await fetchAllNews();
        const tix = await fetchAllTickets();
        
        setNewsData(news);
        setTickets(tix);
        setIsInitialLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    const newsChannel = supabase
      .channel('public:news')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, async (payload) => {
          const updatedNews = await fetchAllNews();
          setNewsData(updatedNews);
          
          // Notifikasi Realtime: Muncul jika ada INSERT/UPDATE/DELETE
          if (payload.eventType === 'INSERT') {
              showToast(`Berita baru telah dipublikasikan!`, 'info');
          } else if (payload.eventType === 'UPDATE') {
              showToast(`Data berita diperbarui secara realtime`, 'info');
          }
      })
      .subscribe();

    const ticketsChannel = supabase
      .channel('public:tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, async (payload) => {
          const updatedTickets = await fetchAllTickets();
          setTickets(updatedTickets);
          
           // Notifikasi Realtime untuk Laporan
           if (payload.eventType === 'INSERT') {
              // LOGIKA BARU: Hanya muncul jika Login Admin DAN sedang di Dashboard
              const isLoggedIn = localStorage.getItem('scf_admin_session') === 'true';
              const isOnDashboard = pageRef.current === 'admin-dashboard';

              if (isLoggedIn && isOnDashboard) {
                  showToast(`Ada Laporan Warga Baru Masuk!`, 'success');
              }
          }
      })
      .subscribe();

    const settingsChannel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'site_settings' }, async (payload) => {
          // 1. Update Config (Visuals)
          const newSettings = await fetchSiteSettings();
          if (newSettings) {
              setAppConfig(newSettings);
          }

          // 2. Update Real-time Visitor Count
          const newRow = payload.new as any;
          if (newRow && typeof newRow.visitor_count === 'number') {
              setVisitorCount(newRow.visitor_count);
          }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(newsChannel);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, []);

  // Auto-hide toast
  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [toast]);


  // --- HANDLERS ---

  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggingIn(true);
      const success = await loginAdmin(adminUser, adminPass);
      if (success) {
          localStorage.setItem('scf_admin_session', 'true'); // Persist login
          setIsAdmin(true);
          navigateTo('admin-dashboard');
          showToast("Berhasil masuk sebagai Admin", "success");
      } else {
          showToast("Username atau password salah", "error");
      }
      setIsLoggingIn(false);
  };
  
  const handleLogout = () => {
    setIsLoggingOut(true); // Trigger Loading Screen
    
    // Simulate clearing cache/process
    setTimeout(() => {
        localStorage.removeItem('scf_admin_session'); // Clear session
        setIsAdmin(false);
        setAdminUser(''); // Clear username cache
        setAdminPass(''); // Clear password cache
        navigateTo('home', { replace: true });
        setIsLoggingOut(false);
    }, 2000);
  };

  const handleTicketSubmit = async (newTicket: TicketType) => {
      try {
        await createTicket(newTicket);
      } catch (err) {
          console.error("Failed to save ticket to DB");
      }
  };

  // Helper untuk mendapatkan data berita saat rendering
  const getSelectedNewsItem = () => {
      if (!selectedNewsId || newsData.length === 0) return null;
      return newsData.find(n => n.id === selectedNewsId);
  };

  // --- RENDER LOGIC ---

  // LOADING SCREEN SAAT LOGOUT
  if (isLoggingOut) {
      return (
          <div className={`${darkMode ? 'dark' : ''} min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-navy-900 transition-colors`}>
               <div className="relative mb-4">
                  <div className="w-20 h-20 rounded-full border-4 border-gray-200 dark:border-navy-700"></div>
                  <div className="w-20 h-20 rounded-full border-4 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin absolute top-0 left-0"></div>
               </div>
               <h2 className="text-xl font-bold text-navy-900 dark:text-white animate-pulse">Sedang Keluar...</h2>
               <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">Membersihkan cache sesi aman</p>
          </div>
      );
  }

  // ADMIN LOGIN (Eager Loaded / Non-Lazy for safety)
  // Halaman login tidak di-code split agar interaksi awal admin cepat
  if (page === 'admin-login') {
      return (
          <div className={`${darkMode ? 'dark' : ''} min-h-screen flex items-center justify-center bg-gray-100 dark:bg-navy-900 p-4 transition-colors duration-300`}>
              {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
              <div className="bg-white dark:bg-navy-800 p-8 rounded-2xl shadow-xl w-full max-w-md animate-fade-in-up">
                  <div className="flex justify-center mb-6 text-blue-900 dark:text-white">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full">
                        <Lock size={40} className="text-blue-900 dark:text-blue-400" />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">Login Admin</h2>
                  <p className="text-center text-sm text-gray-500 mb-6">Masuk ke Panel Kontrol SumselCekFakta</p>
                  
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Username</label>
                          <input 
                            ref={usernameInputRef}
                            type="text" 
                            value={adminUser} 
                            onChange={e => setAdminUser(e.target.value)} 
                            className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white transition" 
                            required
                            autoComplete="off"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Password</label>
                          <input 
                            type="password" 
                            value={adminPass} 
                            onChange={e => setAdminPass(e.target.value)} 
                            className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white transition" 
                            required
                            autoComplete="new-password"
                          />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isLoggingIn}
                        className="w-full bg-blue-900 text-white font-bold py-3 rounded-xl hover:bg-blue-800 transition flex justify-center items-center gap-2 disabled:opacity-70 shadow-lg shadow-blue-900/20 mt-2"
                      >
                        {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : 'Masuk Dashboard'}
                      </button>
                  </form>
                  <button onClick={() => navigateTo('home')} className="w-full text-center text-gray-400 text-sm mt-6 hover:text-gray-600 dark:hover:text-gray-200 transition font-medium">
                    &larr; Kembali ke Beranda
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className={`${darkMode ? 'dark' : ''}`}>
        <div className="min-h-screen flex flex-col font-sans text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-navy-900 transition-colors duration-300">
        
        <ScrollToTop />

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {page !== 'admin-dashboard' && (
            <Navbar 
                currentPage={page} 
                onNavigate={(p) => navigateTo(p)} 
                config={appConfig}
                isDarkMode={darkMode}
                toggleTheme={toggleTheme}
            />
        )}

        <main className="flex-grow">
            {/* 
              SUSPENSE WRAPPER 
              Ini wajib ada untuk membungkus komponen lazy.
              fallback={<LoadingScreen />} akan muncul saat browser sedang mendownload chunk JS komponen.
            */}
            <Suspense fallback={<LoadingScreen />}>
                {page === 'admin-dashboard' && isAdmin && (
                    <AdminDashboard 
                        config={appConfig} 
                        onUpdateConfig={setAppConfig} 
                        onLogout={handleLogout} 
                        newsData={newsData}
                        setNewsData={setNewsData}
                        tickets={tickets}
                        setTickets={setTickets}
                        showToast={showToast}
                    />
                )}

                {/* Halaman Deepfake Checker */}
                {page === 'deepfake' && (
                    <div className="animate-fade-in-up">
                        <DeepfakeChecker onBack={() => navigateTo('home')} />
                    </div>
                )}

                {/* Untuk Halaman selain Home, tambahkan pt-28 agar tidak tertutup Navbar Fixed */}
                {page === 'report' && (
                    <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                        <ReportForm 
                            onBack={() => navigateTo('home')} 
                            onSubmitSuccess={(ticketId) => {}}
                            onAddTicket={handleTicketSubmit}
                        />
                    </div>
                )}

                {page === 'ticket' && (
                    // UPDATED PADDING BOTTOM to pb-4
                    <div className="pt-28 pb-4 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                        <TicketTracker tickets={tickets} onBack={() => navigateTo('home')} />
                    </div>
                )}

                {page === 'stats' && (
                    <div className="pt-28 pb-12 px-4 sm:px-6 lg:px-8 animate-fade-in-up">
                        <StatsPage newsData={newsData} tickets={tickets} onBack={() => navigateTo('home')} />
                    </div>
                )}

                {page === 'detail' && (
                    <div className="pt-24">
                    {isInitialLoading ? (
                        <LoadingScreen />
                    ) : getSelectedNewsItem() ? (
                        <NewsDetail 
                            item={getSelectedNewsItem()!}
                            newsData={newsData} 
                            onBack={() => navigateTo('home')}
                            onSearch={(k) => { 
                                navigateTo('home');
                            }}
                            onStatusClick={(s) => { 
                                navigateTo('home');
                            }}
                        />
                    ) : (
                        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-fade-in pt-10">
                             <div className="w-20 h-20 bg-gray-100 dark:bg-navy-800 rounded-full flex items-center justify-center mb-4">
                                <Lock className="text-gray-400" size={32} />
                             </div>
                             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Berita Tidak Ditemukan</h3>
                             <p className="text-gray-500 dark:text-gray-400 mb-6">Link yang Anda akses mungkin sudah kedaluwarsa atau salah.</p>
                             <button 
                                onClick={() => navigateTo('home')}
                                className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition"
                             >
                                Kembali ke Beranda
                             </button>
                        </div>
                    )}
                    </div>
                )}

                {page === 'home' && (
                    <HomePage 
                        newsData={newsData}
                        tickets={tickets}
                        isInitialLoading={isInitialLoading}
                        appConfig={appConfig}
                        onNavigate={navigateTo}
                        showToast={showToast}
                    />
                )}
            </Suspense>
        </main>

        {page !== 'admin-dashboard' && (
            <footer className="bg-[#0f172a] relative overflow-hidden text-white font-sans">
                {/* Decorative Gradient Blobs */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
                        
                        {/* LEFT COLUMN: Identity & Contact (Span 8) */}
                        <div className="lg:col-span-7 space-y-8">
                            {/* Logo & Description */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    {appConfig.logoUrl && (
                                        <div className="p-1.5 bg-white rounded-xl shadow-lg shadow-blue-900/20">
                                            <img src={appConfig.logoUrl} alt="Logo" className="w-10 h-10 object-contain" />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <span className="font-extrabold text-2xl leading-none tracking-tight text-white">Sumsel<span className="text-blue-500">CekFakta</span></span>
                                        <span className="text-[10px] text-blue-300 tracking-widest uppercase font-bold mt-1">Diskominfo Prov. Sumsel</span>
                                    </div>
                                </div>
                                <p className="text-blue-200/80 leading-relaxed max-w-md text-sm">
                                    Platform verifikasi informasi resmi untuk masyarakat Sumatera Selatan. 
                                    Mari bersama wujudkan ruang digital yang sehat, aman, dan bebas hoaks.
                                </p>
                            </div>

                            {/* Contact Information Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-blue-900/30">
                                <div className="flex items-start gap-3 group">
                                    <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-800 group-hover:border-blue-500 transition">
                                        <MapPin className="w-5 h-5 text-blue-400 group-hover:text-white transition" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-white text-sm mb-1">Alamat Kantor</h5>
                                        <p className="text-blue-200/70 text-xs leading-relaxed">
                                            Jl. Merdeka No.10, Talang Semut,<br/>
                                            Kec. Bukit Kecil, Kota Palembang,<br/>
                                            Sumatera Selatan
                                        </p>
                                        <a 
                                            href="https://maps.google.com/?q=Diskominfo+Sumsel" 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-[10px] font-bold text-blue-400 mt-1 flex items-center gap-1 hover:text-blue-300 transition"
                                        >
                                            Lihat di Peta <ExternalLink size={10} />
                                        </a>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-800 group-hover:border-blue-500 transition">
                                            <Phone className="w-5 h-5 text-blue-400 group-hover:text-white transition" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-white text-sm mb-0.5">Telepon</h5>
                                            <p className="text-blue-200/70 text-sm">(0711) 7443323</p>
                                        </div>
                                    </div>

                                    {/* Email Section Added */}
                                    <div className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 border border-blue-800 group-hover:border-blue-500 transition">
                                            <Mail className="w-5 h-5 text-blue-400 group-hover:text-white transition" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-white text-sm mb-0.5">Email</h5>
                                            <a href="mailto:kominfo@sumselprov.go.id" className="text-blue-200/70 text-sm hover:text-white transition">kominfo@sumselprov.go.id</a>
                                        </div>
                                    </div>
                                    
                                    {/* VISITOR STATS WIDGET (ADDED) */}
                                    <div className="mt-4 bg-blue-900/40 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between backdrop-blur-sm relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-300">
                                                <Users size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase tracking-widest text-blue-300 font-bold">Total Pengunjung</p>
                                                <p className="text-lg font-mono font-bold text-white tracking-widest leading-none">
                                                    {visitorCount.toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end relative z-10">
                                            <span className="flex h-1.5 w-1.5 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                                            </span>
                                            <span className="text-[9px] text-green-400 font-medium mt-1">Online</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Socials & Links (Span 5) */}
                        <div className="lg:col-span-5 lg:pl-12 flex flex-col justify-between">
                            <div>
                                <h4 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
                                    <Globe size={18} className="text-blue-500" /> Ikuti Kami
                                </h4>
                                <div className="flex flex-wrap gap-4">
                                    {appConfig.socials?.twitter && (
                                        <a href={appConfig.socials.twitter} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-900/20 border border-blue-800 hover:bg-blue-600 hover:border-blue-500 transition-all duration-300">
                                            <Twitter className="w-5 h-5 text-blue-400 group-hover:text-white transition" />
                                            <span className="font-semibold text-sm text-blue-200 group-hover:text-white">Twitter</span>
                                        </a>
                                    )}
                                    {appConfig.socials?.instagram && (
                                        <a href={appConfig.socials.instagram} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-900/20 border border-blue-800 hover:bg-pink-600 hover:border-pink-500 transition-all duration-300">
                                            <Instagram className="w-5 h-5 text-pink-400 group-hover:text-white transition" />
                                            <span className="font-semibold text-sm text-blue-200 group-hover:text-white">Instagram</span>
                                        </a>
                                    )}
                                    {appConfig.socials?.youtube && (
                                        <a href={appConfig.socials.youtube} target="_blank" rel="noreferrer" className="group flex items-center gap-3 px-5 py-3 rounded-xl bg-blue-900/20 border border-blue-800 hover:bg-red-600 hover:border-red-500 transition-all duration-300">
                                            <Youtube className="w-5 h-5 text-red-400 group-hover:text-white transition" />
                                            <span className="font-semibold text-sm text-blue-200 group-hover:text-white">YouTube</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Quick Links / Admin Access */}
                            <div className="mt-10 pt-8 border-t border-blue-900/30">
                                <h4 className="font-bold text-sm text-white mb-4 uppercase tracking-wider opacity-80">Tautan Cepat</h4>
                                <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-blue-300/80">
                                    <button onClick={() => navigateTo('home')} className="hover:text-white transition">Beranda</button>
                                    <button onClick={() => navigateTo('report')} className="hover:text-white transition">Lapor Hoax</button>
                                    <button onClick={() => navigateTo('stats')} className="hover:text-white transition">Data Statistik</button>
                                    <button onClick={() => navigateTo('deepfake')} className="hover:text-white transition">Cek Media AI</button>
                                    <button 
                                        onClick={() => isAdmin ? navigateTo('admin-dashboard') : navigateTo('admin-login')} 
                                        className="hover:text-blue-400 transition flex items-center gap-1"
                                    >
                                        <Lock size={12} /> Admin
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Copyright */}
                    <div className="mt-16 pt-8 border-t border-blue-900/30 text-center flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-blue-400/60 text-xs font-medium">
                            © {new Date().getFullYear()} SumselCekFakta. Diskominfo Provinsi Sumatera Selatan.
                        </p>
                        <div className="flex items-center gap-4 text-xs text-blue-400/40">
                            <span>Kebijakan Privasi</span>
                            <span>Syarat Layanan</span>
                        </div>
                    </div>
                </div>
            </footer>
        )}
        </div>
    </div>
  );
};

export default App;
