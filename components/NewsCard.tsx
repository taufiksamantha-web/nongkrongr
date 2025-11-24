
import React from 'react';
import { NewsItem, NewsStatus } from '../types';
import Badge from './Badge';
import { XCircle, CheckCircle, AlertTriangle, Clock, Tag, Megaphone } from 'lucide-react';
import { optimizeImage } from '../utils/imageHelper';

interface NewsCardProps {
  item: NewsItem;
  onClick?: (item: NewsItem) => void;
  onStatusClick?: (status: NewsStatus) => void;
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

const NewsCard: React.FC<NewsCardProps> = ({ item, onClick, onStatusClick }) => {
  const category = item.tags.length > 0 ? item.tags[0] : 'Umum';
  const formattedDate = formatDateStr(item.date);
  
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click
    if (onStatusClick) onStatusClick(item.status);
  };

  const renderFooter = () => {
    switch (item.status) {
      case NewsStatus.HOAX:
        return (
          <span 
            onClick={handleStatusClick}
            className="text-red-600 dark:text-red-400 text-sm font-bold flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            title="Klik untuk lihat semua Hoaks"
          >
            <XCircle className="w-4 h-4" />
            HOAKS
          </span>
        );
      case NewsStatus.FAKTA:
        return (
          <span 
            onClick={handleStatusClick}
            className="text-green-700 dark:text-green-400 text-sm font-bold flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/40 transition"
             title="Klik untuk lihat semua Fakta"
          >
             <CheckCircle className="w-4 h-4" />
            FAKTA
          </span>
        );
      case NewsStatus.DISINFORMASI:
        return (
          <span 
            onClick={handleStatusClick}
            className="text-yellow-700 dark:text-yellow-400 text-sm font-bold flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition"
             title="Klik untuk lihat semua Disinformasi"
          >
            <AlertTriangle className="w-4 h-4" />
            DISINFORMASI
          </span>
        );
      case NewsStatus.HATE_SPEECH:
        return (
          <span 
            onClick={handleStatusClick}
            className="text-purple-700 dark:text-purple-400 text-sm font-bold flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/20 px-3 py-1.5 rounded-lg w-fit cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
             title="Klik untuk lihat semua Hate Speech"
          >
            <Megaphone className="w-4 h-4" />
            HATE SPEECH
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <article 
      onClick={() => onClick && onClick(item)}
      className="group bg-white dark:bg-navy-800 rounded-2xl border border-gray-100 dark:border-navy-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/10 transition duration-300 overflow-hidden flex flex-col h-full relative top-0 hover:-top-2 cursor-pointer"
    >
      <div className="relative h-52 bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div className="absolute top-4 right-4 z-10" onClick={handleStatusClick}>
            <Badge status={item.status} />
        </div>
        <img 
          src={optimizeImage(item.imageUrl, 500)} // Resize ke lebar 500px + Auto Format
          alt={item.title}
          loading="lazy" 
          width="500"
          height="300"
          className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition duration-300"></div>
      </div>
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 mb-3 space-x-3">
          <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md capitalize text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
            <Tag size={12} />
            {category}
          </span>
          <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
            <Clock size={12} />
            {formattedDate}
          </span>
        </div>
        
        <h3 className="text-xl font-bold text-navy-900 dark:text-white mb-3 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition leading-snug line-clamp-2">
          {item.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 flex-1 line-clamp-3 leading-relaxed">
          {item.content}
        </p>
        
        <div className="border-t border-gray-100 dark:border-navy-700 pt-4 mt-auto">
           {renderFooter()}
        </div>
      </div>
    </article>
  );
};

export default NewsCard;
