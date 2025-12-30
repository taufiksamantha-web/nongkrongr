
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, X, ChevronRight, Utensils, Coffee, Pizza, IceCream, MessageCircle, CreditCard, CheckCircle2, Loader2, ArrowRight, Trash2, Sparkles, Flame, Info } from 'lucide-react';
import { MenuItem, OrderItem, Order, Cafe, User } from '../types';
import { fetchMenuItems } from '../services/dataService';
import { Button, LazyImage, Modal } from './UI';
import { useSession } from './SessionContext';

interface MenuOrderingProps {
    cafe: Cafe;
    user: User | null;
    onLoginReq: () => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const MenuOrdering: React.FC<MenuOrderingProps> = ({ cafe, user, onLoginReq, addToast }) => {
    const { addToGlobalCart, removeFromGlobalCart, cart } = useSession();
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('Semua');

    // Get items specifically for this cafe from global cart
    const cafeCartItems = useMemo(() => cart[cafe.id]?.items || [], [cart, cafe.id]);
    const totalAmount = cafeCartItems.reduce((acc, curr) => acc + (curr.price_at_order * curr.quantity), 0);
    const totalQty = cafeCartItems.reduce((acc, curr) => acc + curr.quantity, 0);

    useEffect(() => {
        const loadMenu = async () => {
            setIsLoading(true);
            try {
                const items = await fetchMenuItems(cafe.id);
                setMenuItems(items);
            } catch (e) {
                addToast('error', 'Gagal memuat menu');
            } finally {
                setIsLoading(false);
            }
        };
        loadMenu();
    }, [cafe.id]);

    const categories = useMemo(() => {
        const cats = Array.from(new Set(menuItems.map(m => m.category)));
        return ['Semua', ...cats];
    }, [menuItems]);

    const filteredItems = useMemo(() => {
        if (activeCategory === 'Semua') return menuItems;
        return menuItems.filter(m => m.category === activeCategory);
    }, [menuItems, activeCategory]);

    if (isLoading) return (
        <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-orange-500" size={32} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Meracik Menu Terbaik...</p>
        </div>
    );

    if (menuItems.length === 0) return (
        <div className="py-24 text-center opacity-40 flex flex-col items-center px-10">
            <Utensils size={56} strokeWidth={1.5} className="text-gray-300 mb-6" />
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Menu Belum Tersedia</h3>
            <p className="text-xs mt-2 font-medium">Pemilik kafe belum mengunggah daftar menu digital.</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* 1. STYLISH CATEGORY CHIPS */}
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 px-1">
                {categories.map(cat => (
                    <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        className={`
                            px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap border
                            ${activeCategory === cat 
                                ? 'bg-gray-900 text-white border-gray-900 shadow-xl shadow-black/10 scale-105' 
                                : 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-gray-100 dark:border-slate-700 hover:bg-gray-50'
                            }
                        `}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* 2. PREMIUM MENU GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
                {filteredItems.map((item, idx) => {
                    const cartItem = cafeCartItems.find(i => i.menu_item_id === item.id);
                    const qty = cartItem?.quantity || 0;

                    return (
                        <div 
                            key={item.id} 
                            className={`
                                group relative bg-white dark:bg-slate-800/40 p-4 rounded-[2.2rem] border border-gray-100 dark:border-slate-800 flex gap-5 transition-all duration-300
                                ${!item.is_available ? 'opacity-50 grayscale' : 'hover:shadow-2xl hover:border-orange-100 dark:hover:border-orange-900/30 hover:-translate-y-0.5'}
                            `}
                        >
                            {/* Image Container */}
                            <div className="w-28 h-28 md:w-32 md:h-32 rounded-[1.8rem] overflow-hidden shrink-0 bg-gray-50 dark:bg-slate-900 shadow-inner relative">
                                <LazyImage src={item.image_url || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.name} />
                                {idx < 2 && item.is_available && (
                                    <div className="absolute top-2 left-2 bg-orange-500 text-white p-1.5 rounded-xl shadow-lg border border-white/20">
                                        <Flame size={12} fill="currentColor" />
                                    </div>
                                )}
                            </div>

                            {/* Content Container */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h4 className="font-black text-gray-900 dark:text-white text-base md:text-lg leading-tight truncate">{item.name}</h4>
                                    </div>
                                    <p className="text-[11px] text-gray-400 dark:text-slate-500 font-medium line-clamp-2 leading-relaxed mb-2">
                                        {item.description || 'Pilihan terbaik dari dapur kami.'}
                                    </p>
                                </div>
                                
                                <div className="flex justify-between items-center mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest leading-none mb-1">Harga</span>
                                        <span className="font-black text-orange-600 dark:text-orange-400 text-lg leading-none">
                                            Rp {parseInt(item.price).toLocaleString()}
                                        </span>
                                    </div>

                                    {!item.is_available ? (
                                        <span className="text-[9px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-slate-700">Habis</span>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            {qty > 0 && (
                                                <>
                                                    <button 
                                                        onClick={() => removeFromGlobalCart(item.id, cafe.id)}
                                                        className="w-10 h-10 border-2 border-gray-100 dark:border-slate-700 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    >
                                                        <Minus size={18} strokeWidth={3} />
                                                    </button>
                                                    <span className="font-black text-lg text-gray-900 dark:text-white w-6 text-center">{qty}</span>
                                                </>
                                            )}
                                            <button 
                                                onClick={() => addToGlobalCart(item, cafe)}
                                                className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-[1.2rem] flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-90 transition-all border-2 border-white dark:border-slate-800"
                                            >
                                                <Plus size={20} strokeWidth={3} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Hint text if items added */}
            {totalQty > 0 && (
                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2">
                    <div className="px-6 py-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl flex items-center gap-3">
                        <Sparkles size={16} className="text-orange-500" />
                        <p className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                            {totalQty} item di keranjang kafe ini. Cek keranjang global di pojok layar!
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
