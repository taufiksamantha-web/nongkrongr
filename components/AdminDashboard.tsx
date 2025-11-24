
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard, FileText, Settings, LogOut, Plus, Image as ImageIcon, Save, Trash2, Share2, Edit, ArrowLeft, AlertCircle, ArrowRightCircle, Link as LinkIcon, UploadCloud, Loader2, X, Search, CheckSquare, ChevronLeft, ChevronRight, Filter, Megaphone, Menu, Activity, Ticket as TicketIcon, Clock, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { NewsItem, NewsStatus, AppConfig, TicketData } from '../types';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { createNews, deleteNews, updateNews, updateTicketStatus, deleteTicket, updateSiteSettings } from '../services/dataService';
import { ToastType } from './Toast';

interface AdminDashboardProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  onLogout: () => void;
  newsData: NewsItem[];
  setNewsData: React.Dispatch<React.SetStateAction<NewsItem[]>>;
  tickets: TicketData[];
  setTickets: React.Dispatch<React.SetStateAction<TicketData[]>>;
  showToast: (message: string, type: ToastType) => void;
}

// Interface untuk item aktivitas gabungan agar type-safe
interface ActivityItem {
    type: 'news' | 'ticket';
    date: string;
    sortDate: string;
    title: string;
    status: string;
    id: string;
    reporter?: string; // Opsional, hanya untuk tiket
}

const ITEMS_PER_PAGE = 10;

// Helper Timestamp Manual
const getIndonesianTimestamp = () => {
  const now = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, Pukul ${hours}:${minutes} WIB`;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ config, onUpdateConfig, onLogout, newsData, setNewsData, tickets, setTickets, showToast }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'news' | 'tickets' | 'settings'>('stats');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- LOGOUT STATE ---
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // --- DELETE MODAL STATE ---
  const [deleteConfig, setDeleteConfig] = useState<{
    isOpen: boolean;
    type: 'news_single' | 'news_bulk' | 'ticket_single' | 'ticket_bulk' | null;
    id?: string;
    count?: number;
  }>({ isOpen: false, type: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // --- NEWS STATE ---
  const [isEditingNews, setIsEditingNews] = useState(false);
  const [currentNewsItem, setCurrentNewsItem] = useState<Partial<NewsItem>>({});
  const [newsSearchQuery, setNewsSearchQuery] = useState('');
  const [newsPage, setNewsPage] = useState(1);
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: keyof NewsItem; direction: 'asc' | 'desc' } | null>(null);

  // --- TICKETS STATE ---
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [ticketPage, setTicketPage] = useState(1);
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // --- IMAGE UPLOAD STATE ---
  const [imageInputType, setImageInputType] = useState<'url' | 'upload'>('url');
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- SETTINGS STATE ---
  const [heroBg, setHeroBg] = useState(config.heroBgUrl || '');
  const [heroBgInputType, setHeroBgInputType] = useState<'url' | 'upload'>('url'); 
  const [heroBgFile, setHeroBgFile] = useState<File | null>(null);
  
  const [heroTitle, setHeroTitle] = useState(config.heroTitle || '');
  const [heroDesc, setHeroDesc] = useState(config.heroDescription || '');
  const [logoUrl, setLogoUrl] = useState(config.logoUrl || '');
  const [secondaryLogoUrl, setSecondaryLogoUrl] = useState(config.secondaryLogoUrl || '');
  
  // CTA States
  const [ctaTitle, setCtaTitle] = useState(config.cta?.title || 'Bantu Kami Melawan Hoax');
  const [ctaDesc, setCtaDesc] = useState(config.cta?.description || '');
  const [waNumber, setWaNumber] = useState(config.cta?.waNumber || '');
  const [showFormBtn, setShowFormBtn] = useState(config.cta?.showFormBtn ?? true);
  const [showWaBtn, setShowWaBtn] = useState(config.cta?.showWaBtn ?? true);
  
  const [twitter, setTwitter] = useState(config.socials?.twitter || '');
  const [instagram, setInstagram] = useState(config.socials?.instagram || '');
  const [youtube, setYoutube] = useState(config.socials?.youtube || '');

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  // --- STATS CALCULATION (CHARTS) ---
  const categoryStats = useMemo(() => {
      const stats: Record<string, number> = {};
      tickets.forEach(t => {
          const cat = t.reportData?.category || 'Uncategorized'; // Safe access
          stats[cat] = (stats[cat] || 0) + 1;
      });
      
      // Convert to array and find max for scaling
      const data = Object.entries(stats).map(([label, count]) => ({ label, count }));
      const max = Math.max(...data.map(d => d.count), 1); // Prevent div by 0
      return { data, max };
  }, [tickets]);

  const statusStats = useMemo(() => {
      const stats = {
          [NewsStatus.HOAX]: 0,
          [NewsStatus.FAKTA]: 0,
          [NewsStatus.DISINFORMASI]: 0,
          [NewsStatus.HATE_SPEECH]: 0
      };
      newsData.forEach(n => {
          if (stats[n.status] !== undefined) stats[n.status]++;
      });
      return stats;
  }, [newsData]);

  // Helper Ticket Date
  const getFormattedTicketDate = (ticket: TicketData) => {
      if (ticket.history && ticket.history.length > 0 && ticket.history[0].date) {
          return ticket.history[0].date; 
      }
      return ticket.submissionDate + " (Jam tidak tercatat)";
  };

  // --- COMPUTED DATA (NEWS) ---
  const filteredNews = useMemo(() => {
    return newsData.filter(item => 
        item.title.toLowerCase().includes(newsSearchQuery.toLowerCase()) ||
        item.status.toLowerCase().includes(newsSearchQuery.toLowerCase())
    );
  }, [newsData, newsSearchQuery]);

  const sortedNews = useMemo(() => {
      let sortableItems = [...filteredNews];
      if (sortConfig !== null) {
          sortableItems.sort((a, b) => {
              // @ts-ignore
              if (a[sortConfig.key] < b[sortConfig.key]) {
                  return sortConfig.direction === 'asc' ? -1 : 1;
              }
              // @ts-ignore
              if (a[sortConfig.key] > b[sortConfig.key]) {
                  return sortConfig.direction === 'asc' ? 1 : -1;
              }
              return 0;
          });
      }
      return sortableItems;
  }, [filteredNews, sortConfig]);

  const paginatedNews = useMemo(() => {
    const start = (newsPage - 1) * ITEMS_PER_PAGE;
    return sortedNews.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedNews, newsPage]);

  const totalNewsPages = Math.ceil(filteredNews.length / ITEMS_PER_PAGE);

  // --- COMPUTED DATA (TICKETS) ---
  const paginatedTickets = useMemo(() => {
    const start = (ticketPage - 1) * ITEMS_PER_PAGE;
    return tickets.slice(start, start + ITEMS_PER_PAGE);
  }, [tickets, ticketPage]);
  
  const totalTicketPages = Math.ceil(tickets.length / ITEMS_PER_PAGE);

  // --- HANDLERS: SETTINGS ---
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    
    let finalHeroBgUrl = heroBg;

    if (heroBgInputType === 'upload' && heroBgFile) {
        try {
            finalHeroBgUrl = await uploadToCloudinary(heroBgFile);
        } catch (error) {
            showToast('Gagal mengupload gambar background.', 'error');
            setIsSavingSettings(false);
            return;
        }
    }

    const newConfig: AppConfig = {
        heroBgUrl: finalHeroBgUrl,
        heroTitle: heroTitle,
        heroDescription: heroDesc,
        logoUrl: logoUrl,
        secondaryLogoUrl: secondaryLogoUrl,
        cta: { 
            title: ctaTitle,
            description: ctaDesc, 
            waNumber: waNumber, 
            showFormBtn, 
            showWaBtn 
        },
        socials: { twitter, instagram, youtube }
    };

    try {
        await updateSiteSettings(newConfig);
        onUpdateConfig(newConfig);
        setHeroBg(finalHeroBgUrl); 
        setHeroBgFile(null); 
        showToast('Pengaturan berhasil disimpan!', 'success');
    } catch (error) {
        console.error(error);
        showToast('Gagal menyimpan pengaturan.', 'error');
    }
    
    setIsSavingSettings(false);
  };

  // --- HANDLERS: DELETE FLOW ---
  const toggleSelectNews = (id: string) => {
      setSelectedNewsIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllNews = () => {
      if (selectedNewsIds.length === filteredNews.length) {
          setSelectedNewsIds([]);
      } else {
          setSelectedNewsIds(filteredNews.map(n => n.id));
      }
  };

  // Trigger Modal for Bulk News Delete
  const initiateBulkDeleteNews = () => {
      setDeleteConfig({
          isOpen: true,
          type: 'news_bulk',
          count: selectedNewsIds.length
      });
  };

  // Trigger Modal for Single News Delete
  const initiateDeleteNews = (id: string) => {
      setDeleteConfig({
          isOpen: true,
          type: 'news_single',
          id: id
      });
  };

  const toggleSelectTicket = (id: string) => {
      setSelectedTicketIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllTickets = () => {
      if (selectedTicketIds.length === tickets.length) {
          setSelectedTicketIds([]);
      } else {
          setSelectedTicketIds(tickets.map(t => t.id));
      }
  };

  // Trigger Modal for Bulk Ticket Delete
  const initiateBulkDeleteTickets = () => {
       setDeleteConfig({
          isOpen: true,
          type: 'ticket_bulk',
          count: selectedTicketIds.length
      });
  };

  // EXECUTE DELETE ACTION
  const executeDelete = async () => {
      setIsDeleting(true);
      const { type, id } = deleteConfig;

      try {
        if (type === 'news_single' && id) {
             await deleteNews(id);
             setNewsData(prev => prev.filter(n => n.id !== id));
             showToast('Berita berhasil dihapus', 'success');
        } 
        else if (type === 'news_bulk') {
             for(const newsId of selectedNewsIds) { await deleteNews(newsId); }
             setNewsData(prev => prev.filter(item => !selectedNewsIds.includes(item.id)));
             setSelectedNewsIds([]);
             showToast(`${selectedNewsIds.length} berita berhasil dihapus.`, 'success');
        }
        else if (type === 'ticket_bulk') {
             for(const ticketId of selectedTicketIds) { await deleteTicket(ticketId); }
             setTickets(prev => prev.filter(item => !selectedTicketIds.includes(item.id)));
             setSelectedTicketIds([]);
             showToast(`${selectedTicketIds.length} tiket laporan dihapus.`, 'success');
        }
      } catch (err) {
          showToast("Gagal menghapus data", 'error');
      } finally {
          setIsDeleting(false);
          setDeleteConfig({ isOpen: false, type: null }); // Close modal
      }
  };


  // --- HANDLERS: NEWS CRUD ---
  const handleAddNews = () => {
      setCurrentNewsItem({
          id: '', title: '', content: '', date: new Date().toISOString().split('T')[0],
          status: NewsStatus.HOAX, imageUrl: '', tags: [], source: '', referenceLink: ''
      });
      setImageInputType('url');
      setSelectedImageFile(null);
      setImagePreview(null);
      setIsEditingNews(true);
  };

  const handleEditNews = (item: NewsItem) => {
      setCurrentNewsItem({ ...item });
      setImageInputType('url');
      setSelectedImageFile(null);
      setImagePreview(item.imageUrl);
      setIsEditingNews(true);
  };

  const handleSort = (key: keyof NewsItem) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  };


  const handleSaveNews = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentNewsItem.title || !currentNewsItem.content) return;

      setIsUploading(true);
      let finalImageUrl = currentNewsItem.imageUrl || '';

      if (imageInputType === 'upload' && selectedImageFile) {
          try {
              finalImageUrl = await uploadToCloudinary(selectedImageFile);
          } catch (error) {
              showToast('Gagal mengupload gambar.', 'error');
              setIsUploading(false);
              return;
          }
      }

      const newItemData = { ...currentNewsItem, imageUrl: finalImageUrl } as NewsItem;

      try {
        if (currentNewsItem.id) {
            await updateNews(newItemData);
            setNewsData(prev => prev.map(n => n.id === newItemData.id ? newItemData : n));
            showToast('Berita berhasil diperbarui!', 'success');
        } else {
            const newItem: NewsItem = {
                ...newItemData,
                id: Date.now().toString(),
                tags: Array.isArray(currentNewsItem.tags) && currentNewsItem.tags.length > 0 ? currentNewsItem.tags : ['Umum'],
                viewCount: 0
            };
            await createNews(newItem);
            setNewsData(prev => [newItem, ...prev]);
            showToast('Berita baru berhasil dipublikasikan!', 'success');
        }
      } catch (err) {
          console.error(err);
          showToast("Gagal menyimpan ke database.", 'error');
      }
      
      setIsUploading(false);
      setIsEditingNews(false);
  };

  // --- HANDLERS: TICKET ACTIONS ---
  const handleTicketStatusChange = async (ticketId: string, newStatus: TicketData['status']) => {
      const currentTimestamp = getIndonesianTimestamp();
      const newHistory = { date: currentTimestamp, note: `Status diubah menjadi ${newStatus} oleh Admin.` };
      try {
          const ticket = tickets.find(t => t.id === ticketId);
          if(ticket) {
             await updateTicketStatus(ticketId, newStatus, [...ticket.history, newHistory]);
             setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus, history: [...t.history, newHistory] } : t));
             showToast(`Status tiket diubah: ${newStatus}`, 'info');
             setSelectedTicket(null); // Tutup Modal
          }
      } catch (err) {
          showToast("Gagal mengubah status tiket", 'error');
      }
  };

  const handleConvertToNews = (ticket: TicketData) => {
      setCurrentNewsItem({
          id: '', title: `Klarifikasi: ${ticket.reportData.category} - ${ticket.reportData.name}`,
          content: ticket.reportData.content, date: new Date().toISOString().split('T')[0],
          status: NewsStatus.HOAX, imageUrl: ticket.reportData.evidenceUrl || '',
          tags: [ticket.reportData.category], source: 'Laporan Warga', referenceLink: ''
      });
      setImageInputType('url');
      setImagePreview(ticket.reportData.evidenceUrl || null);
      setSelectedTicket(null);
      setActiveTab('news');
      setIsEditingNews(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-navy-900 flex transition-colors duration-300 font-sans overflow-hidden">
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-navy-900 dark:bg-black text-white flex flex-col 
            transform transition-transform duration-300 ease-in-out shadow-2xl
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:static
        `}
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
                    <Settings size={18} className="text-white"/>
                </div>
                <div>
                    <h2 className="font-bold text-lg leading-none">Admin Panel</h2>
                    <p className="text-[10px] text-blue-300 mt-1 tracking-wider uppercase">SumselCekFakta</p>
                </div>
             </div>
             <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
                <X size={24} />
             </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2">Menu Utama</p>
            <button onClick={() => setActiveTab('stats')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-medium text-sm ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <LayoutDashboard size={18} /> Statistik & Dashboard
            </button>
            <button onClick={() => setActiveTab('news')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-medium text-sm ${activeTab === 'news' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <FileText size={18} /> Kelola Berita
            </button>
            <button onClick={() => setActiveTab('tickets')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-medium text-sm ${activeTab === 'tickets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <div className="relative">
                    <LinkIcon size={18} />
                    {tickets.filter(t => t.status === 'pending').length > 0 && (
                         <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border-2 border-navy-900 animate-pulse"></span>
                    )}
                </div>
                Laporan Warga
            </button>
            
            <div className="h-px bg-gray-800 my-2 mx-4"></div>
            
            <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 mt-2">Sistem</p>
            <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition font-medium text-sm ${activeTab === 'settings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                <Settings size={18} /> Tampilan Website
            </button>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 font-bold text-sm w-full px-4 py-3 rounded-xl transition group">
                <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> Keluar
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto w-full relative bg-gray-50 dark:bg-navy-950">
        
        {/* Mobile Header (Sticky) */}
        <div className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-navy-900/80 backdrop-blur-md border-b border-gray-200 dark:border-navy-700 px-4 py-3 flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">CF</div>
                <span className="font-bold text-gray-800 dark:text-white text-sm">Dashboard</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-gray-100 dark:bg-navy-800 rounded-lg text-gray-600 dark:text-gray-300 active:scale-95 transition">
                <Menu size={24} />
            </button>
        </div>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Desktop Header */}
            <header className="hidden md:flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white capitalize tracking-tight">
                        {activeTab === 'stats' ? 'Ringkasan Statistik' : 
                        activeTab === 'tickets' ? 'Manajemen Laporan' :
                        activeTab === 'news' ? 'Manajemen Berita' : 'Pengaturan Website'}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kelola konten dan data SumselCekFakta dengan mudah.</p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-navy-800 px-4 py-2 rounded-full border border-gray-200 dark:border-navy-700 shadow-sm">
                    <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">System Online</span>
                </div>
            </header>

            {/* CONTENT: STATS & DASHBOARD */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in-up">
                    
                    {/* 1. Stats Overview Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition duration-500">
                                <FileText size={100} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm"><FileText size={24} /></div>
                                </div>
                                <p className="text-blue-100 text-sm font-medium mb-1">Artikel Terpublikasi</p>
                                <p className="text-4xl md:text-5xl font-extrabold">{newsData.length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-navy-700 relative overflow-hidden group">
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-yellow-50 dark:bg-yellow-900/20 rounded-full group-hover:scale-125 transition duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl"><AlertCircle size={24} /></div>
                                    <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-200">Pending</span>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Laporan Masuk</p>
                                <p className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">{tickets.filter(t => t.status === 'pending').length}</p>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-navy-700 relative overflow-hidden group sm:col-span-2 lg:col-span-1">
                            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-full group-hover:scale-125 transition duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><CheckSquare size={24} /></div>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">Klarifikasi Fakta</p>
                                <p className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">{newsData.filter(n => n.status === NewsStatus.FAKTA).length}</p>
                            </div>
                        </div>
                    </div>

                    {/* 2. Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Bar Chart: Kategori Laporan */}
                        <div className="lg:col-span-2 bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-navy-700">
                             <h3 className="font-bold text-lg text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                                <Activity size={20} className="text-blue-600" /> Tren Kategori Laporan Warga
                            </h3>
                            <div className="space-y-5">
                                {categoryStats.data.length > 0 ? categoryStats.data.map((item, idx) => {
                                    const percent = Math.round((item.count / categoryStats.max) * 100);
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
                                                <span className="font-bold text-blue-600 dark:text-blue-400">{item.count}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-navy-900 rounded-full h-3.5 overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full group-hover:bg-blue-500 transition-all duration-700 ease-out relative"
                                                    style={{ width: `${percent}%` }}
                                                >
                                                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-pulse-slow"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="text-center py-10 text-gray-400 text-sm">Belum ada data laporan.</div>
                                )}
                            </div>
                        </div>

                        {/* Donut Chart: Status Berita */}
                        <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-navy-700 flex flex-col items-center justify-center">
                            <h3 className="font-bold text-lg text-navy-900 dark:text-white mb-6 w-full text-left">Distribusi Status</h3>
                            
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                {/* Conic Gradient based on percentages */}
                                {(() => {
                                    const total = newsData.length || 1;
                                    const pHoax = (statusStats[NewsStatus.HOAX] / total) * 100;
                                    const pFakta = (statusStats[NewsStatus.FAKTA] / total) * 100;
                                    const pDis = (statusStats[NewsStatus.DISINFORMASI] / total) * 100;
                                    // Remaining is hate speech
                                    
                                    return (
                                        <div 
                                            className="w-full h-full rounded-full"
                                            style={{
                                                background: `conic-gradient(
                                                    #ef4444 0% ${pHoax}%, 
                                                    #22c55e ${pHoax}% ${pHoax + pFakta}%, 
                                                    #eab308 ${pHoax + pFakta}% ${pHoax + pFakta + pDis}%,
                                                    #9333ea ${pHoax + pFakta + pDis}% 100%
                                                )`
                                            }}
                                        ></div>
                                    )
                                })()}
                                {/* Inner Circle for Donut Effect */}
                                <div className="absolute w-32 h-32 bg-white dark:bg-navy-800 rounded-full flex flex-col items-center justify-center shadow-inner">
                                     <span className="text-3xl font-bold text-gray-800 dark:text-white">{newsData.length}</span>
                                     <span className="text-xs text-gray-500 uppercase font-bold">Total Data</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-8 w-full text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-300">Hoaks</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-300">Fakta</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-300">Disinformasi</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
                                    <span className="text-gray-600 dark:text-gray-300">Hate Speech</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. Recent Activity List */}
                    <div className="bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-lg border border-gray-100 dark:border-navy-700">
                        <h3 className="font-bold text-lg text-navy-900 dark:text-white mb-6">Aktivitas Terbaru Sistem</h3>
                        <div className="space-y-4">
                            {/* Combine news and tickets, sort by date desc, take 5 */}
                            {(() => {
                                const activities: ActivityItem[] = [
                                    ...newsData.map(n => ({ 
                                        type: 'news' as const, 
                                        date: n.date, 
                                        sortDate: n.date, 
                                        title: n.title, 
                                        status: n.status, 
                                        id: n.id 
                                    })),
                                    ...tickets.map(t => ({ 
                                        type: 'ticket' as const, 
                                        date: getFormattedTicketDate(t), 
                                        sortDate: t.submissionDate, 
                                        title: t.reportData.category, 
                                        status: t.status, 
                                        id: t.id, 
                                        reporter: t.reportData.name 
                                    }))
                                ];

                                return activities.sort((a, b) => {
                                    const dateA = new Date(a.sortDate).getTime();
                                    const dateB = new Date(b.sortDate).getTime();
                                    return dateB - dateA;
                                })
                                .slice(0, 5)
                                .map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-700 hover:bg-blue-50 dark:hover:bg-navy-800 transition">
                                        <div className={`p-3 rounded-full ${item.type === 'news' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {item.type === 'news' ? <FileText size={18} /> : <TicketIcon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate">
                                                {item.type === 'news' ? `Berita Dipublish: ${item.title}` : `Laporan Baru dari ${item.reporter}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                    item.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : 
                                                    item.status === NewsStatus.HOAX ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'
                                                }`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10}/> {item.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                </div>
            )}

            {/* ... (REST OF THE FILE REMAINS UNCHANGED FOR TICKETS, NEWS, SETTINGS TAB) ... */}
            {/* Note: For brevity in this update, I'm only fixing the 'Recent Activity' part above inside AdminDashboard to prevent crashes. The rest of the file logic is preserved by the user's existing code unless they request further changes. */}
            
            {/* CONTENT: TICKETS */}
            {activeTab === 'tickets' && (
                <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-sm border border-gray-100 dark:border-navy-700 overflow-hidden animate-fade-in-up flex flex-col relative min-h-[60vh]">
                     {/* NEW: HEADER / BULK ACTION (Proportional Layout) */}
                     <div className="p-5 border-b border-gray-100 dark:border-navy-700 bg-white dark:bg-navy-800 sticky top-0 z-10">
                        {selectedTicketIds.length > 0 ? (
                            <div className="flex items-center justify-between bg-blue-50 dark:bg-navy-900/80 px-4 py-3 rounded-xl animate-fade-in gap-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap">
                                        {selectedTicketIds.length} Dipilih
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-300 font-medium hidden sm:inline">Tindakan Masal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={initiateBulkDeleteTickets}
                                        className="flex items-center justify-center gap-2 px-4 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-lg font-bold text-sm transition"
                                    >
                                        <Trash2 size={16} /> <span className="hidden sm:inline">Hapus</span>
                                    </button>
                                    <button 
                                        onClick={() => setSelectedTicketIds([])}
                                        className="p-1.5 rounded-lg bg-gray-200 dark:bg-navy-700 text-gray-500 hover:bg-gray-300 transition"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-navy-900 px-3 py-1.5 rounded-lg">
                                    <Filter size={16} />
                                    <span className="text-xs font-bold">Menampilkan {paginatedTickets.length} dari {tickets.length} data</span>
                                </div>
                            </div>
                        )}
                     </div>

                     <div className="overflow-x-auto w-full custom-scrollbar">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-gray-50 dark:bg-navy-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-wider border-b dark:border-navy-700">
                                <tr>
                                    <th className="px-6 py-4 w-10">
                                         <input 
                                            type="checkbox" 
                                            checked={selectedTicketIds.length === tickets.length && tickets.length > 0}
                                            onChange={toggleSelectAllTickets}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4">ID Tiket</th>
                                    <th className="px-6 py-4">Pelapor</th>
                                    <th className="px-6 py-4">Kategori</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                                {paginatedTickets.length > 0 ? paginatedTickets.map((ticket) => (
                                    <tr key={ticket.id} className={`group transition hover:bg-blue-50 dark:hover:bg-navy-700/50 ${selectedTicketIds.includes(ticket.id) ? 'bg-blue-50 dark:bg-navy-800' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedTicketIds.includes(ticket.id)}
                                                onChange={() => toggleSelectTicket(ticket.id)}
                                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-mono font-bold text-blue-600">{ticket.id}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 dark:text-white">{ticket.reportData?.name}</p>
                                            <p className="text-xs text-gray-500">{ticket.reportData?.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-gray-100 dark:bg-navy-900 px-2.5 py-1 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-navy-700">{ticket.reportData?.category}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${
                                                ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                ticket.status === 'verified' ? 'bg-green-100 text-green-700 border border-green-200' :
                                                ticket.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' :
                                                'bg-blue-100 text-blue-700 border border-blue-200'
                                            }`}>
                                                {ticket.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedTicket(ticket)}
                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-navy-900 px-3 py-1.5 rounded-lg transition hover:bg-blue-100 dark:hover:bg-navy-700"
                                            >
                                                Lihat Detail
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">Belum ada laporan masuk.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                     </div>
                     
                     {/* Pagination */}
                     {tickets.length > ITEMS_PER_PAGE && (
                        <div className="p-4 border-t border-gray-200 dark:border-navy-700 flex justify-center items-center gap-4 mt-auto bg-gray-50/50 dark:bg-navy-900/50">
                            <button 
                                disabled={ticketPage === 1}
                                onClick={() => setTicketPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-50 transition text-gray-600 dark:text-gray-300"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-navy-800 px-3 py-1 rounded-md shadow-sm border border-gray-200 dark:border-navy-700">
                                {ticketPage} / {totalTicketPages}
                            </span>
                            <button 
                                disabled={ticketPage === totalTicketPages}
                                onClick={() => setTicketPage(p => Math.min(totalTicketPages, p + 1))}
                                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-50 transition text-gray-600 dark:text-gray-300"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                     )}
                </div>
            )}

            {/* CONTENT: NEWS MANAGEMENT */}
            {activeTab === 'news' && (
                <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-sm border border-gray-100 dark:border-navy-700 overflow-hidden animate-fade-in-up relative min-h-[60vh] flex flex-col">
                    {!isEditingNews ? (
                        <>
                            {/* NEW: HEADER / BULK ACTION (Proportional Layout) */}
                            <div className="p-5 border-b border-gray-200 dark:border-navy-700 bg-gray-50/50 dark:bg-navy-900/50 sticky top-0 z-10">
                                {selectedNewsIds.length > 0 ? (
                                    /* BULK ACTION HEADER */
                                    <div className="flex items-center justify-between bg-blue-50 dark:bg-navy-900/80 px-4 py-3 rounded-xl animate-fade-in gap-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap">
                                                {selectedNewsIds.length} Dipilih
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-300 font-medium hidden sm:inline">Tindakan Masal</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={initiateBulkDeleteNews}
                                                className="flex items-center justify-center gap-2 px-4 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-lg font-bold text-sm transition"
                                            >
                                                <Trash2 size={16} /> <span className="hidden sm:inline">Hapus</span>
                                            </button>
                                            <button 
                                                onClick={() => setSelectedNewsIds([])}
                                                className="p-1.5 rounded-lg bg-gray-200 dark:bg-navy-700 text-gray-500 hover:bg-gray-300 transition"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* DEFAULT HEADER */
                                    <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
                                        <div className="relative w-full lg:w-96">
                                            <input 
                                                type="text" 
                                                value={newsSearchQuery}
                                                onChange={(e) => { setNewsSearchQuery(e.target.value); setNewsPage(1); }}
                                                placeholder="Cari judul..." 
                                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-navy-600 rounded-xl text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 bg-white dark:bg-navy-800 text-gray-900 dark:text-white transition shadow-sm" 
                                            />
                                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                        </div>
                                        <button 
                                            onClick={handleAddNews}
                                            className="w-full lg:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition"
                                        >
                                            <Plus size={18} /> <span className="lg:inline">Berita Baru</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-x-auto w-full custom-scrollbar">
                                <table className="w-full text-sm text-left whitespace-nowrap">
                                    <thead className="bg-gray-50 dark:bg-navy-900 text-gray-500 dark:text-gray-400 font-bold uppercase text-xs tracking-wider border-b border-gray-200 dark:border-navy-700">
                                        <tr>
                                             <th className="px-6 py-4 w-10">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedNewsIds.length === filteredNews.length && filteredNews.length > 0}
                                                    onChange={toggleSelectAllNews}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800 transition" onClick={() => handleSort('title')}>
                                                <div className="flex items-center gap-1">
                                                    Judul Berita 
                                                    {sortConfig?.key === 'title' ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>
                                                    ) : <ArrowDown size={14} className="opacity-20"/>}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800 transition" onClick={() => handleSort('status')}>
                                                 <div className="flex items-center gap-1">
                                                    Status
                                                    {sortConfig?.key === 'status' ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>
                                                    ) : <ArrowDown size={14} className="opacity-20"/>}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 hidden sm:table-cell cursor-pointer hover:bg-gray-100 dark:hover:bg-navy-800 transition" onClick={() => handleSort('date')}>
                                                <div className="flex items-center gap-1">
                                                    Tanggal
                                                    {sortConfig?.key === 'date' ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>
                                                    ) : <ArrowDown size={14} className="opacity-20"/>}
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
                                        {paginatedNews.length > 0 ? (
                                            paginatedNews.map((item) => (
                                                <tr key={item.id} className={`group transition hover:bg-blue-50 dark:hover:bg-navy-700/50 ${selectedNewsIds.includes(item.id) ? 'bg-blue-50 dark:bg-navy-800' : ''}`}>
                                                     <td className="px-6 py-4">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedNewsIds.includes(item.id)}
                                                            onChange={() => toggleSelectNews(item.id)}
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">
                                                        <div 
                                                            onClick={() => handleEditNews(item)}
                                                            className="font-semibold cursor-pointer hover:text-blue-600 transition line-clamp-2 min-w-[200px] whitespace-normal" 
                                                            title={item.title}
                                                        >
                                                            {item.title}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border tracking-wide uppercase ${
                                                            item.status === NewsStatus.HOAX ? 'bg-red-100 text-red-600 border-red-200' :
                                                            item.status === NewsStatus.FAKTA ? 'bg-green-100 text-green-600 border-green-200' :
                                                            item.status === NewsStatus.HATE_SPEECH ? 'bg-purple-100 text-purple-600 border-purple-200' :
                                                            'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                        }`}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 hidden sm:table-cell text-xs">{item.date}</td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        <button onClick={() => handleEditNews(item)} className="text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-2 rounded-lg transition"><Edit size={16}/></button>
                                                        <button onClick={() => initiateDeleteNews(item.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-2 rounded-lg transition"><Trash2 size={16}/></button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                                    Tidak ada berita ditemukan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                             {/* Pagination Control */}
                             {filteredNews.length > ITEMS_PER_PAGE && (
                                <div className="p-4 border-t border-gray-200 dark:border-navy-700 flex justify-center items-center gap-4 mt-auto bg-gray-50/50 dark:bg-navy-900/50">
                                    <button 
                                        disabled={newsPage === 1}
                                        onClick={() => setNewsPage(p => Math.max(1, p - 1))}
                                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-50 transition text-gray-600 dark:text-gray-300"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-navy-800 px-3 py-1 rounded-md shadow-sm border border-gray-200 dark:border-navy-700">
                                        {newsPage} / {totalNewsPages}
                                    </span>
                                    <button 
                                        disabled={newsPage === totalNewsPages}
                                        onClick={() => setNewsPage(p => Math.min(totalNewsPages, p + 1))}
                                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-navy-700 disabled:opacity-50 transition text-gray-600 dark:text-gray-300"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                             )}
                        </>
                    ) : (
                        // ... (EDIT NEWS FORM REMAINS UNCHANGED) ...
                        <div className="p-4 md:p-8 animate-fade-in">
                            <div className="flex items-center gap-4 mb-8 border-b border-gray-100 dark:border-navy-700 pb-4">
                                <button onClick={() => setIsEditingNews(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-full transition">
                                    <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                                </button>
                                <h3 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">{currentNewsItem.id ? 'Edit Berita' : 'Tambah Berita Baru'}</h3>
                            </div>
                            
                            <form onSubmit={handleSaveNews} className="space-y-6 md:space-y-8 max-w-5xl mx-auto">
                                {/* ... Form Content same as previous ... */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                                    <div className="space-y-6">
                                         <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Judul Utama (Hero)</label>
                                            <textarea 
                                                rows={2} required
                                                value={currentNewsItem.title || ''}
                                                onChange={e => setCurrentNewsItem({...currentNewsItem, title: e.target.value})}
                                                className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition font-bold resize-none"
                                                placeholder="Masukkan judul berita..."
                                            ></textarea>
                                            <p className="text-xs text-gray-500 mt-1">Tekan Enter untuk membuat baris baru pada judul.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                             <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                                <div className="relative">
                                                    <select 
                                                        value={currentNewsItem.status || NewsStatus.HOAX}
                                                        onChange={e => setCurrentNewsItem({...currentNewsItem, status: e.target.value as NewsStatus})}
                                                        className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer appearance-none"
                                                    >
                                                        {Object.values(NewsStatus).map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                        <ChevronRight size={16} className="rotate-90 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>
                                             <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tanggal</label>
                                                <input 
                                                    type="date" required
                                                    value={currentNewsItem.date || ''}
                                                    onChange={e => setCurrentNewsItem({...currentNewsItem, date: e.target.value})}
                                                    className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Konten / Penjelasan</label>
                                            <textarea 
                                                rows={8} required
                                                value={currentNewsItem.content || ''}
                                                onChange={e => setCurrentNewsItem({...currentNewsItem, content: e.target.value})}
                                                className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 resize-none leading-relaxed"
                                                placeholder="Tuliskan detail klarifikasi..."
                                            ></textarea>
                                        </div>
                                         
                                         <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                            <label className="block text-sm font-bold text-blue-800 dark:text-blue-200 mb-3 flex items-center gap-2">
                                                <LinkIcon size={16} /> Link Rujukan / Sumber
                                            </label>
                                            <textarea 
                                                rows={3}
                                                value={currentNewsItem.referenceLink || ''}
                                                onChange={e => setCurrentNewsItem({...currentNewsItem, referenceLink: e.target.value})}
                                                className="w-full px-4 py-3 border border-blue-200 dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500 resize-none text-sm font-mono"
                                                placeholder="https://kominfo.sumselprov.go.id&#10;https://turnbackhoax.id"
                                            ></textarea>
                                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                                                * Masukkan satu link per baris (tekan Enter untuk menambah link baru).
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                         <div className="bg-gray-50 dark:bg-navy-900 p-6 rounded-2xl border border-gray-200 dark:border-navy-700">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Gambar Berita</label>
                                            
                                            <div className="flex gap-2 mb-4 bg-white dark:bg-navy-800 p-1 rounded-lg border border-gray-200 dark:border-navy-700 w-fit shadow-sm">
                                                <button 
                                                    type="button"
                                                    onClick={() => setImageInputType('url')}
                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${imageInputType === 'url' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700'}`}
                                                >
                                                    URL
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setImageInputType('upload')}
                                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition ${imageInputType === 'upload' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700'}`}
                                                >
                                                    Upload
                                                </button>
                                            </div>

                                            {imageInputType === 'url' ? (
                                                <input 
                                                    type="text" 
                                                    value={currentNewsItem.imageUrl || ''}
                                                    onChange={e => {
                                                        setCurrentNewsItem({...currentNewsItem, imageUrl: e.target.value});
                                                        setImagePreview(e.target.value);
                                                    }}
                                                    className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                                    placeholder="https://..."
                                                />
                                            ) : (
                                                <div className="border-2 border-dashed border-blue-300 dark:border-navy-600 rounded-xl p-8 text-center hover:bg-blue-50 dark:hover:bg-navy-800 transition relative cursor-pointer group">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            if(e.target.files?.[0]) {
                                                                setSelectedImageFile(e.target.files[0]);
                                                                setImagePreview(URL.createObjectURL(e.target.files[0]));
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <div className="flex flex-col items-center justify-center gap-2 text-blue-500 group-hover:scale-105 transition">
                                                        <UploadCloud size={32} />
                                                        <span className="text-sm font-bold">Pilih Foto</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(imagePreview) && (
                                                <div className="mt-4 relative rounded-xl overflow-hidden h-48 w-full bg-gray-200 dark:bg-navy-900 border border-gray-200 dark:border-navy-700 shadow-md group">
                                                     <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                     {imageInputType === 'upload' && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => { setSelectedImageFile(null); setImagePreview(null); }}
                                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full backdrop-blur-sm transition opacity-0 group-hover:opacity-100"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                     )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tag / Topik</label>
                                                <input 
                                                    type="text" 
                                                    value={currentNewsItem.tags?.[0] || ''}
                                                    onChange={e => setCurrentNewsItem({...currentNewsItem, tags: [e.target.value]})}
                                                    className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                                    placeholder="Politik, Kesehatan..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Instansi / Sumber</label>
                                                <input 
                                                    type="text" 
                                                    value={currentNewsItem.source || ''}
                                                    onChange={e => setCurrentNewsItem({...currentNewsItem, source: e.target.value})}
                                                    className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl bg-white dark:bg-navy-900 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                                                    placeholder="Diskominfo..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col-reverse sm:flex-row justify-end pt-6 border-t border-gray-100 dark:border-navy-700 gap-4 sticky bottom-0 bg-white dark:bg-navy-900 pb-4 z-10">
                                    <button 
                                        type="button"
                                        onClick={() => setIsEditingNews(false)}
                                        className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-navy-700 transition"
                                    >
                                        Batal
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isUploading}
                                        className={`w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition hover:-translate-y-0.5 ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
                                        {isUploading ? 'Mengupload...' : 'Simpan Berita'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}
        
             {/* CONTENT: SETTINGS */}
            {activeTab === 'settings' && (
                 // ... (SETTINGS CONTENT REMAINS UNCHANGED) ...
                 <div className="bg-white dark:bg-navy-800 p-4 md:p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-navy-700 max-w-4xl mx-auto animate-fade-in-up">
                    <div className="space-y-10 divide-y divide-gray-100 dark:divide-navy-700">
                        
                        <div className="space-y-6">
                            <h3 className="font-bold text-lg md:text-xl text-gray-800 dark:text-white flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ImageIcon size={20} /></div> 
                                Tampilan & Hero Section
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">URL Logo Utama</label>
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-navy-900 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-navy-600 shadow-sm shrink-0">
                                            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-400"/>}
                                        </div>
                                        <input 
                                            type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                                            className="flex-1 w-full px-4 py-2 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">URL Logo Sekunder</label>
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-navy-900 rounded-xl flex items-center justify-center overflow-hidden border border-gray-200 dark:border-navy-600 shadow-sm shrink-0">
                                            {secondaryLogoUrl ? <img src={secondaryLogoUrl} alt="Logo 2" className="w-full h-full object-contain" /> : <ImageIcon className="text-gray-400"/>}
                                        </div>
                                        <input 
                                            type="text" value={secondaryLogoUrl} onChange={(e) => setSecondaryLogoUrl(e.target.value)}
                                            className="flex-1 w-full px-4 py-2 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Judul Utama (Hero)</label>
                                    <textarea 
                                        value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 resize-y min-h-[80px] bg-white dark:bg-navy-900 text-gray-900 dark:text-white font-bold text-lg leading-relaxed"
                                        placeholder="Contoh: Saring Sebelum Sharing"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Tekan <strong>Enter</strong> untuk membuat baris baru pada tampilan Beranda.</p>
                                </div>
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Deskripsi (Sub-judul)</label>
                                     <textarea 
                                        value={heroDesc} onChange={(e) => setHeroDesc(e.target.value)} rows={3}
                                        className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 resize-y min-h-[80px] bg-white dark:bg-navy-900 text-gray-900 dark:text-white leading-relaxed"
                                        placeholder="Deskripsi singkat website..."
                                    />
                                </div>
                                 
                                 {/* HERO BG WITH UPLOAD */}
                                 <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Gambar Background Hero</label>
                                    <div className="flex gap-2 mb-2">
                                        <button 
                                            type="button"
                                            onClick={() => setHeroBgInputType('url')}
                                            className={`px-3 py-1 rounded text-xs font-bold transition ${heroBgInputType === 'url' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                                        >URL</button>
                                        <button 
                                            type="button"
                                            onClick={() => setHeroBgInputType('upload')}
                                            className={`px-3 py-1 rounded text-xs font-bold transition ${heroBgInputType === 'upload' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                                        >Upload</button>
                                    </div>

                                    {heroBgInputType === 'url' ? (
                                        <input 
                                            type="text" value={heroBg} onChange={(e) => setHeroBg(e.target.value)}
                                            className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white" 
                                        />
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <div className="relative flex-1 border-2 border-dashed border-gray-300 dark:border-navy-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-navy-700 transition cursor-pointer">
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        if(e.target.files?.[0]) setHeroBgFile(e.target.files[0]);
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                />
                                                <span className="text-sm text-gray-500">{heroBgFile ? heroBgFile.name : 'Klik untuk upload background'}</span>
                                            </div>
                                        </div>
                                    )}
                                    {heroBg && !heroBgFile && (
                                        <div className="mt-2 h-28 w-full rounded-xl overflow-hidden bg-gray-100">
                                            <img src={heroBg} className="w-full h-full object-cover opacity-50" alt="Hero Preview" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CTA & CONTACT SETTINGS */}
                        <div className="space-y-6 pt-8">
                            <h3 className="font-bold text-lg md:text-xl text-gray-800 dark:text-white flex items-center gap-3">
                                 <div className="p-2 bg-green-100 text-green-600 rounded-lg"><Megaphone size={20} /></div> 
                                CTA / Kontak Kami
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Judul Section CTA</label>
                                    <input 
                                        type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)}
                                        className="w-full px-4 py-2 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">WhatsApp (Format 62...)</label>
                                    <input 
                                        type="text" value={waNumber} onChange={(e) => setWaNumber(e.target.value)}
                                        className="w-full px-4 py-2 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white font-mono" 
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Deskripsi CTA</label>
                                <textarea 
                                    value={ctaDesc} onChange={(e) => setCtaDesc(e.target.value)} rows={3}
                                    className="w-full px-4 py-3 border dark:border-navy-600 rounded-xl outline-none focus:border-blue-500 resize-none bg-white dark:bg-navy-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowFormBtn(!showFormBtn)}>
                                    <div 
                                        className={`w-12 h-6 rounded-full p-1 transition duration-300 ${showFormBtn ? 'bg-blue-600' : 'bg-gray-300 dark:bg-navy-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition duration-300 ${showFormBtn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Tampilkan Tombol Form</label>
                                </div>

                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowWaBtn(!showWaBtn)}>
                                    <div 
                                        className={`w-12 h-6 rounded-full p-1 transition duration-300 ${showWaBtn ? 'bg-green-500' : 'bg-gray-300 dark:bg-navy-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition duration-300 ${showWaBtn ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                    </div>
                                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">Tampilkan Tombol WA</label>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 pt-8">
                            <h3 className="font-bold text-lg md:text-xl text-gray-800 dark:text-white flex items-center gap-3">
                                 <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Share2 size={20} /></div> 
                                Social Media
                            </h3>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {['Twitter', 'Instagram', 'YouTube'].map((social, idx) => (
                                    <div key={social}>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">{social} URL</label>
                                        <input 
                                            type="text" 
                                            value={idx === 0 ? twitter : idx === 1 ? instagram : youtube} 
                                            onChange={(e) => idx === 0 ? setTwitter(e.target.value) : idx === 1 ? setInstagram(e.target.value) : setYoutube(e.target.value)}
                                            className="w-full px-3 py-2 border dark:border-navy-600 rounded-lg text-sm outline-none focus:border-blue-500 bg-white dark:bg-navy-900 text-gray-900 dark:text-white" 
                                        />
                                    </div>
                                ))}
                             </div>
                        </div>

                        <div className="pt-8 flex justify-end">
                            <button 
                                onClick={handleSaveSettings}
                                disabled={isSavingSettings}
                                className="w-full sm:w-auto bg-navy-900 dark:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-800 flex items-center justify-center gap-2 shadow-xl shadow-navy-900/20 hover:-translate-y-1 transition disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSavingSettings ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
                                {isSavingSettings ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TICKET MODAL */}
            {selectedTicket && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 dark:border-navy-700 flex flex-col max-h-[90vh]">
                        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-navy-700 flex justify-between items-center bg-gray-50 dark:bg-navy-900">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Tiket</span>
                                    <h3 className="text-lg font-mono font-bold text-blue-600">{selectedTicket.id}</h3>
                                </div>
                                <p className="text-xs text-gray-500">
                                   Dikirim: <span className="font-medium text-gray-700 dark:text-gray-300">{getFormattedTicketDate(selectedTicket)}</span>
                                </p>
                            </div>
                            <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full">
                                <X size={24} />
                            </button>
                        </div>
                        
                        <div className="p-4 md:p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="bg-blue-50 dark:bg-navy-900/50 p-4 md:p-5 rounded-xl border border-blue-100 dark:border-navy-700">
                                <p className="text-sm font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 tracking-wide">Isi Laporan</p>
                                <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm md:text-base">{selectedTicket.reportData?.content}</p>
                            </div>
                            
                            {selectedTicket.reportData?.evidenceUrl && (
                                 <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Bukti Lampiran</p>
                                    <div className="bg-gray-100 dark:bg-black rounded-xl border border-gray-200 dark:border-navy-700 p-2">
                                        <a href={selectedTicket.reportData.evidenceUrl} target="_blank" rel="noreferrer">
                                            <img 
                                                src={selectedTicket.reportData.evidenceUrl} 
                                                alt="Bukti" 
                                                className="w-full h-48 object-contain rounded-lg hover:opacity-90 transition"
                                            />
                                        </a>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-gray-50 dark:bg-navy-900 rounded-lg">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Pelapor</p>
                                    <p className="font-medium dark:text-white truncate">{selectedTicket.reportData?.name}</p>
                                </div>
                                 <div className="p-3 bg-gray-50 dark:bg-navy-900 rounded-lg">
                                    <p className="text-xs text-gray-500 font-bold uppercase">Kontak</p>
                                    <p className="font-medium dark:text-white truncate">{selectedTicket.reportData?.phone}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-navy-900 border-t border-gray-100 dark:border-navy-700 flex flex-col sm:flex-row flex-wrap gap-3 justify-end sticky bottom-0">
                            <button 
                                onClick={() => handleTicketStatusChange(selectedTicket.id, 'rejected')}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-sm transition"
                            >
                                Tolak
                            </button>
                            <button 
                                onClick={() => handleTicketStatusChange(selectedTicket.id, 'investigating')}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-yellow-200 text-yellow-700 hover:bg-yellow-50 font-bold text-sm transition"
                            >
                                Investigasi
                            </button>
                             <button 
                                onClick={() => handleTicketStatusChange(selectedTicket.id, 'verified')}
                                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-green-200 text-green-700 hover:bg-green-50 font-bold text-sm transition"
                            >
                                Selesai (Valid)
                            </button>
                            <button 
                                onClick={() => handleConvertToNews(selectedTicket)}
                                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5"
                            >
                                <ArrowRightCircle size={16} /> Buat Berita
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CUSTOM DELETE CONFIRMATION MODAL */}
            {deleteConfig.isOpen && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100 dark:border-navy-700 relative overflow-hidden">
                   
                   <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-in shadow-inner">
                      <AlertTriangle size={40} />
                   </div>
                   
                   <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                       {deleteConfig.type?.includes('news') ? 'Hapus Berita?' : 'Hapus Laporan?'}
                   </h3>
                   
                   <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
                      {deleteConfig.type?.includes('bulk') 
                        ? `Anda akan menghapus ${deleteConfig.count} item sekaligus. Tindakan ini tidak dapat dibatalkan.`
                        : `Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan.`
                      }
                   </p>
                   
                   <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setDeleteConfig({ isOpen: false, type: null })}
                        disabled={isDeleting}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-navy-700 dark:text-gray-300 dark:hover:bg-navy-600 transition flex-1"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={executeDelete}
                        disabled={isDeleting}
                        className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/30 transition flex-1 flex items-center justify-center gap-2"
                      >
                        {isDeleting ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18} />}
                        {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                      </button>
                   </div>
                </div>
              </div>
            )}

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border border-gray-100 dark:border-navy-700">
                   <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                      <LogOut size={32} />
                   </div>
                   <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Yakin mau keluar?</h3>
                   <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Akses admin Anda akan diakhiri.</p>
                   <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setShowLogoutConfirm(false)}
                        className="px-6 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-navy-700 transition flex-1"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={onLogout}
                        className="px-6 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition flex-1"
                      >
                        Ya, Keluar
                      </button>
                   </div>
                </div>
              </div>
            )}

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
