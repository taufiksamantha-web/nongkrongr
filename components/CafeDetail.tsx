
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, MapPin, Star, Heart, Share2, Navigation, Check, Phone, MessageSquare, Clock, Map as MapIcon, ChevronDown, AlertCircle, MessageCircle, Send, Sparkles, Plus, ChevronRight, Share, Info, Calendar, Utensils } from 'lucide-react';
import { calculateDistance, getOptimizedImageUrl, getCafeStatus, formatRating, WEBSITE_URL } from '../constants';
import { Cafe, Review, User } from '../types';
import { Button, VerifiedBadge, LazyImage, Pagination } from './UI';
import { fetchCafeReviewsPaginated, createReview, createCafeSlug, submitReport } from '../services/dataService'; 
import { SEO } from './SEO';
import { ReportModal } from './ReportModal'; 
import { ReviewModal } from './ReviewModal'; 
import { useSession } from './SessionContext';
import { MenuOrdering } from './MenuOrdering';

export interface CafeDetailProps {
    cafe: Cafe;
    allCafes: Cafe[];
    userLocation: { lat: number; lng: number } | null;
    onBack: () => void;
    isSaved: boolean;
    onToggleFavorite: () => void; 
    user: User | null;
    onLoginReq: () => void;
    onCafeClick: (cafe: Cafe) => void;
    onMapOverview: (cafe: Cafe) => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const CafeDetail: React.FC<CafeDetailProps> = (props) => {
    const { cafe, allCafes, user, onLoginReq, addToast, isSaved, onToggleFavorite, onMapOverview, onCafeClick, userLocation } = props;
    const { isDarkMode } = useSession();
    
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [reviewPage, setReviewPage] = useState(1);
    const [totalReviews, setTotalReviews] = useState(0);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'RINGKASAN' | 'MENU' | 'TENTANG' | 'ULASAN'>('RINGKASAN');
    const [showFullSchedule, setShowFullSchedule] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);

    const loadReviews = useCallback(async () => {
        if (!cafe?.id) return;
        setIsLoadingReviews(true);
        try {
            const { data, total } = await fetchCafeReviewsPaginated(cafe.id, reviewPage, 10);
            setReviews(data || []);
            setTotalReviews(total || 0);
        } catch (e) { console.error(e); } finally { setIsLoadingReviews(false); }
    }, [cafe?.id, reviewPage]);

    useEffect(() => {
        loadReviews();
    }, [loadReviews]);

    useEffect(() => {
        const handleScroll = () => {
            setIsHeaderScrolled(window.scrollY > 80);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const status = getCafeStatus(cafe.openingHours);

    const recommendations = useMemo(() => {
        if (!allCafes || allCafes.length === 0) return [];
        return allCafes
            .filter(c => c.id !== cafe.id && c.status === 'active')
            .map(c => {
                let score = 0;
                if (user?.preferences && Array.isArray(user.preferences)) {
                    const matchCount = c.tags.filter(tag => user.preferences?.some(pref => pref.toLowerCase() === tag.toLowerCase())).length;
                    score += matchCount * 25; 
                }
                score += c.rating * 8;
                if (userLocation) {
                    const dist = calculateDistance(userLocation.lat, userLocation.lng, c.coordinates.lat, c.coordinates.lng);
                    if (dist < 1.5) score += 60;
                    else if (dist < 5) score += 35;
                    else if (dist < 10) score += 15;
                }
                return { ...c, recScore: score };
            })
            .sort((a, b) => b.recScore - a.recScore)
            .slice(0, 4);
    }, [allCafes, cafe.id, user?.preferences, userLocation]);

    const handleShare = () => {
        const url = `${WEBSITE_URL}/#/cafe/${createCafeSlug(cafe)}`;
        if (navigator.share) navigator.share({ title: cafe.name, text: cafe.description, url });
        else { navigator.clipboard.writeText(url); addToast('success', 'Link disalin!'); }
    };

    const handleNavigate = () => window.open(`https://www.google.com/maps/dir/?api=1&destination=${cafe.coordinates.lat},${cafe.coordinates.lng}`, '_blank');

    const handleContact = () => {
        if (!cafe.phoneNumber) { addToast('info', 'Nomor tidak tersedia'); return; }
        const phoneRaw = cafe.phoneNumber.trim();
        if (phoneRaw.startsWith('0711')) { window.open(`tel:${phoneRaw.replace(/\D/g, '')}`, '_self'); return; }
        let phoneClean = phoneRaw.replace(/\D/g, '');
        if (phoneClean.startsWith('0')) phoneClean = '62' + phoneClean.substring(1);
        else if (!phoneClean.startsWith('62')) phoneClean = '62' + phoneClean;
        const message = `Halo Admin ${cafe.name}, mau bertanya reservasi/booking via Nongkrongr.com`;
        const waUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const isContactHidden = useMemo(() => !cafe.phoneNumber || cafe.phoneNumber.includes('-'), [cafe.phoneNumber]);

    const handleReviewSubmit = async (rating: number, comment: string) => {
        if (!user) return;
        try {
            await createReview(cafe.id, user.id, rating, comment);
            addToast('success', 'Ulasan dikirim!');
            if (reviewPage === 1) loadReviews();
            else setReviewPage(1);
            setActiveTab('ULASAN');
        } catch (e: any) { throw e; }
    };

    const dynamicCharacteristics = useMemo(() => {
        const all = Array.from(new Set([...(cafe.tags || []), ...(cafe.facilities || [])]));
        const categories = [
            { title: "Menu & Sajian", regex: /(makan|kopi|coffee|dessert|pastry|steak|pasta|mie|nasi|minuman|teh)/i },
            { title: "Area", regex: /(interior|eksterior|rooftop|teras|taman|outdoor|indoor|lantai|balkon)/i },
            { title: "Suasana", regex: /(aesthetic|estetik|cozy|nyaman|mewah|scenic|view|vintage|klasik)/i },
            { title: "Layanan", regex: /(wifi|colokan|workspace|nugas|parkir|toilet|ac|merokok|smoking|reservasi)/i }
        ];
        const result: Record<string, string[]> = {};
        all.forEach(tag => {
            for (const cat of categories) {
                if (cat.regex.test(tag)) {
                    if (!result[cat.title]) result[cat.title] = [];
                    result[cat.title].push(tag);
                    break;
                }
            }
        });
        return result;
    }, [cafe.tags, cafe.facilities]);

    const renderCharacteristicsGroup = (title: string, items: string[]) => (
        <div key={title} className="animate-in fade-in slide-in-from-bottom-1">
            <h3 className="font-black text-gray-400 text-[9px] uppercase tracking-widest mb-2.5 px-1">{title}</h3>
            <div className="flex flex-wrap gap-1.5">
                {items.map(i => (
                    <span key={i} className="px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 text-[10px] font-bold rounded-lg border border-gray-100 dark:border-slate-700">
                        {i}
                    </span>
                ))}
            </div>
        </div>
    );

    // FIXED: High Contrast Button Styles for Mobile
    const getHeaderBtnClass = (isScrolled: boolean, isRed?: boolean) => {
        if (isScrolled) {
            // Saat di-scroll (Header Orange), gunakan putih semi-transparan agar manis
            return `w-11 h-11 flex items-center justify-center bg-white/20 text-white rounded-full transition-all active:scale-90`;
        } else {
            // Saat di Atas (Transparent), gunakan Putih Solid dengan icon Hitam/Orange agar terlihat jelas
            return `w-11 h-11 flex items-center justify-center bg-white text-gray-900 rounded-full transition-all active:scale-90 shadow-2xl border border-black/5 ${isRed ? 'text-red-500' : 'text-gray-900'}`;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0F172A] text-gray-900 dark:text-gray-100 pb-32 transition-colors">
            <SEO title={cafe.name} image={cafe.image} />
            
            {/* MOBILE VIEW - ULTRA COMPACT */}
            <div className="md:hidden">
                <div className={`fixed top-0 left-0 right-0 z-[100] px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 flex justify-between items-center transition-all duration-300 ${
                    isHeaderScrolled ? 'bg-orange-500 shadow-md' : 'bg-transparent'
                }`}>
                    <div className="flex items-center gap-3">
                        <button onClick={props.onBack} className={getHeaderBtnClass(isHeaderScrolled)}>
                            <ArrowLeft size={22} strokeWidth={3} className={!isHeaderScrolled ? "text-orange-600" : ""} />
                        </button>
                        {isHeaderScrolled && (
                            <span className="text-white font-black text-base truncate max-w-[150px] animate-in slide-in-from-left-2 uppercase tracking-tight">
                                {cafe.name}
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleShare} className={getHeaderBtnClass(isHeaderScrolled)}>
                            <Share2 size={20} strokeWidth={2.5} className={!isHeaderScrolled ? "text-orange-600" : ""} />
                        </button>
                        <button onClick={onToggleFavorite} className={getHeaderBtnClass(isHeaderScrolled, isSaved)}>
                            <Heart size={20} strokeWidth={2.5} fill={isSaved ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>

                <div className="relative h-[38vh] w-full">
                    <LazyImage src={getOptimizedImageUrl(cafe.image, 1000)} className="w-full h-full object-cover" alt={cafe.name} fetchPriority="high" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0F172A] via-transparent to-transparent opacity-80"></div>
                </div>

                <div className="px-4 -mt-16 relative z-10">
                    <div className="bg-white dark:bg-[#1E293B] rounded-[2.5rem] p-6 shadow-2xl border border-gray-100 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0 flex-1 pr-4">
                                <div className="flex flex-wrap gap-1 mb-1.5">
                                    {cafe.tags.slice(0, 2).map(t => <span key={t} className="text-[8px] font-black uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">{t}</span>)}
                                </div>
                                <h1 className="text-2xl font-display font-black text-gray-900 dark:text-white leading-tight truncate">{cafe.name}</h1>
                            </div>
                            <div className="bg-orange-500 px-2.5 py-1.5 rounded-xl text-white font-black text-sm flex items-center gap-1 shrink-0 shadow-lg border border-white/20">
                                <Star size={14} fill="currentColor" /> {formatRating(cafe.rating)}
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-slate-800/50">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-orange-500"><Utensils size={16}/></div>
                                <span className="font-black text-gray-800 dark:text-slate-200 text-sm">{cafe.priceRange || 'Rp 25k - 50k'}</span>
                            </div>
                            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${status.isOpen ? 'bg-green-500 text-white shadow-md' : 'bg-red-500 text-white opacity-80'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> {status.isOpen ? 'Buka' : 'Tutup'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 px-4">
                    <div className="flex border-b border-gray-100 dark:border-slate-800 gap-1 overflow-x-auto no-scrollbar">
                        {(['RINGKASAN', 'MENU', 'TENTANG', 'ULASAN'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 min-w-[80px] py-4 text-[10px] font-black transition-all relative whitespace-nowrap tracking-tighter ${activeTab === tab ? 'text-orange-600' : 'text-gray-400 dark:text-slate-500'}`}
                            >
                                {tab === 'ULASAN' ? `ULASAN (${totalReviews})` : tab}
                                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-t-full"></div>}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="px-4 py-6 space-y-6">
                    {activeTab === 'RINGKASAN' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="bg-gray-50 dark:bg-[#1E293B]/50 border border-gray-100 dark:border-slate-800 rounded-[1.8rem] p-5 flex gap-4">
                                <div className="w-11 h-11 bg-blue-500 text-white rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20"><MapPin size={22} /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Alamat</p>
                                    <p className="text-[13px] font-bold text-gray-700 dark:text-slate-200 leading-normal line-clamp-2">{cafe.address}</p>
                                </div>
                            </div>

                            <div className="bg-orange-500 text-white rounded-[1.8rem] overflow-hidden shadow-xl shadow-orange-500/10">
                                <button onClick={() => setShowFullSchedule(!showFullSchedule)} className="w-full p-5 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Clock size={20} strokeWidth={3} />
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase opacity-80 leading-none mb-1">Operasional</p>
                                            <p className="text-[13px] font-black">{status.isOpen ? 'Buka Sekarang' : 'Tutup Sementara'}</p>
                                        </div>
                                    </div>
                                    <ChevronDown size={22} className={`transition-transform ${showFullSchedule ? 'rotate-180' : ''}`} />
                                </button>
                                {showFullSchedule && (
                                    <div className="px-5 pb-5 pt-1 space-y-3 animate-in slide-in-from-top-1 bg-white dark:bg-slate-900 m-1.5 rounded-[1.2rem]">
                                        {(cafe.openingHours?.schedules || []).sort((a,b) => a.day - b.day).map((s) => (
                                            <div key={s.day} className="flex justify-between items-center text-[11px] font-bold">
                                                <span className={new Date().getDay() === s.day ? "text-orange-600 font-black" : "text-gray-400"}>{DAY_NAMES[s.day]}</span>
                                                <span className="text-gray-700 dark:text-slate-200 uppercase">{s.isClosed ? 'Tutup' : s.is24Hours ? '24 Jam' : `${s.open} - ${s.close}`}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 space-y-4">
                                <h3 className="text-lg font-display font-black flex items-center gap-2 tracking-tight px-1">Rekomendasi Terdekat <Sparkles size={16} className="text-orange-400" /></h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {recommendations.map(c => (
                                        <div key={c.id} onClick={() => onCafeClick(c)} className="group relative aspect-[5/6] rounded-[2rem] overflow-hidden shadow-md active:scale-95 transition-transform border border-black/5">
                                            <LazyImage src={getOptimizedImageUrl(c.image, 400)} className="absolute inset-0 w-full h-full object-cover" alt={c.name} />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                                            <div className="absolute bottom-3.5 left-3.5 right-3.5">
                                                <h4 className="text-white font-black text-[11px] leading-tight truncate">{c.name}</h4>
                                                <div className="flex items-center gap-1 mt-1"><Star size={10} className="text-orange-500 fill-current" /> <span className="text-[10px] font-black text-white">{formatRating(c.rating)}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'MENU' && <MenuOrdering cafe={cafe} user={user} onLoginReq={onLoginReq} addToast={addToast} />}

                    {activeTab === 'TENTANG' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                             <div className="bg-gray-50 dark:bg-[#1E293B]/50 border border-gray-100 dark:border-slate-800 rounded-[2.2rem] p-7">
                                <h3 className="text-base font-black mb-4 font-display uppercase tracking-widest text-orange-600">Tentang</h3>
                                <p className="text-gray-600 dark:text-slate-400 leading-relaxed font-medium text-sm mb-10">{cafe.description || `Kafe asik dengan suasana nyaman.`}</p>
                                <div className="h-px bg-gray-200 dark:bg-slate-800 mb-10"></div>
                                <h3 className="text-base font-black mb-8 font-display uppercase tracking-widest text-orange-600">Fitur & Layanan</h3>
                                <div className="space-y-8">
                                    {Object.entries(dynamicCharacteristics).map(([title, items]) => renderCharacteristicsGroup(title, items as string[]))}
                                </div>
                                <button onClick={() => setIsReportOpen(true)} className="w-full mt-12 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500 border border-dashed border-gray-200 rounded-2xl transition-colors"><AlertCircle size={12} className="inline mr-2" /> Lapor Kesalahan Data</button>
                             </div>
                        </div>
                    )}

                    {activeTab === 'ULASAN' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <h3 className="text-lg font-black uppercase tracking-tight">Feedback Pengunjung</h3>
                                <button onClick={() => user ? setShowReviewForm(true) : onLoginReq()} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center gap-2 transition-transform active:scale-95"><Plus size={14} strokeWidth={3} /> Tulis</button>
                            </div>
                            {reviews.length > 0 ? (
                                reviews.map(r => (
                                    <div key={r.id} className="bg-white dark:bg-[#1E293B]/50 border border-gray-100 dark:border-slate-800 rounded-[1.8rem] p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200"><LazyImage src={r.userAvatar} className="w-full h-full object-cover" alt={r.userName} /></div>
                                                <div><p className="text-sm font-black text-gray-900 dark:text-white truncate max-w-[120px]">{r.userName}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(r.date).toLocaleDateString('id-ID', {month:'short', day:'numeric'})}</p></div>
                                            </div>
                                            <div className="flex bg-orange-50 px-2.5 py-1 rounded-xl text-orange-600 text-[11px] font-black gap-1 items-center"><Star size={12} fill="currentColor" /> {r.rating}.0</div>
                                        </div>
                                        <p className="text-[13px] text-gray-600 dark:text-slate-300 italic font-medium leading-relaxed">"{r.comment}"</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-30"><MessageCircle size={48} className="mx-auto mb-4" /><p className="text-[11px] font-bold uppercase tracking-widest">Belum ada ulasan.</p></div>
                            )}
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] flex gap-3 shadow-[0_-15px_40px_rgba(0,0,0,0.12)]">
                    <button onClick={handleNavigate} className="flex-1 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 h-14 shadow-xl text-sm uppercase tracking-widest"><Navigation size={20} fill="currentColor" /> Rute</button>
                    {!isContactHidden && (
                        <button onClick={handleContact} className="flex-1 bg-green-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 h-14 shadow-xl text-sm uppercase tracking-widest">
                            {cafe.phoneNumber?.startsWith('0711') ? <Phone size={20} fill="currentColor" /> : <MessageCircle size={20} fill="currentColor" />} Hubungi
                        </button>
                    )}
                    <button onClick={() => onMapOverview(cafe)} className="w-14 h-14 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl flex items-center justify-center active:scale-95 shadow-md shrink-0"><MapIcon size={24} /></button>
                </div>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden md:block">
                <div className="max-w-7xl mx-auto px-8 pt-24">
                    <div className="relative h-[480px] w-full rounded-[3rem] overflow-hidden shadow-2xl group border border-gray-100 dark:border-slate-800/50">
                        <LazyImage src={getOptimizedImageUrl(cafe.image, 1600)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt={cafe.name} fetchPriority="high" />
                        <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#0B1120] via-transparent to-transparent opacity-60"></div>
                        <div className="absolute top-6 left-6 flex gap-4 z-20">
                            <button onClick={props.onBack} className="p-3 bg-white/40 dark:bg-black/40 backdrop-blur-md rounded-full text-gray-900 dark:text-white hover:bg-orange-500 hover:text-white transition-all border border-white/20 shadow-lg active:scale-90"><ArrowLeft size={22} strokeWidth={3}/></button>
                        </div>
                        <div className="absolute bottom-10 left-10 right-10 z-10">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {cafe.tags.map(tag => <span key={tag} className="px-3 py-1 bg-black/20 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white">{tag}</span>)}
                            </div>
                            <h1 className="text-5xl font-display font-black mb-4 drop-shadow-2xl flex items-center gap-4 text-gray-900 dark:text-white">{cafe.name} {cafe.is_verified && <VerifiedBadge size={32} />}</h1>
                            <div className="flex items-center gap-6 text-gray-700 dark:text-white/90">
                                <div className="flex items-center gap-2 text-sm font-bold"><MapPin size={18} className="text-orange-500" /> <span>{cafe.address}</span></div>
                                <div className="h-4 w-px bg-gray-300 dark:bg-white/30"></div>
                                <div className="flex items-center gap-2 text-sm font-black"><Star size={18} className="text-orange-500 fill-current" /> <span>{formatRating(cafe.rating)}</span> <span className="opacity-50 font-medium">({cafe.reviewsCount} Ulasan)</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10 grid grid-cols-12 gap-10 items-start">
                        <div className="col-span-8 space-y-10">
                            <div className="bg-white dark:bg-[#151e32] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-xl">
                                <div className="flex items-center gap-6 mb-8 border-b border-gray-50 dark:border-slate-800 pb-2">
                                    {(['RINGKASAN', 'MENU', 'TENTANG', 'ULASAN'] as const).map(tab => (
                                        <button key={tab} onClick={() => setActiveTab(tab)} className={`text-sm font-black transition-all relative pb-4 uppercase tracking-widest ${activeTab === tab ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {tab === 'ULASAN' ? `Ulasan (${totalReviews})` : tab}
                                            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full"></div>}
                                        </button>
                                    ))}
                                </div>
                                {activeTab === 'RINGKASAN' && (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8">
                                            {Object.entries(dynamicCharacteristics).map(([title, items]) => renderCharacteristicsGroup(title, items as string[]))}
                                        </div>
                                        <div className="pt-8 border-t border-gray-50 dark:border-slate-800">
                                            <h2 className="text-lg font-black mb-4 font-display dark:text-white uppercase tracking-widest text-orange-500">Tentang</h2>
                                            <p className="text-gray-500 dark:text-slate-400 leading-relaxed text-base">{cafe.description || `Temukan kenyamanan terbaik di ${cafe.name}.`}</p>
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'MENU' && <MenuOrdering cafe={cafe} user={user} onLoginReq={onLoginReq} addToast={addToast} />}
                                {activeTab === 'ULASAN' && (
                                    <div className="space-y-6">
                                        {reviews.length > 0 ? reviews.map(r => (
                                            <div key={r.id} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-[1.5rem] border border-gray-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm"><LazyImage src={r.userAvatar} className="w-full h-full object-cover" alt="" /></div>
                                                        <div><p className="text-sm font-black dark:text-white">{r.userName}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(r.date).toLocaleDateString('id-ID', {month:'long', day:'numeric', year:'numeric'})}</p></div>
                                                    </div>
                                                    <div className="bg-orange-500 px-3 py-1 rounded-xl text-white font-black text-xs flex items-center gap-1 shadow-md"><Star size={14} fill="currentColor" /> {r.rating}.0</div>
                                                </div>
                                                <p className="text-gray-600 dark:text-slate-300 text-sm italic leading-relaxed font-medium">"{r.comment}"</p>
                                            </div>
                                        )) : <div className="py-20 text-center opacity-30 uppercase tracking-widest font-black text-xs">Belum ada ulasan</div>}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="col-span-4 space-y-6 sticky top-24">
                            <div className="bg-white dark:bg-[#151e32] border border-gray-100 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-xl space-y-6 ring-1 ring-black/5">
                                <div className="flex gap-3">
                                    <button onClick={handleNavigate} className="flex-1 bg-orange-500 text-white font-black py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-[11px] uppercase tracking-widest"><Navigation size={16} fill="currentColor" /> Navigasi</button>
                                    <button onClick={onToggleFavorite} className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${isSaved ? 'bg-red-500 border-red-500 text-white shadow-lg' : 'bg-gray-50 border-gray-200 text-gray-400'}`}><Heart size={24} fill={isSaved ? "currentColor" : "none"} /></button>
                                </div>
                                <div className="bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Status Buka</span>
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${status.isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{status.isOpen ? 'Buka' : 'Tutup'}</span>
                                    </div>
                                    <p className="text-xs font-bold text-gray-600 dark:text-slate-400">Biasanya ramai di jam makan siang dan sore hari.</p>
                                </div>
                                <div className="space-y-3">
                                    <button onClick={() => { setActiveTab('MENU'); window.scrollTo({ top: 400, behavior: 'smooth' }); }} className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-orange-50 text-orange-600 font-black hover:bg-orange-100 transition-all text-xs uppercase tracking-widest"><Utensils size={18} /> Menu & Pemesanan</button>
                                    <button onClick={() => user ? setShowReviewForm(true) : onLoginReq()} className="w-full h-14 flex items-center justify-center gap-3 rounded-2xl bg-gray-900 text-white font-black hover:bg-black transition-all text-xs uppercase tracking-widest"><Plus size={18} /> Tulis Ulasan</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} onSubmit={async (r, d) => { await submitReport(cafe.id, user?.id, r, d); addToast('success', 'Laporan dikirim.'); }} cafeName={cafe.name} />
            <ReviewModal isOpen={showReviewForm} onClose={() => setShowReviewForm(false)} onSubmit={handleReviewSubmit} cafeName={cafe.name} />
        </div>
    );
};
