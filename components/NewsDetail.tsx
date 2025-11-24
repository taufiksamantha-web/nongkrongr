
import React, { useEffect, useMemo } from 'react';
import { NewsItem, NewsStatus } from '../types';
import Badge from './Badge';
import { ArrowLeft, Calendar, User, Share2, Tag, Search, TrendingUp, Eye, ExternalLink } from 'lucide-react';
import { incrementNewsView } from '../services/dataService';
import { optimizeImage } from '../utils/imageHelper';

interface NewsDetailProps {
  item: NewsItem;
  newsData: NewsItem[]; // Added to compute real stats
  onBack: () => void;
  onSearch: (keyword: string) => void;
  onStatusClick: (status: NewsStatus) => void;
  onIncrementView?: (id: string) => void; 
}

// Helper format tanggal cantik
const formatDateStr = (dateStr: string) => {
    if (!dateStr) return '';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const parts = dateStr.split('-'); // YYYY-MM-DD
    if (parts.length !== 3) return dateStr;
    
    const year = parts[0];
    const month = months[parseInt(parts[1]) - 1];
    const day = parts[2];
    
    return `${day} ${month} ${year}`;
};

const NewsDetail: React.FC<NewsDetailProps> = ({ item, newsData, onBack, onSearch, onStatusClick, onIncrementView }) => {
  
  const formattedDate = formatDateStr(item.date);

  // Increment view count on mount
  useEffect(() => {
    if(item.id) {
        incrementNewsView(item.id);
        if (onIncrementView) {
            onIncrementView(item.id);
        }
    }
  }, [item.id]); 

  // --- REAL-TIME STATS CALCULATION ---
  
  // 1. Calculate Top Categories (from Tags)
  const topTags = useMemo(() => {
      const counts: Record<string, number> = {};
      newsData.forEach(n => {
          n.tags.forEach(t => {
              const tag = t.trim();
              if (tag !== 'Umum' && tag !== 'Sumsel') {
                  counts[tag] = (counts[tag] || 0) + 1;
              }
          });
      });
      return Object.entries(counts)
          .sort((a, b) => b[1] - a[1]) // Sort by count desc
          .slice(0, 6) // Take top 6
          .map(([keyword, count]) => ({ keyword, count }));
  }, [newsData]);

  // 2. Extract All Unique Categories/Tags for Filter Widget
  const allCategories = useMemo(() => {
      const tags = new Set<string>();
      newsData.forEach(n => n.tags.forEach(t => tags.add(t.trim())));
      return Array.from(tags).sort();
  }, [newsData]);


  const handleShare = () => {
    // Generate clean URL from base origin
    // Ensures no double query params like ?page=detail&id=123&page=detail
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?page=detail&id=${item.id}`;

    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: item.content.substring(0, 100) + '...',
        url: shareUrl,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link berita berhasil disalin ke clipboard! Silakan bagikan.');
    }
  };

  // Parse reference links (handle various newline formats)
  const parsedLinks = item.referenceLink 
    ? item.referenceLink.split(/\r?\n/).filter(l => l.trim() !== '') 
    : [];

  return (
    <div className="relative w-full min-h-screen">
       {/* Dot Pattern Overlay - Made very subtle */}
       <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08] pointer-events-none z-0"
            style={{ backgroundImage: 'radial-gradient(#1e3a8a 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}>
       </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-fade-in-up relative z-10">
        
        {/* Breadcrumb & Back */}
        <div className="flex items-center gap-4 mb-8">
            <button 
            onClick={onBack}
            className="group flex items-center gap-2 text-gray-500 hover:text-blue-900 dark:text-gray-400 dark:hover:text-blue-400 transition"
            >
            <div className="p-2 rounded-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 group-hover:border-blue-300 shadow-sm">
                <ArrowLeft size={20} />
            </div>
            <span className="font-medium">Kembali ke Daftar</span>
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* LEFT COLUMN: MAIN CONTENT (8 cols) */}
            <div className="lg:col-span-8">
            <article className="bg-white dark:bg-navy-800 rounded-3xl shadow-xl border border-gray-100 dark:border-navy-700 overflow-hidden">
                
                {/* Hero Image */}
                <div className="relative h-64 sm:h-[500px] w-full">
                <img 
                    src={optimizeImage(item.imageUrl, 1200)} // Optimasi lebar 1200px
                    alt={item.title} 
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                </div>

                {/* Content Body */}
                <div className="p-6 sm:p-10">
                
                {/* Badge - Moved here for responsiveness */}
                <div className="mb-4 cursor-pointer inline-block transform hover:scale-105 transition" onClick={() => onStatusClick(item.status)}>
                    <Badge status={item.status} className="text-xs sm:text-sm px-4 py-2" />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
                    {item.title}
                </h1>

                {/* Meta Data */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-navy-700 pb-6">
                    <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    <span>{formattedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-500" />
                    <span>{item.source || 'Tim CekFakta'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Eye size={16} className="text-blue-500" />
                        <span>Dilihat {(item.viewCount || 0).toLocaleString()} kali</span>
                    </div>
                    <div className="ml-auto">
                        <button onClick={handleShare} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 dark:bg-navy-900 px-3 py-1.5 rounded-lg transition">
                            <Share2 size={16} /> Bagikan
                        </button>
                    </div>
                </div>

                <div className="prose prose-lg prose-blue dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                    {item.content}
                    <p className="mt-8 font-bold text-sm bg-blue-50 dark:bg-navy-900/50 p-4 rounded-xl border-l-4 border-blue-500 text-gray-600 dark:text-gray-400 italic">
                        "Saring sebelum sharing. Pastikan informasi yang Anda terima berasal dari sumber terpercaya."
                    </p>
                </div>
                
                {/* REFERENCE LINK SECTION */}
                {parsedLinks.length > 0 && (
                    <div className="mt-8 space-y-3">
                        {parsedLinks.map((link, idx) => (
                            <a 
                                key={idx}
                                href={link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-navy-900 border border-gray-200 dark:border-navy-600 hover:bg-blue-50 dark:hover:bg-navy-800 hover:border-blue-200 transition"
                            >
                                <div className="bg-white dark:bg-navy-700 p-2 rounded-lg text-blue-600 shadow-sm group-hover:scale-110 transition">
                                    <ExternalLink size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-0.5">Sumber Referensi {parsedLinks.length > 1 ? idx + 1 : ''}</p>
                                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">{link}</p>
                                </div>
                                <ArrowLeft className="rotate-180 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition" size={18} />
                            </a>
                        ))}
                    </div>
                )}

                {/* Tags */}
                <div className="mt-8 flex items-center gap-2 flex-wrap">
                    <Tag size={18} className="text-gray-400" />
                    {item.tags.map((tag, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-navy-900 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition cursor-pointer" onClick={() => onSearch(tag)}>
                            #{tag}
                        </span>
                    ))}
                </div>

                </div>
            </article>
            </div>

            {/* RIGHT COLUMN: SIDEBAR (4 cols) */}
            <div className="lg:col-span-4 space-y-8">
                
                {/* Search Box Widget */}
                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-navy-700">
                    <h3 className="font-bold text-lg mb-4 text-navy-900 dark:text-white flex items-center gap-2">
                        <Search size={20} className="text-blue-600" /> Cari Berita
                    </h3>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Kata kunci..."
                            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 dark:border-navy-600 bg-gray-50 dark:bg-navy-900 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') onSearch(e.currentTarget.value);
                            }}
                        />
                        <Search size={18} className="absolute right-3 top-3.5 text-gray-400" />
                    </div>
                </div>

                {/* REAL Popular Searches Widget */}
                <div className="bg-white dark:bg-navy-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-navy-700">
                    <h3 className="font-bold text-lg mb-4 text-navy-900 dark:text-white flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" /> Topik Hangat
                    </h3>
                    <div className="flex flex-col gap-3">
                        {topTags.length > 0 ? topTags.map((stat, idx) => (
                            <button 
                                key={idx}
                                onClick={() => onSearch(stat.keyword)}
                                className="flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-navy-900 transition group text-left"
                            >
                                <span className="text-gray-600 dark:text-gray-300 font-medium group-hover:text-blue-700 dark:group-hover:text-blue-400 capitalize">{stat.keyword}</span>
                                <span className="text-xs bg-gray-100 dark:bg-navy-700 px-2 py-1 rounded text-gray-500 dark:text-gray-400">{stat.count}</span>
                            </button>
                        )) : (
                            <p className="text-sm text-gray-400 text-center py-4">Belum ada data topik populer.</p>
                        )}
                    </div>
                </div>

                {/* All Categories Widget */}
                <div className="bg-gradient-to-br from-blue-900 to-navy-900 p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Tag size={20} className="text-blue-300" /> Indeks Kategori
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {allCategories.length > 0 ? allCategories.map((cat, idx) => (
                            <span 
                                key={idx} 
                                onClick={() => onSearch(cat)}
                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-sm cursor-pointer transition capitalize"
                            >
                                {cat}
                            </span>
                        )) : (
                            <span className="text-sm opacity-70">Belum ada kategori.</span>
                        )}
                    </div>
                </div>

            </div>

        </div>
        </div>
    </div>
  );
};

export default NewsDetail;
