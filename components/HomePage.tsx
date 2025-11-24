import React, { useState, useMemo, useEffect, useRef } from 'react';
import { NewsItem, NewsStatus, AppConfig, TicketData } from '../types';
import NewsCard from './NewsCard';
import NewsSkeleton from './NewsSkeleton';
import { analyzeHeadlineWithAI } from '../services/geminiService';
import { optimizeImage } from '../utils/imageHelper';
import { Layers, Zap, FileEdit, Ticket as TicketIcon, SearchCheck, X, ArrowRight, SearchX, HelpCircle, Filter as FilterIcon, ChevronDown as ChevronDownIcon, Info, LayoutDashboard, XCircle, CheckCircle, AlertTriangle, Megaphone, MessageCircle, Search, Check, ScanFace } from 'lucide-react';

interface HomePageProps {
  newsData: NewsItem[];
  tickets: TicketData[];
  isInitialLoading: boolean;
  appConfig: AppConfig;
  onNavigate: (page: any, params?: any) => void; // Simplified type to match App.tsx generic navigation
  showToast: (msg: string, type: any) => void;
}

const HomePage: React.FC<HomePageProps> = ({ 
  newsData, 
  tickets,
  isInitialLoading, 
  appConfig, 
  onNavigate,
  showToast 
}) => {
  // Local State for Home Logic
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<NewsStatus | null>(null);
  const [showAllNews, setShowAllNews] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Dynamic Placeholder State
  const [searchPlaceholder, setSearchPlaceholder] = useState('Ketik kata kunci: Bansos, Jalan Rusak...');

  // UI States
  const [scrollY, setScrollY] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false); // New state for responsive check
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Infinite Scroll State
  const [visibleCount, setVisibleCount] = useState(6);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Parallax & Scroll Listener
  useEffect(() => {
    let ticking = false; // GPU optimization: requestAnimationFrame

    const handleScroll = () => {
        if (!ticking && window.innerWidth >= 768) {
            window.requestAnimationFrame(() => {
                setScrollY(window.scrollY);
                ticking = false;
            });
            ticking = true;
        }
    };

    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    handleResize();

    window.addEventListener('scroll', handleScroll, { passive: true }); // Passive listener for performance
    window.addEventListener('resize', handleResize);
    return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Click outside dropdown listener
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Dynamic Placeholder Logic
  useEffect(() => {
      if (newsData.length > 0) {
          // Ambil semua tag, buang yang umum
          const allTags = newsData.flatMap(item => item.tags)
              .map(tag => tag.trim())
              .filter(tag => tag !== 'Umum' && tag !== 'Sumsel' && tag.length > 3);
          
          // Hapus duplikat
          const uniqueTags = [...new Set(allTags)];

          if (uniqueTags.length >= 2) {
              // Acak dan ambil 2 tag
              const shuffled = uniqueTags.sort(() => 0.5 - Math.random());
              const examples = shuffled.slice(0, 2).join(', ');
              setSearchPlaceholder(`Coba cari: ${examples}...`);
          } else if (uniqueTags.length === 1) {
              setSearchPlaceholder(`Coba cari: ${uniqueTags[0]}...`);
          }
      }
  }, [newsData]);

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [debouncedQuery, selectedStatus, showAllNews]);

  // --- REAL POPULAR SEARCH CALCULATION ---
  const popularSearches = useMemo(() => {
      const counts: Record<string, number> = {};
      newsData.forEach(n => {
          n.tags.forEach(t => {
              const tag = t.trim();
              if (tag !== 'Umum' && tag !== 'Sumsel' && tag.length > 2) {
                  counts[tag] = (counts[tag] || 0) + 1;
              }
          });
      });
      return Object.entries(counts)
          .sort((a, b) => b[1] - a[1]) // Sort descending
          .slice(0, 5) // Take top 5
          .map(([keyword]) => ({ keyword }));
  }, [newsData]);

  // Filtering Logic
  const filteredNews = useMemo(() => {
    let data = newsData;
    
    if (selectedStatus) {
        data = data.filter(item => item.status === selectedStatus);
    }

    if (debouncedQuery) {
      const lowerQ = debouncedQuery.toLowerCase();
      const keywords = lowerQ.split(' ').filter(k => k.length > 2); 

      data = data.filter(item => {
        const text = (item.title + ' ' + item.content + ' ' + item.tags.join(' ')).toLowerCase();
        if (text.includes(lowerQ)) return true;
        if (keywords.length > 0) {
            return keywords.some(k => text.includes(k));
        }
        return false;
      });
    }
    return data;
  }, [debouncedQuery, newsData, selectedStatus]);

  const displayedNews = useMemo(() => {
    if (!showAllNews && !debouncedQuery && !selectedStatus) {
        return filteredNews.slice(0, 3);
    }
    return filteredNews.slice(0, visibleCount);
  }, [filteredNews, debouncedQuery, showAllNews, selectedStatus, visibleCount]);

  const hasMoreNews = displayedNews.length < filteredNews.length;

  // Handlers
  const handleLoadMore = () => {
      setIsLoadingMore(true);
      setTimeout(() => {
          setVisibleCount(prev => prev + 6);
          setIsLoadingMore(false);
      }, 500);
  };

  const handleAiCheck = async () => {
    if (!debouncedQuery) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    setSelectedStatus(null);
    
    const result = await analyzeHeadlineWithAI(debouncedQuery);
    setAiAnalysis(result);
    setIsAnalyzing(false);

    setTimeout(() => {
        document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleStatusFilterClick = (status: NewsStatus) => {
    setSelectedStatus(status);
    setSearchQuery(''); 
    showToast(`Memfilter berita: ${status}`, 'info');
    setTimeout(() => {
         document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const statsSummary = useMemo(() => {
    return [
        { 
            label: 'HOAKS', 
            count: newsData.filter(n => n.status === NewsStatus.HOAX).length,
            color: 'text-red-600',
            gradient: 'from-red-500/10 to-red-500/5 hover:border-red-500/30',
            iconColor: 'text-red-600 bg-red-100 dark:bg-red-900/30',
            icon: XCircle
        },
        { 
            label: 'FAKTA', 
            count: newsData.filter(n => n.status === NewsStatus.FAKTA).length,
            color: 'text-green-600',
            gradient: 'from-green-500/10 to-green-500/5 hover:border-green-500/30',
            iconColor: 'text-green-600 bg-green-100 dark:bg-green-900/30',
            icon: CheckCircle
        },
        { 
            label: 'DISINFORMASI', 
            count: newsData.filter(n => n.status === NewsStatus.DISINFORMASI).length,
            color: 'text-yellow-600',
            gradient: 'from-yellow-500/10 to-yellow-500/5 hover:border-yellow-500/30',
            iconColor: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
            icon: AlertTriangle
        },
        { 
            label: 'HATE SPEECH', 
            count: newsData.filter(n => n.status === NewsStatus.HATE_SPEECH).length,
            color: 'text-purple-600',
            gradient: 'from-purple-500/10 to-purple-500/5 hover:border-purple-500/30',
            iconColor: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
            icon: Megaphone
        }
    ];
  }, [newsData]);

  const quickMenus = [
    { 
      title: 'Semua Klarifikasi', 
      icon: Layers, 
      action: () => {
          setShowAllNews(true); 
          setSelectedStatus(null);
          setTimeout(() => {
            document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      },
      desc: 'Arsip lengkap berita'
    },
    { 
      title: 'Cek Deepfake AI', 
      icon: ScanFace, 
      action: () => {
          onNavigate('deepfake');
      },
      desc: 'Analisis gambar & video'
    },
    { 
      title: 'Permohonan Klarifikasi', 
      icon: FileEdit, 
      action: () => {
          // Ensure navigation happens properly using the prop
          onNavigate('report');
      },
      desc: 'Lapor Hoax di sini'
    },
    { 
      title: 'Lacak Tiket', 
      icon: TicketIcon, 
      action: () => {
          // Ensure navigation happens properly using the prop
          onNavigate('ticket');
      },
      desc: 'Cek status laporan'
    }
  ];

  // Helper for Dropdown Label
  const getDropdownLabel = () => {
      if (!selectedStatus) return "Semua Kategori";
      return selectedStatus;
  };

  return (
    <>
        {/* HERO SECTION WITH PARALLAX */}
        <section className="relative pt-48 pb-32 px-4 sm:px-6 lg:px-8 min-h-[650px] flex items-center justify-center overflow-hidden">
            
            {/* Parallax Background Layer - GPU OPTIMIZED */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                 <div 
                    className="absolute inset-0 w-full h-full transform-gpu will-change-transform"
                    style={{ 
                        transform: isMobile ? 'translate3d(0,0,0)' : `translate3d(0, ${scrollY * 0.4}px, 0)`, // Use translate3d for GPU
                        backgroundImage: appConfig.heroBgUrl 
                        ? `linear-gradient(rgba(15, 23, 42, 0.7), rgba(30, 58, 138, 0.8)), url(${optimizeImage(appConfig.heroBgUrl, 1920)})` 
                        : '',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        height: '120%' // Taller to accommodate scroll
                    }}
                >
                    {!appConfig.heroBgUrl && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-blue-900"></div>
                            <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl animate-pulse-slow"></div>
                            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"></div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Layer - Added gpu-accelerated class */}
            <div className="max-w-5xl mx-auto text-center relative z-30 w-full -mt-20 gpu-accelerated">
                <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-blue-800/50 border border-blue-700 text-blue-100 text-xs font-bold tracking-wide mb-6 backdrop-blur-sm hover:bg-blue-800/70 transition cursor-default animate-fade-in-up">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    DATABASE TERUPDATE {new Date().getFullYear()}
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight drop-shadow-2xl whitespace-pre-line animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    {appConfig.heroTitle}
                </h1>
                <p className="text-base sm:text-lg md:text-xl text-blue-100 mb-12 max-w-3xl mx-auto font-medium leading-relaxed drop-shadow-md whitespace-pre-line animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    {appConfig.heroDescription}
                </p>
                
                <div className="relative max-w-2xl mx-auto group animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 will-change-transform"></div>
                    <div className="relative flex items-center">
                        <Search className="absolute left-5 text-gray-400 z-20 pointer-events-none" size={20} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-12 pr-32 py-4 sm:py-5 rounded-2xl text-base sm:text-lg font-medium text-gray-900 placeholder-gray-400 bg-white/95 backdrop-blur-xl shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition border border-white/20" 
                            placeholder={searchPlaceholder}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center z-20">
                            <button 
                                className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-bold hover:bg-blue-500 transition text-sm sm:text-base shadow-lg shadow-blue-600/30 active:scale-95"
                                onClick={() => document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' })}
                            >
                                Cari
                            </button>
                        </div>
                    </div>
                </div>

                {/* Custom Beautiful Dropdown */}
                <div className="mt-8 flex justify-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`
                                flex items-center gap-3 pl-5 pr-4 py-3 rounded-full 
                                text-white font-semibold text-sm backdrop-blur-md transition-all duration-300 shadow-lg
                                border border-white/20
                                ${isDropdownOpen 
                                    ? 'bg-blue-900/80 ring-4 ring-blue-500/30' 
                                    : 'bg-white/10 hover:bg-white/20 hover:scale-105'}
                            `}
                        >
                            <FilterIcon size={16} className="text-blue-300" />
                            <span>{getDropdownLabel()}</span>
                            <ChevronDownIcon 
                                size={16} 
                                className={`text-blue-300 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                            />
                        </button>

                        {/* Dropdown Menu */}
                        <div 
                            className={`
                                absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 
                                bg-white dark:bg-navy-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-navy-700
                                overflow-hidden transition-all duration-300 z-50 origin-top gpu-accelerated
                                ${isDropdownOpen 
                                    ? 'opacity-100 scale-100 translate-y-0' 
                                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
                            `}
                        >
                            <div className="p-1.5">
                                <button
                                    onClick={() => { setSelectedStatus(null); setIsDropdownOpen(false); }}
                                    className={`
                                        flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-bold transition-all
                                        ${!selectedStatus 
                                            ? 'bg-blue-50 dark:bg-navy-700 text-blue-600 dark:text-blue-300' 
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700'}
                                    `}
                                >
                                    Semua Kategori
                                    {!selectedStatus && <Check size={16} />}
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-navy-700 my-1"></div>
                                {Object.values(NewsStatus).map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => { 
                                            handleStatusFilterClick(status);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`
                                            flex items-center justify-between w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-1
                                            ${selectedStatus === status 
                                                ? 'bg-blue-50 dark:bg-navy-700 text-blue-600 dark:text-blue-300' 
                                                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700'}
                                        `}
                                    >
                                        {status}
                                        {selectedStatus === status && <Check size={16} />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {debouncedQuery.length > 3 && (
                    <div className="mt-8 animate-fade-in-up">
                        <button 
                            onClick={handleAiCheck}
                            disabled={isAnalyzing}
                            className="group inline-flex items-center px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition backdrop-blur-md text-sm font-semibold hover:scale-105"
                        >
                            {isAnalyzing ? <Zap size={18} className="animate-spin mr-2 text-yellow-300"/> : <Zap size={18} className="mr-2 text-yellow-300 group-hover:rotate-12 transition" />}
                            {isAnalyzing ? 'Sedang Menganalisis...' : `Tanya AI tentang "${debouncedQuery}"?`}
                        </button>
                    </div>
                )}
                
                {aiAnalysis && (
                    <div className="mt-8 max-w-3xl mx-auto bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-left animate-fade-in-up shadow-2xl gpu-accelerated">
                        <div className="flex items-start space-x-4">
                            <div className="bg-blue-600 p-2.5 rounded-xl text-white mt-1 shadow-lg shrink-0">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg mb-2">Analisis AI (Gemini)</h4>
                                <div className="text-blue-50 text-sm whitespace-pre-line leading-relaxed bg-black/20 p-4 rounded-lg border border-white/5">
                                    {aiAnalysis}
                                </div>
                                <p className="text-xs text-blue-200 mt-3 opacity-70 flex items-center gap-1">
                                    <Info size={12} />
                                    Analisis otomatis AI. Selalu cek sumber resmi.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Real Data Popular Search */}
                <div className="mt-10 flex justify-center gap-2 sm:gap-3 text-xs sm:text-sm text-blue-200 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                    <span className="opacity-70 flex items-center gap-1"><Search size={12}/> Pencarian Populer:</span>
                    {popularSearches.length > 0 ? popularSearches.map((stat, idx) => (
                        <button 
                            key={idx}
                            onClick={() => setSearchQuery(stat.keyword)} 
                            className="text-white font-medium hover:text-blue-200 cursor-pointer bg-white/10 px-3 py-1 rounded-full border border-white/10 hover:bg-white/20 transition backdrop-blur-sm capitalize"
                        >
                            {stat.keyword}
                        </button>
                    )) : (
                         <span className="opacity-50 italic">Belum ada data cukup.</span>
                    )}
                </div>
            </div>
        </section>

        {/* QUICK MENU */}
        <div className="relative z-20 -mt-16 sm:-mt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto gpu-accelerated">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                {quickMenus.map((menu, idx) => (
                <button 
                    key={idx}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        menu.action();
                    }}
                    className="group relative bg-gradient-to-br from-navy-900 to-blue-900 hover:from-blue-800 hover:to-navy-800 rounded-3xl p-5 sm:p-6 text-left shadow-2xl shadow-blue-900/20 border border-white/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden cursor-pointer w-full transform-gpu"
                >
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-500 will-change-transform"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between gap-4 sm:gap-6">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/10 group-hover:bg-white/20 transition shadow-inner">
                        <menu.icon size={20} className="sm:w-7 sm:h-7" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm sm:text-lg leading-tight mb-1 sm:mb-2">{menu.title}</h3>
                        <p className="text-blue-200 text-[10px] sm:text-xs font-medium opacity-70 group-hover:opacity-100 transition">{menu.desc}</p>
                    </div>
                    </div>
                </button>
                ))}
            </div>
        </div>

        {/* NEWS SECTION */}
        <section id="news-section" className="relative pt-24 sm:pt-28 pb-12 bg-gray-50 dark:bg-navy-900 transition-colors duration-300 overflow-hidden">
            
            {/* BACKGROUND PATTERN: LIGHT MODE (Blue Dots) */}
            <div className="absolute inset-0 opacity-[0.04] dark:opacity-0 pointer-events-none transition-opacity duration-300"
                  style={{ backgroundImage: 'radial-gradient(#1e3a8a 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
            </div>
            {/* BACKGROUND PATTERN: DARK MODE (White Dots - Visible) */}
            <div className="absolute inset-0 opacity-0 dark:opacity-[0.1] pointer-events-none transition-opacity duration-300"
                  style={{ backgroundImage: 'radial-gradient(#ffffff 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-end mb-10 gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            <div className="bg-blue-900 p-3 rounded-xl shadow-lg shrink-0">
                            <SearchCheck className="text-white" size={24} />
                            </div>
                            <div>
                            <h2 className="text-xl sm:text-3xl font-bold text-navy-900 dark:text-white tracking-tight flex flex-wrap items-center gap-3">
                                {debouncedQuery ? 'Hasil Pencarian' : (selectedStatus ? 'Filter Status' : (showAllNews ? 'Arsip Berita Lengkap' : 'Verifikasi Terbaru'))}
                                
                                {selectedStatus && (
                                    <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${
                                        selectedStatus === NewsStatus.HOAX ? 'text-red-600 border-red-200 bg-red-50' :
                                        selectedStatus === NewsStatus.FAKTA ? 'text-green-600 border-green-200 bg-green-50' :
                                        'text-yellow-600 border-yellow-200 bg-yellow-50'
                                    }`}>
                                        {selectedStatus}
                                    </span>
                                )}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs sm:text-lg">
                                {debouncedQuery 
                                ? `Menampilkan hasil yang berhubungan dengan "${debouncedQuery}"`
                                : (selectedStatus 
                                    ? `Menampilkan semua berita dengan status ${selectedStatus}`
                                    : (showAllNews ? 'Gulir ke bawah untuk memuat lebih banyak berita.' : 'Daftar informasi yang baru saja ditinjau oleh tim kami.'))
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 self-start sm:self-end mt-4 sm:mt-0 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
                        {selectedStatus && (
                            <button 
                                onClick={() => { setSelectedStatus(null); showToast('Filter dihapus', 'info'); }}
                                className="text-red-500 dark:text-red-400 font-bold flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition border border-red-200 dark:border-red-800 whitespace-nowrap text-sm sm:text-base"
                            >
                                <X size={16} /> Hapus Filter
                            </button>
                        )}

                        {!debouncedQuery && !showAllNews && !selectedStatus && (
                            <button 
                                onClick={() => setShowAllNews(true)}
                                className="text-blue-700 dark:text-blue-400 font-bold hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-navy-800 transition group whitespace-nowrap text-sm sm:text-base"
                            >
                                Lihat Arsip Lengkap <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                            </button>
                        )}
                        {showAllNews && !debouncedQuery && (
                            <button 
                                onClick={() => setShowAllNews(false)}
                                className="text-gray-500 dark:text-gray-400 font-bold hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-navy-800 transition whitespace-nowrap text-sm sm:text-base"
                            >
                                Tampilkan Sedikit
                            </button>
                        )}
                    </div>
                </div>

                {isInitialLoading ? (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <NewsSkeleton />
                        <NewsSkeleton />
                        <NewsSkeleton />
                        </div>
                ) : (
                        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {displayedNews.length > 0 ? (
                            displayedNews.map(item => (
                                <NewsCard 
                                    key={item.id} 
                                    item={item} 
                                    onClick={() => onNavigate('detail', { id: item.id })}
                                    onStatusClick={handleStatusFilterClick}
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-16 px-8 text-center bg-white dark:bg-navy-800 rounded-3xl border border-dashed border-gray-200 dark:border-navy-700 shadow-sm animate-fade-in-up">
                                <div className="max-w-lg mx-auto">
                                    <div className="w-24 h-24 bg-blue-50 dark:bg-navy-900 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-300 dark:text-navy-600 relative">
                                        <SearchX size={48} />
                                        <div className="absolute -bottom-1 -right-1 bg-red-100 text-red-500 p-2 rounded-full border-2 border-white dark:border-navy-800">
                                            <HelpCircle size={16} />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-navy-900 dark:text-white mb-3">
                                        Waduh, informasi belum ditemukan
                                    </h3>
                                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                                        Sepertinya kata kunci <strong>"{debouncedQuery}"</strong> belum ada di database kami. 
                                        Bisa jadi beritanya belum terverifikasi atau ada kesalahan penulisan.
                                    </p>

                                    <div className="bg-gray-50 dark:bg-navy-900/50 rounded-xl p-6 mb-8 border border-gray-100 dark:border-navy-700">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Saran Pencarian Populer</p>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {popularSearches.length > 0 ? popularSearches.map(s => s.keyword).slice(0,5).map(tag => (
                                                <button 
                                                    key={tag}
                                                    onClick={() => setSearchQuery(tag)}
                                                    className="px-4 py-2 bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-600 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:border-blue-300 transition capitalize"
                                                >
                                                    {tag}
                                                </button>
                                            )) : <span>-</span>}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                        {(selectedStatus || searchQuery) && (
                                            <button 
                                                onClick={() => { setSelectedStatus(null); setSearchQuery(''); }}
                                                className="w-full sm:w-auto px-6 py-3 bg-gray-100 dark:bg-navy-700 text-gray-600 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-navy-600 transition"
                                            >
                                                Reset Filter
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => onNavigate('report')}
                                            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                                        >
                                            <FileEdit size={18} />
                                            Laporkan Hoax Baru
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {isLoadingMore && (
                            <>
                            <NewsSkeleton />
                            <NewsSkeleton />
                            <NewsSkeleton />
                            </>
                        )}
                        </div>
                )}

                {(showAllNews || debouncedQuery || selectedStatus) && hasMoreNews && (
                    <div className="flex justify-center mt-8">
                        <button 
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="px-6 py-2 bg-white dark:bg-navy-800 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-navy-700 rounded-full shadow-sm hover:bg-blue-50 dark:hover:bg-navy-700 transition disabled:opacity-50 font-bold text-sm"
                        >
                            {isLoadingMore ? 'Memuat...' : 'Muat Lebih Banyak'}
                        </button>
                    </div>
                )}

            </div>
        </section>

        {/* STATS SECTION */}
        <section className="relative pb-24 bg-gray-50 dark:bg-navy-900 transition-colors duration-300 overflow-hidden">
             
             {/* BACKGROUND PATTERN: LIGHT MODE (Blue Lines) */}
             <div className="absolute inset-0 opacity-[0.03] dark:opacity-0 pointer-events-none transition-opacity duration-300"
                  style={{
                      backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                  }}>
             </div>
             {/* BACKGROUND PATTERN: DARK MODE (White Lines - Visible) */}
             <div className="absolute inset-0 opacity-0 dark:opacity-[0.05] pointer-events-none transition-opacity duration-300"
                  style={{
                      backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
                      backgroundSize: '40px 40px'
                  }}>
             </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="mb-10 flex items-center gap-4">
                        <div className="bg-blue-900 p-3 rounded-xl shadow-lg">
                        <LayoutDashboard className="text-white" size={24} />
                        </div>
                        <div>
                        <h3 className="text-2xl sm:text-3xl font-bold text-navy-900 dark:text-white">Rekapitulasi Data</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-lg">Update Real-time Database SumselCekFakta</p>
                        </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statsSummary.map((stat, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => handleStatusFilterClick(stat.label as NewsStatus)}
                            className={`group relative overflow-hidden bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-navy-700 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer transform-gpu`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-100 transition duration-500`}></div>
                            
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <div className={`text-xs font-bold tracking-widest uppercase mb-2 ${stat.color} opacity-80`}>
                                        Total {stat.label}
                                    </div>
                                    <h4 className="text-4xl font-black text-navy-900 dark:text-white tracking-tight group-hover:scale-110 transition-transform origin-left will-change-transform">
                                        {stat.count}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-1 font-medium">Artikel terverifikasi</p>
                                </div>
                                
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${stat.iconColor} group-hover:scale