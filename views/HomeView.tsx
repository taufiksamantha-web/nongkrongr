
import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import { Star, MapPin, Search as SearchIcon, Flame, Coffee, ArrowRight, Sparkles, ChevronRight, Radio, Heart, Zap, Camera, Laptop, Music, Users, Moon, Sun, Utensils, Compass, Globe, MapPinned, TrendingUp, History, MessageCircle, Loader2, Smartphone, Download, PlusSquare, Share, Share2, X as CloseIcon, SmartphoneIcon } from 'lucide-react';
import { Cafe, HeroConfig, CollectionItem, AppNotification, User } from '../types';
import { getOptimizedImageUrl, formatRating, SEARCH_PLACEHOLDERS, LOGO_HOME_URL, getCafeStatus } from '../constants';
import { LazyImage, Badge, VerifiedBadge, Button } from '../components/UI';
import { SEO } from '../components/SEO';
import { Capacitor } from '@capacitor/core';

// --- SHARED COMPONENTS ---
const MiniStory: React.FC<{ icon: any, label: string, color: string, onClick: () => void }> = ({ icon: Icon, label, color, onClick }) => (
    <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group active:scale-90 transition-all" onClick={onClick}>
        <div className={`w-14 h-14 rounded-2xl p-[3px] bg-gradient-to-tr ${color} shadow-lg shadow-black/5`}>
            <div className="w-full h-full rounded-[0.85rem] bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${color} text-white`}>
                    <Icon size={24} strokeWidth={2} />
                </div>
            </div>
        </div>
        <span className="text-[10px] font-bold text-gray-800 dark:text-gray-300 tracking-tight text-center leading-tight w-16 line-clamp-1">{label}</span>
    </div>
);

const ShortcutCardDesktop: React.FC<{ icon: any, label: string, color: string, onClick: () => void, description?: string }> = ({ icon: Icon, label, color, onClick, description }) => (
    <div 
        onClick={onClick}
        className="hidden md:flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
    >
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
            <Icon size={24} />
        </div>
        <div className="min-w-0">
            <h4 className="font-black text-gray-900 dark:text-white text-xs uppercase tracking-tight truncate">{label}</h4>
            {description && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 truncate">{description}</p>}
        </div>
    </div>
);

const HomeCafeCard = React.memo(({ cafe, onClick }: { cafe: Cafe, onClick: (c: Cafe) => void }) => {
    const optimizedImg = useMemo(() => getOptimizedImageUrl(cafe.image, 400), [cafe.image]);
    const rating = useMemo(() => formatRating(cafe.rating), [cafe.rating]);
    const address = useMemo(() => cafe.address.split(',')[0], [cafe.address]);
    const status = useMemo(() => getCafeStatus(cafe.openingHours), [cafe.openingHours]);
    const shouldShowDistance = cafe.dist !== undefined && cafe.dist !== null && cafe.dist < 9999;

    return (
        <div 
            className="optimize-scrolling gpu-accelerated group relative aspect-[4/5] bg-slate-100 dark:bg-slate-800 rounded-[2.2rem] md:rounded-[2.5rem] overflow-hidden shadow-lg transition-all duration-300 cursor-pointer border border-black/5 active:scale-[0.97] will-change-transform"
            onClick={() => onClick(cafe)}
        >
            <LazyImage 
                src={optimizedImg} 
                alt={cafe.name} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 md:group-hover:opacity-100 transition-opacity"></div>
            
            <div className="absolute top-3 right-3 md:top-4 md:right-4 bg-white border border-gray-100 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg md:rounded-xl font-black flex items-center gap-1 z-20 text-black text-[10px] shadow-xl">
                <Star size={10} fill="#F97316" className="text-orange-500" /> {rating}
            </div>

            {shouldShowDistance && (
                <div className="absolute top-3 left-3 md:top-4 md:left-4 bg-green-600 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg md:rounded-xl font-black flex items-center gap-1 z-20 text-[9px] text-white shadow-xl">
                    <MapPin size={10} className="text-white" /> ~{Number(cafe.dist).toFixed(1)} km
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 z-10">
                <div className="flex items-center gap-1.5 mb-1">
                   <h3 className="font-bold text-sm md:text-lg text-white leading-tight line-clamp-1 transition-colors uppercase tracking-tight">
                        {cafe.name}
                    </h3>
                    {cafe.is_verified && <VerifiedBadge size={12} />}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <div className="flex items-center gap-1 text-white/60 text-[9px] md:text-[10px] font-medium truncate flex-1">
                        <MapPin size={9} className="text-orange-500 shrink-0" />
                        <span className="truncate tracking-wide uppercase">{address}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${status.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className={`text-[8px] font-bold uppercase tracking-tighter ${status.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                            {status.isOpen ? 'Buka' : 'Tutup'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});
HomeCafeCard.displayName = "HomeCafeCard";

const PWAInstallSection = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (Capacitor.isNativePlatform()) return;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        if (isStandalone) return;

        const ua = window.navigator.userAgent.toLowerCase();
        const isMobile = /iphone|ipad|ipod|android/.test(ua);
        const isIos = /iphone|ipad|ipod/.test(ua);

        if (isIos) setPlatform('ios');
        else if (/android/.test(ua)) setPlatform('android');

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const timer = setTimeout(() => {
            if (isMobile) setIsVisible(true);
        }, 3000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            clearTimeout(timer);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("Gunakan menu browser 'Tambahkan ke Layar Utama' (Add to Home Screen) untuk memasang Nongkrongr!");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    return (
        <section className="mt-8 md:mt-16 animate-in slide-in-from-bottom-6 duration-700 px-1">
            <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-[0_30px_60px_-15px_rgba(37,99,235,0.4)] border border-white/10 group">
                
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors z-20"
                >
                    <CloseIcon size={18} />
                </button>

                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-400/30 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-blue-400/20 rounded-full blur-2xl"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                    <div className="flex items-center gap-6 text-center lg:text-left flex-col lg:flex-row max-w-2xl">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-white/10 backdrop-blur-2xl rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl border border-white/20 rotate-3 group-hover:rotate-0 transition-all duration-500">
                            <Smartphone size={32} className="text-white drop-shadow-lg" />
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] mb-2 md:mb-3 border border-white/10">
                                <Sparkles size={12} className="text-yellow-400" /> Versi Aplikasi Cepat
                            </div>
                            <h3 className="text-xl md:text-4xl font-black mb-2 md:mb-3 tracking-tighter leading-none uppercase italic">Akses Instan Nongkrongr! ⚡</h3>
                            <p className="text-indigo-100/70 text-xs md:text-lg font-medium leading-relaxed">
                                Pasang di layar utama HP kamu. <span className="text-white font-black underline decoration-indigo-400 underline-offset-4">Lebih ringan & kencang</span>.
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 w-full lg:w-auto">
                        {platform === 'ios' ? (
                            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/20 shadow-inner">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-center mb-4 text-indigo-200">Cara Pasang di iPhone:</p>
                                <div className="flex items-center justify-center gap-6">
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg"><Share size={20}/></div>
                                        <span className="text-[8px] font-black uppercase">Share</span>
                                    </div>
                                    <div className="w-4 h-px bg-white/20"></div>
                                    <div className="flex flex-col items-center gap-1.5">
                                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg"><PlusSquare size={20}/></div>
                                        <span className="text-[8px] font-black uppercase">Tambah</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleInstallClick}
                                className="w-full lg:w-auto px-10 py-5 md:px-12 md:py-6 bg-white text-indigo-700 rounded-[1.5rem] md:rounded-[1.8rem] font-black text-xs md:text-base uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 md:gap-4 group/btn"
                            >
                                <Zap size={20} fill="currentColor" className="group-hover/btn:animate-bounce" /> PASANG SEKARANG
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

interface HomeViewProps {
    cafes: Cafe[];
    collections: CollectionItem[];
    onCafeClick: (cafe: Cafe) => void;
    onCollectionClick: (id: string) => void;
    userLocation: { lat: number, lng: number } | null;
    heroConfig: HeroConfig;
    user: User | null;
    notifications: AppNotification[];
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    selectedCityName: string;
    onExploreClick: (filter: string | null, title: string) => void;
    onSearchClick: () => void;
    onCommunityClick: (tab: 'feed' | 'nearby') => void;
    onPromoClick: () => void;
    onMapClick: () => void;
    stats?: { promoCount: number, openCount: number }; 
}

export const HomeView: React.FC<HomeViewProps> = ({
    cafes, collections, onCafeClick, onCollectionClick, userLocation, heroConfig, user, selectedCityName, onExploreClick, onSearchClick, onCommunityClick, onPromoClick, onMapClick, stats
}) => {
    const isNativeApp = Capacitor.isNativePlatform();

    const featuredCafe = useMemo(() => {
        if (!cafes || cafes.length === 0) return null;
        return [...cafes].sort((a, b) => {
            const scoreA = (a.rating * 10) + (a.reviewsCount || 0);
            const scoreB = (b.rating * 10) + (b.reviewsCount || 0);
            return scoreB - scoreA;
        })[0];
    }, [cafes]);

    const shortcuts = [
        { id: 'promo', icon: Zap, label: "Promo", description: "Diskon 50%", color: "from-rose-500 to-orange-500", action: onPromoClick },
        { id: 'viral', icon: TrendingUp, label: "Populer", description: "Lagi Viral", color: "from-orange-500 to-yellow-500", action: () => onExploreClick(null, 'Populer') },
        { id: 'new', icon: History, label: "Baru", description: "Baru Buka", color: "from-emerald-500 to-teal-500", action: () => onExploreClick(null, 'Terbaru') },
        { id: 'near', icon: MapPin, label: "Terdekat", description: "Radius 2km", color: "from-blue-500 to-indigo-500", action: () => onExploreClick(null, 'Terdekat') },
        { id: 'aesthetic', icon: Camera, label: "Estetik", description: "Instagenic", color: "from-teal-500 to-emerald-500", action: () => onExploreClick('Aesthetic', 'Aesthetic') },
        { id: 'coffee', icon: Coffee, label: "Ngopi", description: "Coffee Shop", color: "from-orange-600 to-orange-400", action: () => onExploreClick('Coffee', 'Ngopi') },
        { id: 'food', icon: Utensils, label: "Makan", description: "Main Course", color: "from-emerald-600 to-green-400", action: () => onExploreClick('Main Course', 'Makan') },
        { id: 'wfc', icon: Laptop, label: "WFC", description: "Workspace", color: "from-blue-600 to-blue-400", action: () => onExploreClick('Workspace', 'WFC') },
        { id: 'date', icon: Heart, label: "Date", description: "Date Night", color: "from-rose-600 to-pink-400", action: () => onExploreClick('Aesthetic', 'Date Night') },
        { id: 'group', icon: Users, label: "Group", description: "Hangout", color: "from-indigo-600 to-indigo-400", action: () => onExploreClick('Outdoor', 'Hangout') },
        { id: '24h', icon: Moon, label: "24 Jam", description: "Non-stop", color: "from-slate-800 to-slate-600", action: () => onExploreClick('24 Jam', '24 Jam') },
        { id: 'music', icon: Music, label: "Music", description: "Live Event", color: "from-purple-600 to-pink-500", action: () => onExploreClick('Live Music', 'Music') },
        { id: 'radar', icon: Compass, label: "Radar", description: "Teman Aktif", color: "from-orange-700 to-orange-500", action: () => onCommunityClick('nearby') },
    ];

    // Main 4 Hero Shortcuts
    const heroShortcuts = shortcuts.slice(0, 4);

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0F172A] transition-colors duration-300 relative">
            <SEO title="Eksplor Kafe Indonesia" />
            
            <style>{`
                @keyframes pulse-glow {
                    0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
                    50% { box-shadow: 0 0 25px 8px rgba(255, 255, 255, 0.1); transform: scale(1.02); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
                }
                .animate-cta-btn {
                    animation: pulse-glow 2.5s infinite ease-in-out;
                }
            `}</style>

            <div className="relative z-10">
                <section className="relative overflow-hidden md:min-h-[65vh] flex flex-col justify-start md:pt-48 md:pb-12">
                    <div className="hidden md:block absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px]"></div>
                    <div className="hidden md:block absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]"></div>

                    {/* UPDATED MOBILE HERO: COMPACT VERSION */}
                    <div className="md:hidden pt-[calc(env(safe-area-inset-top)+4.8rem)] px-5">
                        <div className="relative w-full bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.2rem] overflow-hidden shadow-2xl shadow-orange-500/30 border-b-[4px] border-orange-700/20 p-5 flex flex-col items-center">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0,20 Q25,0 50,20 T100,20" fill="none" stroke="white" strokeWidth="0.5" />
                                    <path d="M0,50 Q25,30 50,50 T100,50" fill="none" stroke="white" strokeWidth="0.5" />
                                </svg>
                            </div>

                            <button 
                                onClick={() => onExploreClick('Buka', 'Terdekat Buka')}
                                className="animate-cta-btn w-full bg-white text-orange-600 h-12 rounded-[1.2rem] flex items-center justify-center gap-3 shadow-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all border border-white/50 relative z-10"
                            >
                                <MapPin size={18} fill="currentColor" /> Cari Spot Terdekat
                            </button>
                            
                            <div className="flex justify-center gap-4 text-white/90 font-black text-[9px] uppercase tracking-[0.15em] drop-shadow-md mt-3 mb-5 relative z-10">
                                <span className="flex items-center gap-1">
                                    <Zap size={10} className="text-yellow-300"/> {stats?.promoCount || 0} Promo
                                </span>
                                <div className="w-1 h-1 bg-white/30 rounded-full self-center"></div>
                                <span className="flex items-center gap-1">
                                    <Coffee size={10} className="text-orange-200"/> {stats?.openCount || 0} Buka
                                </span>
                            </div>

                            {/* Integrated Quick Access - Grid of 4 */}
                            <div className="grid grid-cols-4 gap-4 w-full pt-4 border-t border-white/10 relative z-10">
                                {heroShortcuts.map((s) => (
                                    <button 
                                        key={s.id} 
                                        onClick={s.action}
                                        className="flex flex-col items-center gap-1.5 group active:scale-90 transition-all"
                                    >
                                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-lg">
                                            <s.icon size={20} strokeWidth={2.5} />
                                        </div>
                                        <span className="text-[8px] font-black text-white/90 uppercase tracking-widest truncate w-full text-center">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="hidden md:block max-w-7xl mx-auto px-10 w-full relative z-10">
                        <div className="grid grid-cols-12 gap-12 items-center">
                            <div className="col-span-7 space-y-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl text-xs font-black uppercase tracking-widest border border-orange-100 dark:border-orange-800 animate-in fade-in slide-in-from-left duration-500">
                                    <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping"></span> Platform Kafe #1 di Indonesia
                                </div>
                                <h1 className="text-5xl lg:text-6xl font-display font-black text-gray-900 dark:text-white leading-[1.1] tracking-tight animate-in fade-in slide-in-from-left duration-700">
                                    Cari Tempat <br/>
                                    <span className="text-orange-500">Nongkrongr</span> di Mana?
                                </h1>
                                <p className="text-lg text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed animate-in fade-in slide-in-from-left duration-1000">
                                    Temukan lebih dari 2.000+ spot kopi terbaik, estetik, dan nyaman untuk nugas atau sekadar bercerita.
                                </p>
                                
                                <div className="flex items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom duration-1000">
                                    <div 
                                        onClick={onSearchClick}
                                        className="flex-1 max-w-lg bg-white dark:bg-slate-800 rounded-[2.2rem] p-4 flex items-center gap-5 shadow-2xl border border-gray-100 dark:border-slate-700 hover:shadow-orange-500/10 hover:border-orange-200 transition-all cursor-pointer group"
                                    >
                                        <SearchIcon size={24} className="text-orange-600 group-hover:scale-110 transition-transform" />
                                        <span className="text-gray-400 font-bold text-base flex-1 truncate">{SEARCH_PLACEHOLDERS[0]}</span>
                                        <div className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Cari</div>
                                    </div>
                                    <div 
                                        className="bg-white dark:bg-slate-800 p-4 rounded-[2.2rem] flex items-center gap-3 border border-gray-100 dark:border-slate-700 shadow-xl"
                                    >
                                        <MapPinned size={20} className="text-orange-600" />
                                        <div className="text-left pr-4">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Lokasi GPS</p>
                                            <p className="text-xs font-black text-gray-900 dark:text-white truncate">{selectedCityName}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-5 relative">
                                {featuredCafe ? (
                                    <div 
                                        onClick={() => onCafeClick(featuredCafe)}
                                        className="relative z-10 rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-15px_rgba(249,115,22,0.25)] border-4 border-white dark:border-slate-800 rotate-1 animate-in zoom-in duration-1000 cursor-pointer group/hero"
                                    >
                                        <img 
                                            src={getOptimizedImageUrl(featuredCafe.image, 1000)} 
                                            className="w-full h-[450px] object-cover transition-transform duration-1000 group-hover/hero:scale-110" 
                                            alt={featuredCafe.name} 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover/hero:opacity-100 transition-opacity"></div>
                                        <div className="absolute bottom-8 left-8 right-8 text-white">
                                            <Badge color="bg-orange-500" icon={Star}>Paling Hits Pekan Ini</Badge>
                                            <h3 className="text-2xl font-black mt-2 uppercase truncate group-hover/hero:text-orange-400 transition-colors">{featuredCafe.name}</h3>
                                            <p className="flex items-center gap-2 text-xs font-bold opacity-80 mt-0.5 uppercase tracking-wider truncate">
                                                <MapPin size={12} className="text-orange-500" /> {featuredCafe.address.split(',')[0]}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-4 border-dashed border-gray-200 dark:border-slate-800 h-[450px] bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-12 text-center group">
                                        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse group-hover:scale-110 transition-transform">
                                            <Coffee size={48} className="text-orange-500" />
                                        </div>
                                        <h3 className="text-2xl font-display font-black text-gray-900 dark:text-white uppercase tracking-tight leading-tight">Menyiapkan Spot Terhits... ✨</h3>
                                        <p className="text-gray-400 text-sm mt-4 font-medium leading-relaxed uppercase tracking-widest">
                                            Kami sedang memilah kafe dengan <span className="text-orange-600">vibe paling asik</span> untukmu hari ini.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="max-w-7xl mx-auto px-5 md:px-10 mt-6 md:mt-24 relative z-20 mb-6 md:mb-10">
                    {/* Secondary Shortcuts on Mobile */}
                    <div className="md:hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-[2.2rem] p-6 shadow-xl border border-white/30 dark:border-white/10 overflow-x-auto no-scrollbar ring-1 ring-black/5">
                        <div className="flex gap-6">
                            {shortcuts.slice(4).map(item => (
                                <MiniStory 
                                    key={item.id} 
                                    icon={item.icon} 
                                    label={item.label} 
                                    color={item.color} 
                                    onClick={item.action} 
                                />
                            ))}
                        </div>
                    </div>

                    <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
                        {shortcuts.map(item => (
                            <ShortcutCardDesktop 
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                description={item.description}
                                color={item.color}
                                onClick={item.action}
                            />
                        ))}
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 md:px-10 space-y-10 md:space-y-16 pb-12 md:pb-24 relative z-20">
                    <section>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 px-1">
                            {collections.slice(0, 4).map((col) => (
                                <div 
                                    key={col.id} 
                                    onClick={() => onCollectionClick(col.id)}
                                    className="group relative aspect-square md:aspect-[4/5] rounded-[2rem] md:rounded-[3.5rem] overflow-hidden shadow-xl cursor-pointer border border-gray-100 dark:border-slate-800 transition-all duration-700 md:hover:-translate-y-2"
                                >
                                    <LazyImage src={col.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={col.title} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="absolute bottom-4 left-4 right-4 md:bottom-10 md:left-10 md:right-10">
                                        <div className="inline-flex items-center gap-2 px-1.5 py-0.5 md:px-2.5 md:py-1 bg-orange-600 rounded-lg text-[7px] md:text-[10px] font-black text-white mb-1 md:mb-3 shadow-lg uppercase tracking-[0.15em] border border-white/20 whitespace-nowrap">
                                            {col.subtitle}
                                        </div>
                                        <h3 className="text-sm md:text-3xl font-display font-black text-white leading-tight uppercase tracking-tight line-clamp-2">
                                            {col.title}
                                        </h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex justify-between items-end mb-6 px-1">
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 bg-orange-500 rounded-full"></div>
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-display font-black text-gray-900 dark:text-white tracking-tight uppercase">Kafe Hits Terdekat</h2>
                                    <p className="text-gray-400 text-xs md:text-sm font-bold mt-1">
                                        Menampilkan kafe terbaik di <span className="text-orange-600 font-black">{selectedCityName}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-8">
                            {cafes.slice(0, 18).map((cafe) => (
                                <HomeCafeCard key={cafe.id} cafe={cafe} onClick={onCafeClick} />
                            ))}
                        </div>
                    </section>

                    {!isNativeApp && <PWAInstallSection />}

                    {/* MOBILE APK DOWNLOAD LINK */}
                    <div className="md:hidden flex flex-col items-center justify-center pt-2 pb-2 animate-in fade-in duration-1000 px-4">
                        {!isNativeApp && (
                             <a 
                                href="http://nongkrongr.com/app/nongkrongr.apk" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                download="nongkrongr.apk"
                                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gray-50 dark:bg-slate-800/60 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-500 border border-gray-100 dark:border-slate-800 active:scale-95 transition-all shadow-sm"
                            >
                                <SmartphoneIcon size={14} className="text-orange-500" /> Download APK Android
                            </a>
                        )}
                    </div>

                    <footer className="hidden md:block pt-8 pb-12 text-center border-t border-gray-100 dark:border-slate-800 animate-in fade-in duration-1000">
                        <img 
                            src={getOptimizedImageUrl(LOGO_HOME_URL, 300)} 
                            className="h-7 mx-auto mb-8 grayscale opacity-30 dark:invert" 
                            alt="Logo" 
                        />
                        <p className="text-[9px] font-black text-gray-300 dark:text-slate-600 tracking-[0.5em] uppercase">© 2025 Nongkrongr Indonesia • Crafted with Passion</p>
                    </footer>
                </div>
            </div>
        </div>
    );
};
