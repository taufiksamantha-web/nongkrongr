
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { X, Search, Loader2, Coffee, Flame, Zap, Star, MapPin, Database, ArrowRight, History as HistoryIcon, Trash2 } from 'lucide-react';
import { Cafe } from '../types';
import { LazyImage } from './UI';
import { getOptimizedImageUrl, formatRating } from '../constants';
import { SafeStorage } from '../lib/supabase';

interface MobileSearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    searchResults: Cafe[];
    isSearching: boolean;
    onCafeClick: (cafe: Cafe) => void;
    onSubmit: (q: string) => void; 
    selectedCityName: string;
}

const DEFAULT_HINTS = ["Kopi Susu", "Aesthetic", "Work from Cafe", "24 Jam", "Live Music", "Rooftop", "Hemat", "Outdoor"];
const HISTORY_KEY = 'nongkrongr_search_history';
const TRENDS_KEY = 'nongkrongr_local_trends';

export const MobileSearchOverlay: React.FC<MobileSearchOverlayProps> = ({
    isOpen, onClose, searchQuery, setSearchQuery, searchResults, isSearching, onCafeClick, onSubmit, selectedCityName
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [localTrends, setLocalTrends] = useState<string[]>([]);

    // Load history and trends from storage
    useEffect(() => {
        const savedHistory = SafeStorage.getItem(HISTORY_KEY);
        if (savedHistory) setHistory(JSON.parse(savedHistory));

        const savedTrends = SafeStorage.getItem(TRENDS_KEY);
        if (savedTrends) {
            const trendsMap = JSON.parse(savedTrends) as Record<string, number>;
            const sorted = Object.entries(trendsMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(item => item[0]);
            setLocalTrends(sorted);
        }
    }, [isOpen]);

    const saveSearch = (query: string) => {
        const q = query.trim();
        if (!q) return;

        // Save to History
        const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 10);
        setHistory(newHistory);
        SafeStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));

        // Save to Local Trends (Hits Counter)
        const savedTrends = SafeStorage.getItem(TRENDS_KEY);
        const trendsMap = savedTrends ? JSON.parse(savedTrends) : {};
        trendsMap[q] = (trendsMap[q] || 0) + 1;
        SafeStorage.setItem(TRENDS_KEY, JSON.stringify(trendsMap));
    };

    const clearHistory = () => {
        setHistory([]);
        SafeStorage.removeItem(HISTORY_KEY);
    };

    const deleteHistoryItem = (e: React.MouseEvent, item: string) => {
        e.stopPropagation();
        const newHistory = history.filter(h => h !== item);
        setHistory(newHistory);
        SafeStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
    };

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
            saveSearch(searchQuery);
            onSubmit(searchQuery.trim());
        }
    };

    const dynamicHints = useMemo(() => {
        // Combine default hints with local dynamic trends, removing duplicates
        return Array.from(new Set([...localTrends, ...DEFAULT_HINTS])).slice(0, 10);
    }, [localTrends]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-[#0F172A] flex flex-col animate-in fade-in duration-200">
            {/* Search Input Area */}
            <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3 pt-[calc(env(safe-area-inset-top)+1rem)] shrink-0">
                <button 
                    onClick={onClose} 
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <X size={24} className="text-gray-600 dark:text-gray-300"/>
                </button>
                <div className="flex-1 relative flex items-center gap-2">
                    <div className="relative flex-1">
                        <input 
                            ref={inputRef} 
                            type="text" 
                            placeholder="Cari kafe, alamat, atau menu..." 
                            className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-100 dark:bg-slate-800 outline-none text-base font-medium text-gray-900 dark:text-white" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        {searchQuery ? (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                                <X size={20} />
                            </button>
                        ) : isSearching ? (
                            <Loader2 size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" />
                        ) : (
                            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-orange-500" />
                        )}
                    </div>
                    {searchQuery.trim().length >= 2 && (
                        <button 
                            onClick={() => { saveSearch(searchQuery); onSubmit(searchQuery.trim()); }}
                            className="bg-orange-500 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-1.5 active:scale-95 transition-all animate-in slide-in-from-right-2"
                        >
                            Semua <ArrowRight size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {searchQuery.length >= 2 ? (
                    <div className="space-y-2">
                        {searchResults.length > 0 ? searchResults.map((cafe) => (
                            <div 
                                key={cafe.id} 
                                className="flex items-center gap-4 p-4 rounded-2xl active:bg-gray-50 dark:active:bg-slate-800 transition-colors cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0" 
                                onClick={() => { onCafeClick(cafe); onClose(); }}
                            >
                                <div className="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden shrink-0 shadow-sm">
                                    <LazyImage src={getOptimizedImageUrl(cafe.image, 200)} className="w-full h-full object-cover" alt={cafe.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="font-bold text-gray-900 dark:text-white text-base truncate pr-2">{cafe.name}</h4>
                                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded shrink-0">
                                            <Star size={10} fill="currentColor"/> {formatRating(cafe.rating)}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                                        <MapPin size={10}/> {cafe.address}
                                    </p>
                                    {cafe.dist !== undefined && (
                                        <p className="text-[10px] font-bold text-blue-500 mt-1 tracking-tight">{cafe.dist.toFixed(1)} km dari posisi kamu</p>
                                    )}
                                </div>
                            </div>
                        )) : !isSearching && (
                            <div className="text-center py-24 text-gray-400">
                                <Coffee size={40} className="mx-auto mb-4 opacity-30"/>
                                <p className="text-sm font-bold">Tidak ada hasil untuk "{searchQuery}"</p>
                                <p className="text-xs mt-2 font-medium">Tekan "Semua" untuk melihat hasil dari seluruh wilayah.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 px-1">
                        
                        {/* 1. SEARCH HISTORY */}
                        {history.length > 0 && (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-4 ml-1">
                                    <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <HistoryIcon size={14} /> Terakhir dicari
                                    </p>
                                    <button onClick={clearHistory} className="text-[10px] font-black text-red-500 uppercase tracking-tight hover:underline">Hapus Semua</button>
                                </div>
                                <div className="space-y-1">
                                    {history.map(item => (
                                        <div 
                                            key={item} 
                                            onClick={() => { saveSearch(item); onSubmit(item); }}
                                            className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <HistoryIcon size={16} className="text-gray-300" />
                                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{item}</span>
                                            </div>
                                            <button onClick={(e) => deleteHistoryItem(e, item)} className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 2. DYNAMIC TRENDS & HINTS */}
                        <div className="mb-8">
                            <p className="text-xs font-black text-gray-400 dark:text-slate-500 mb-4 ml-1 flex items-center gap-2 uppercase tracking-widest">
                                <Flame size={14} className="text-orange-500" /> Paling Banyak Dicari
                            </p>
                            <div className="flex flex-wrap gap-2.5">
                                {dynamicHints.map(hint => (
                                    <button 
                                        key={hint} 
                                        onClick={() => { saveSearch(hint); onSubmit(hint); }}
                                        className={`
                                            px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border
                                            ${localTrends.includes(hint) 
                                                ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30 text-orange-600 dark:text-orange-400' 
                                                : 'bg-gray-50 dark:bg-slate-800 border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-orange-600'
                                            }
                                        `}
                                    >
                                        {hint}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
