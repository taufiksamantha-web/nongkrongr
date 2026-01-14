
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Star, Trophy, ArrowRight, MapPin, Loader2, Radio, Hand, Award, Crown, Medal, Sparkles, Radar as RadarIcon, Target, Ghost, ShieldAlert, Coffee, Signal } from 'lucide-react';
import { Cafe, Review, User, AppNotification, NearbyUser } from '../types';
import { LazyImage, Button } from '../components/UI';
import { fetchLeaderboardUsers, fetchCommunityReviewsPaginated, fetchNearbyUsers, toggleLocationSharingDB, sendWave, updateUserLocationDB } from '../services/dataService'; 
import { getOptimizedImageUrl, DEFAULT_USER_AVATAR, calculateDistance } from '../constants';
import { SEO } from '../components/SEO';
import { useSession } from '../components/SessionContext'; 
import { supabase } from '../lib/supabase';

interface CommunityViewProps {
    onCafeClick: (cafe: Cafe) => void;
    cafes: Cafe[];
    currentUser: User | null;
    onLoginReq: () => void;
    notifications?: AppNotification[];
    isDarkMode?: boolean;
    toggleDarkMode?: () => void;
    selectedCityName?: string;
    setShowLocationModal?: (show: boolean) => void;
    onProfileClick?: () => void;
    userLocation?: { lat: number, lng: number } | null;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    initialTab?: 'feed' | 'nearby';
}

const WAVE_COOLDOWN_MS = 60 * 60 * 1000; 

const RadarVisual = ({ active, avatar }: { active: boolean, avatar?: string }) => (
    <div className="relative w-48 h-48 md:w-64 md:h-64 mx-auto mb-6 flex items-center justify-center">
        <div className="absolute inset-0 border border-indigo-500/10 rounded-full scale-100"></div>
        <div className="absolute inset-0 border border-indigo-500/15 rounded-full scale-75"></div>
        <div className="absolute inset-0 border border-indigo-500/20 rounded-full scale-50"></div>
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-indigo-500/10"></div>
        <div className="absolute left-0 right-0 top-1/2 h-px bg-indigo-500/10"></div>
        
        {active && (
            <>
                <div className="absolute inset-0 rounded-full overflow-hidden animate-[spin_4s_linear_infinite] z-10 origin-center">
                    <div className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left bg-gradient-to-tr from-indigo-500/40 via-indigo-500/5 to-transparent -rotate-45"></div>
                </div>
                <div className="absolute inset-0 border-2 border-indigo-400/40 rounded-full animate-[ping_3s_linear_infinite]"></div>
            </>
        )}

        <div className="relative z-20 w-16 h-16 md:w-24 md:h-24">
            <div className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-xl ${active ? 'animate-pulse' : ''}`}></div>
            <div className={`relative w-full h-full p-1 rounded-full bg-slate-900 border-2 transition-all duration-700 ${active ? 'border-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.4)]' : 'border-white/10 opacity-50'}`}>
                <div className="w-full h-full rounded-full overflow-hidden">
                    <img src={avatar || "https://nongkrongr.com/avatar/user.png"} className="w-full h-full object-cover" alt="Avatar" />
                </div>
                {active && (
                    <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-1 rounded-full shadow-lg border-2 border-slate-900 animate-bounce">
                        <Signal size={10} />
                    </div>
                )}
            </div>
        </div>
    </div>
);

export const CommunityView: React.FC<CommunityViewProps> = ({ 
    onCafeClick, cafes, currentUser, onLoginReq,
    selectedCityName, userLocation, addToast, initialTab = 'feed'
}) => {
    const { updateLocalUser, onlineUserIds } = useSession(); 
    const [activeTab, setActiveTab] = useState<'feed' | 'nearby'>(initialTab);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [topUsers, setTopUsers] = useState<User[]>([]);
    const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
    
    const [initialDataLoading, setInitialDataLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMoreReviews, setHasMoreReviews] = useState(true);
    
    const [loadingRadar, setLoadingRadar] = useState(false);
    const [wavingTo, setWavingTo] = useState<string | null>(null);
    const [waveCooldowns, setWaveCooldowns] = useState<Record<string, number>>(() => {
        try { return JSON.parse(localStorage.getItem('nongkrongr_wave_cooldowns') || '{}'); } catch { return {}; }
    });

    const loaderRef = useRef<HTMLDivElement>(null);

    const podiumUsers = topUsers.slice(0, 3);
    const restOfUsers = topUsers.slice(3);

    const handleRefreshRadar = useCallback(async () => {
        if (!currentUser || !currentUser.isLocationShared || !userLocation) return;
        setLoadingRadar(true);
        try {
            const users = await fetchNearbyUsers(userLocation.lat, userLocation.lng, 5, currentUser.id);
            setNearbyUsers(users);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRadar(false);
        }
    }, [currentUser, userLocation]);

    useEffect(() => {
        if (activeTab === 'nearby' && currentUser?.isLocationShared) {
            handleRefreshRadar();
        }
    }, [activeTab, currentUser?.isLocationShared, handleRefreshRadar]);

    const toggleRadar = async () => {
        if (!currentUser) return;
        const newState = !currentUser.isLocationShared;
        try {
            await toggleLocationSharingDB(currentUser.id, newState);
            updateLocalUser({ isLocationShared: newState });
        } catch (e) {
            addToast('error', 'Gagal mengubah status radar');
        }
    };

    const handleWave = async (targetUser: NearbyUser) => {
        if (!currentUser) { onLoginReq(); return; }
        
        const now = Date.now();
        const lastWave = waveCooldowns[targetUser.id] || 0;
        if (now - lastWave < WAVE_COOLDOWN_MS) {
            addToast('info', 'Sabar ya, kamu baru saja menyapa orang ini.');
            return;
        }

        setWavingTo(targetUser.id);
        try {
            await sendWave(currentUser.id, targetUser.id, currentUser.name);
            addToast('success', `Kamu menyapa ${targetUser.name}! 👋`);
            const newCooldowns = { ...waveCooldowns, [targetUser.id]: now };
            setWaveCooldowns(newCooldowns);
            localStorage.setItem('nongkrongr_wave_cooldowns', JSON.stringify(newCooldowns));
            setTimeout(() => setWavingTo(null), 2000);
        } catch (e) {
            addToast('error', 'Gagal mengirim sapaan.');
            setWavingTo(null);
        }
    };

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        const init = async () => {
            setInitialDataLoading(true);
            try {
                const isGPS = !selectedCityName || selectedCityName === 'Lokasi Saya' || selectedCityName === 'Lokasi Terdeteksi' || selectedCityName === 'Mencari Lokasi...';
                const cityFilter = isGPS ? undefined : selectedCityName;
                const leaderboard = await fetchLeaderboardUsers(cityFilter);
                setTopUsers(leaderboard);
                setReviews([]);
                setPage(1);
                setHasMoreReviews(true);
            } catch (e) {
                console.error(e);
            } finally {
                if (activeTab !== 'feed') setInitialDataLoading(false);
            }
        };
        init();
    }, [selectedCityName, userLocation, activeTab]);

    useEffect(() => {
        if (activeTab !== 'feed') return;
        const channel = supabase.channel('public:reviews:realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, async (payload) => {
                const newRev = payload.new as any;
                const { data } = await supabase.from('reviews')
                    .select(`*, profiles(name, avatar_url, role), cafes(name, image, address, latitude, longitude)`)
                    .eq('id', newRev.id)
                    .single();
                if (data) {
                    if (userLocation && data.cafes?.latitude) {
                         const dist = calculateDistance(userLocation.lat, userLocation.lng, data.cafes.latitude, data.cafes.longitude);
                         if (dist > 50) return;
                    }
                    const mapped: Review = {
                        id: data.id, userId: data.user_id, userName: data.profiles?.name, 
                        userAvatar: data.profiles?.avatar_url || DEFAULT_USER_AVATAR,
                        rating: data.rating, comment: data.comment, date: data.created_at, 
                        reply: data.reply, userRole: data.profiles?.role,
                        cafeId: data.cafe_id, cafeName: data.cafes?.name, 
                        cafeImage: data.cafes?.image, cafeAddress: data.cafes?.address
                    };
                    setReviews(prev => {
                        const exists = prev.some(r => r.id === mapped.id);
                        if (exists) return prev;
                        return [mapped, ...prev];
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeTab, userLocation]);

    const loadReviewsBatch = useCallback(async (pageNum: number) => {
        if (pageNum > 1) setIsFetchingMore(true);
        try {
            const limit = 10;
            const { data } = await fetchCommunityReviewsPaginated(pageNum, limit, userLocation);
            if (data && data.length > 0) {
                setReviews(prev => {
                    const existingIds = new Set(prev.map(r => r.id));
                    const uniqueNew = data.filter(r => !existingIds.has(r.id));
                    return pageNum === 1 ? data : [...prev, ...uniqueNew];
                });
                setHasMoreReviews(data.length === limit);
            } else {
                setHasMoreReviews(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setInitialDataLoading(false);
            setIsFetchingMore(false);
        }
    }, [userLocation]);

    useEffect(() => {
        if (activeTab === 'feed' && reviews.length === 0 && hasMoreReviews && initialDataLoading) {
            loadReviewsBatch(page);
        }
    }, [activeTab, loadReviewsBatch, reviews.length, hasMoreReviews, initialDataLoading, page]);

    useEffect(() => {
        if (activeTab !== 'feed' || !hasMoreReviews || isFetchingMore || initialDataLoading) return;
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setPage(prev => {
                    const nextPage = prev + 1;
                    loadReviewsBatch(nextPage);
                    return nextPage;
                });
            }
        }, { threshold: 0.5 });
        if (loaderRef.current) observer.observe(loaderRef.current);
        return () => { if (loaderRef.current) observer.unobserve(loaderRef.current); };
    }, [hasMoreReviews, isFetchingMore, activeTab, initialDataLoading, loadReviewsBatch]);

    const handleReviewCafeClick = (cafeId?: string) => {
        if (!cafeId) return;
        // Cari data kafe lengkap dari list cafes yang ada di props
        const fullCafeData = cafes.find(c => String(c.id) === String(cafeId));
        if (fullCafeData) {
            onCafeClick(fullCafeData);
        } else {
            // Fallback: Jika tidak ditemukan (mungkin belum ter-fetch), minimal buat object dummy agar navigasi jalan
            supabase.from('cafes').select('*').eq('id', cafeId).single().then(({data}) => {
                if (data) {
                    // Mapping data DB ke tipe Cafe
                    const mappedCafe: Cafe = {
                        id: String(data.id),
                        name: data.name,
                        description: data.description || '',
                        rating: Number(data.rating) || 0,
                        reviewsCount: data.reviews_count || 0,
                        address: data.address || '',
                        coordinates: { lat: Number(data.latitude), lng: Number(data.longitude) },
                        image: data.image || '',
                        images: data.images || [],
                        tags: data.tags || [],
                        facilities: data.facilities || [],
                        priceRange: data.price_range || '',
                        isOpen: data.is_open !== false,
                        openingHours: data.opening_hours,
                    };
                    onCafeClick(mappedCafe);
                }
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F172A] pb-32 transition-colors">
            <SEO title="Komunitas" />
            <div className="max-w-6xl mx-auto px-4 pt-[calc(env(safe-area-inset-top)+5.5rem)]">
                <div className="flex justify-center mb-10">
                    <div className="bg-white/80 backdrop-blur-xl dark:bg-slate-800/80 p-1.5 rounded-full shadow-2xl border border-white/20 dark:border-slate-700 inline-flex overflow-hidden">
                        <button onClick={() => setActiveTab('feed')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-500 ${activeTab === 'feed' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-orange-500'}`}>Live Feed</button>
                        <button onClick={() => setActiveTab('nearby')} className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all duration-500 ${activeTab === 'nearby' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'}`}><Radio size={14} /> Radar</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-6">
                        {activeTab === 'feed' ? (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                {initialDataLoading ? (
                                    <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-50">
                                        <Loader2 className="animate-spin text-orange-500" size={32} />
                                        <p className="text-xs font-bold text-gray-500 tracking-tight uppercase tracking-[0.2em]">Memuat Cerita...</p>
                                    </div>
                                ) : reviews.length > 0 ? (
                                    <>
                                        {reviews.map(review => {
                                            return (
                                                <div key={review.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-500">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr from-orange-500 to-yellow-500 overflow-hidden shrink-0"><LazyImage src={review.userAvatar} className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-800" alt={review.userName} /></div>
                                                            <div><h4 className="font-bold dark:text-white text-base leading-tight">{review.userName}</h4><p className="text-[11px] text-gray-400 font-medium">{new Date(review.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 px-4 py-2 rounded-2xl text-orange-600 dark:text-orange-400 font-bold text-sm shadow-sm"><Star size={16} fill="currentColor" /> {review.rating}.0</div>
                                                    </div>
                                                    <p className="text-gray-600 dark:text-slate-300 text-base italic leading-relaxed mb-6 font-medium">"{review.comment}"</p>
                                                    
                                                    <div 
                                                        className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-[2rem] cursor-pointer group active:scale-95 transition-all border border-transparent hover:border-orange-200 dark:hover:border-orange-900/30 relative z-10" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReviewCafeClick(review.cafeId);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-4 pointer-events-none">
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-sm"><LazyImage src={getOptimizedImageUrl(review.cafeImage || '', 200)} className="w-full h-full object-cover" alt="Cafe" /></div>
                                                            <div className="min-w-0 flex-1"><h5 className="font-bold text-sm dark:text-white truncate group-hover:text-orange-500 transition-colors">{review.cafeName}</h5><p className="text-[11px] text-gray-500 truncate flex items-center gap-1"><MapPin size={10} className="text-orange-400" /> {review.cafeAddress}</p></div>
                                                            <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center gap-4 opacity-50">
                                            {isFetchingMore ? (
                                                <>
                                                    <Loader2 className="animate-spin text-orange-500" size={28} />
                                                    <p className="text-xs font-bold text-gray-500">Memuat ulasan baru...</p>
                                                </>
                                            ) : !hasMoreReviews && (
                                                <div className="flex flex-col items-center">
                                                    <Coffee size={24} className="mb-2" />
                                                    <p className="text-[10px] font-bold tracking-tight uppercase">Inspirasi Berakhir</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-100 dark:border-slate-700 animate-in zoom-in duration-500">
                                        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <Ghost size={48} className="text-gray-200 dark:text-slate-700" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">Feed Masih Sunyi</h3>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-3 max-w-xs mx-auto leading-relaxed font-medium">Jadilah yang pertama memberikan inspirasi ngopi hari ini!</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] rounded-[3rem] p-8 md:p-12 text-white text-center relative overflow-hidden shadow-2xl border border-indigo-50/20">
                                    <div className="relative z-10 flex flex-col items-center">
                                        <RadarVisual active={currentUser?.isLocationShared || false} avatar={currentUser?.avatar_url} />
                                        <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tighter uppercase italic">Radar Warga</h2>
                                        <p className="text-indigo-200/60 mb-8 max-w-xs mx-auto font-bold text-xs uppercase tracking-widest leading-relaxed">Cari teman ngopi yang aktif di radius 5km darimu.</p>
                                        {!currentUser ? (
                                            <div className="flex flex-col items-center gap-4">
                                                <Button onClick={onLoginReq} className="rounded-2xl h-14 px-12 text-sm font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/30 bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all">Mulai Radar</Button>
                                                <p className="text-[9px] font-black text-indigo-400/50 flex items-center gap-2 uppercase tracking-widest">
                                                    <ShieldAlert size={12}/> Butuh Login
                                                </p>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={toggleRadar} 
                                                className={`h-14 px-10 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${currentUser.isLocationShared ? 'bg-red-500/90 hover:bg-red-600 shadow-red-600/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
                                            >
                                                {currentUser.isLocationShared ? 'OFFLINE' : 'AKTIFKAN GPS'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {currentUser?.isLocationShared && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 animate-in slide-in-from-bottom-4 duration-700">
                                        {loadingRadar ? (
                                            <div className="col-span-full py-16 flex flex-col items-center gap-4 opacity-50">
                                                <Loader2 className="animate-spin text-indigo-500" size={32}/>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Memindai koordinat...</p>
                                            </div>
                                        ) : nearbyUsers.length > 0 ? nearbyUsers.map(u => (
                                            <div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-indigo-50 dark:border-indigo-900/20 flex items-center justify-between group shadow-sm hover:shadow-lg transition-all duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden shadow-inner shrink-0">
                                                        <LazyImage src={u.avatar_url} className="w-full h-full object-cover" alt={u.name} />
                                                        {u.isOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-gray-900 dark:text-white truncate text-sm uppercase tracking-tight leading-none mb-1">{u.name}</h4>
                                                        <div className="flex items-center gap-1 text-indigo-500 font-black text-[9px] uppercase tracking-tighter">
                                                            <MapPin size={8} fill="currentColor"/> {u.distance.toFixed(1)} km
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    disabled={wavingTo === u.id}
                                                    onClick={() => handleWave(u)}
                                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${wavingTo === u.id ? 'bg-orange-500 text-white rotate-12 scale-110 shadow-lg shadow-orange-500/30' : 'bg-gray-50 dark:bg-indigo-900/10 text-gray-400 dark:text-indigo-400 hover:bg-orange-500 hover:text-white active:scale-90'}`}
                                                >
                                                    {wavingTo === u.id ? <Hand size={20} className="animate-wave" /> : <Hand size={18} />}
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="col-span-full py-20 text-center opacity-40 flex flex-col items-center">
                                                <RadarIcon size={40} className="mb-4 animate-pulse text-indigo-400"/>
                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Belum ada warga terdeteksi</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-4">
                        <div className="bg-white dark:bg-[#1E293B] rounded-[3rem] p-6 md:p-8 border border-gray-100 dark:border-slate-700 shadow-2xl sticky top-24">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex flex-col">
                                    <h3 className="font-bold text-xl flex items-center gap-2 dark:text-white"><Trophy size={24} className="text-yellow-500" /> Leaderboard</h3>
                                    <p className="text-[11px] font-bold text-orange-500 tracking-tight mt-1 animate-in slide-in-from-left duration-300">Pahlawan Nongkrong Lokal</p>
                                </div>
                                <Sparkles size={20} className="text-orange-300 animate-pulse" />
                            </div>
                            {podiumUsers.length > 0 ? (
                                <div className="flex justify-center items-end gap-1 md:gap-3 mb-10 mt-10 min-h-[180px]">
                                    {podiumUsers[1] && (
                                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-100 flex-1">
                                            <div className="relative mb-3">
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-slate-300 shadow-xl overflow-hidden aspect-square ring-4 ring-slate-100 dark:ring-slate-800">
                                                    <LazyImage src={podiumUsers[1].avatar_url} className="w-full h-full object-cover" alt="Rank 2" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-slate-300 text-slate-800 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md border border-white">#2</div>
                                            </div>
                                            <div className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl flex flex-col items-center justify-center p-3 border-x border-t border-slate-100 dark:border-slate-700">
                                                <Medal size={14} className="text-slate-400 mb-1" />
                                                <span className="text-[10px] font-bold dark:text-white truncate w-full text-center px-1">{podiumUsers[1].name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    )}
                                    {podiumUsers[0] && (
                                        <div className="flex flex-col items-center animate-in zoom-in duration-700 flex-1 z-10 scale-110">
                                            <div className="relative mb-4 -mt-10">
                                                <Crown size={32} className="text-yellow-500 absolute -top-8 left-1/2 -translate-x-1/2 drop-shadow-lg filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" fill="currentColor" />
                                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-[4px] border-yellow-400 shadow-2xl overflow-hidden aspect-square ring-4 ring-yellow-100 dark:ring-yellow-900/20">
                                                    <LazyImage src={podiumUsers[0].avatar_url} className="w-full h-full object-cover" alt="Rank 1" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-[11px] font-black px-2.5 py-1 rounded-lg shadow-lg border border-white scale-110">#1</div>
                                            </div>
                                            <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 rounded-t-[1.8rem] flex flex-col items-center justify-center p-3 border-x border-t border-yellow-100 dark:border-yellow-900/30">
                                                <Award size={20} className="text-yellow-600 mb-1" />
                                                <span className="text-xs font-black dark:text-white truncate w-full text-center px-1">{podiumUsers[0].name.split(' ')[0]}</span>
                                                <span className="text-[9px] font-bold text-yellow-700 dark:text-yellow-500 tracking-tight">{podiumUsers[0].reviewsCount || 0} Ulasan</span>
                                            </div>
                                        </div>
                                    )}
                                    {podiumUsers[2] && (
                                        <div className="flex flex-col items-center animate-in slide-in-from-bottom duration-700 delay-200 flex-1">
                                            <div className="relative mb-3">
                                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-[3px] border-orange-300 shadow-xl overflow-hidden aspect-square ring-4 ring-orange dark:ring-orange-900/10">
                                                    <LazyImage src={podiumUsers[2].avatar_url} className="w-full h-full object-cover" alt="Rank 3" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 bg-orange-300 text-orange-900 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-md border border-white">#3</div>
                                            </div>
                                            <div className="w-full bg-orange-50/50 dark:bg-orange-900/10 rounded-t-2xl flex flex-col items-center justify-center p-3 border-x border-t border-orange-100 dark:border-orange-900/20">
                                                <Medal size={14} className="text-orange-600 mb-1" />
                                                <span className="text-[10px] font-bold dark:text-white truncate w-full text-center px-1">{podiumUsers[2].name.split(' ')[0]}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="py-20 text-center opacity-30 flex flex-col items-center">
                                    <Medal size={48} className="mb-3 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Belum Ada Aktivitas</p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {restOfUsers.map((u, idx) => (
                                    <div key={u.id} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-md group">
                                        <span className="w-6 text-xs font-bold text-gray-400 group-hover:text-orange-500 transition-colors">#{idx + 4}</span>
                                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-700 aspect-square">
                                            <LazyImage src={u.avatar_url} className="w-full h-full object-cover" alt={u.name} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] font-bold dark:text-white truncate uppercase tracking-tight">{u.name}</h4>
                                            <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{u.reviewsCount || 0} Kontribusi</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-700 p-1.5 rounded-lg text-gray-300 group-hover:text-orange-500 transition-colors">
                                            <ArrowRight size={14} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
