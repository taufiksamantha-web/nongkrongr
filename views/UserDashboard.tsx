
import React, { useState, useEffect } from 'react';
import { 
    Heart, MessageSquare, Camera, Crown, Medal, Coffee, User as UserIcon, 
    Star, MapPin, Trash2, History, Utensils, Receipt, Clock, CheckCircle2, ChevronRight, Loader2, PartyPopper, LifeBuoy, Sparkles, Mail, X
} from 'lucide-react';
import { Cafe, Review, AppNotification, Order, OrderItem } from '../types';
import { Button, ConfirmModal, Input, LazyImage, Modal } from '../components/UI';
import { 
    uploadImageToCloudinary, updateUserProfile, fetchUserReviews, toggleFavoriteDB, fetchUserFavorites, fetchUserOrders
} from '../services/dataService';
import { getOptimizedImageUrl, formatRating, getCafeStatus } from '../constants';
import { 
    DashboardLayout, MENU_ITEMS_USER 
} from '../components/DashboardShared';
import { SEO } from '../components/SEO';
import { useSession } from '../components/SessionContext';
import { supabase } from '../lib/supabase';

interface UserDashboardProps {
    user: any;
    onLogout: () => void;
    onHome: () => void;
    cafes: Cafe[]; 
    onCafeSelect: (cafe: Cafe) => void;
    addToast: (type: 'success' | 'error' | 'info', message: string) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    notifications: AppNotification[];
    onMarkRead: (id: string) => void;
    onMarkAllRead: (id: string) => void;
    onDeleteNotification: (id: string) => void;
    onClearAllNotifications: () => void;
    onSupportClick?: () => void; 
    onNotificationClick?: (notification: AppNotification) => void; 
}

const DEFAULT_CAFE_IMG = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2078&auto=format&fit=crop";
const DEFAULT_MENU_IMG = "https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=1974&auto=format&fit=crop";

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
    user, onLogout, onHome, onCafeSelect, addToast, isDarkMode, toggleDarkMode,
    notifications, onMarkRead, onMarkAllRead, onDeleteNotification, onClearAllNotifications, onSupportClick, onNotificationClick
}) => {
    const { updateLocalUser } = useSession(); 
    
    const [activeTab, setActiveTab] = useState('profile');
    const [favorites, setFavorites] = useState<Cafe[]>([]);
    const [userReviews, setUserReviews] = useState<Review[]>([]);
    const [userOrders, setUserOrders] = useState<Order[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null); 
    
    const [editName, setEditName] = useState(user ? user.name : '');
    const [newAvatar, setNewAvatar] = useState<File | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const loadUserData = async () => {
        if (user?.id) {
            setIsLoadingData(true);
            try {
                const [favs, histRaw, orders] = await Promise.all([
                    fetchUserFavorites(user.id),
                    fetchUserReviews(user.id),
                    fetchUserOrders(user.id)
                ]);
                
                setFavorites(favs);
                setUserOrders(orders);

                const histMapped = histRaw.map((r: any) => ({
                    id: r.id, userId: r.user_id, userName: user.name, userAvatar: user.avatar_url,
                    rating: r.rating, comment: r.comment,
                    date: new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
                    reply: r.reply, cafeId: r.cafe_id, cafeName: r.cafes?.name || 'Kafe',
                    cafeImage: r.cafes?.image || '', cafeAddress: r.cafes?.address || 'Lokasi tidak tersedia'
                }));
                setUserReviews(histMapped);
            } catch (e) {
                console.error("Dashboard Load Error:", JSON.stringify(e));
            } finally {
                setIsLoadingData(false);
            }
        }
    };

    useEffect(() => {
        loadUserData();
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id) return;

        const orderChannel = supabase
            .channel(`public:orders:user_id=eq.${user.id}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'orders',
                filter: `user_id=eq.${user.id}`
            }, async (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const updatedOrder = payload.new as any;
                    const statusText = updatedOrder.status === 'ready' ? 'SIAP DIAMBIL! ☕' : updatedOrder.status.toUpperCase();
                    addToast(updatedOrder.status === 'ready' ? 'success' : 'info', `Pesanan ${updatedOrder.order_number}: ${statusText}`);
                    setUserOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o));
                } else {
                    const refreshedOrders = await fetchUserOrders(user.id);
                    setUserOrders(refreshedOrders);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(orderChannel); };
    }, [user?.id]);

    if (!user) return null;

    const handleProfileUpdate = async () => {
        if (!editName.trim()) { addToast('error', 'Nama tidak boleh kosong'); return; }
        setIsSavingProfile(true);
        try {
            let avatarUrl = user.avatar_url;
            if (newAvatar) avatarUrl = await uploadImageToCloudinary(newAvatar);
            await updateUserProfile(user.id, { name: editName, avatar_url: avatarUrl });
            updateLocalUser({ name: editName, avatar_url: avatarUrl });
            setNewAvatar(null);
            addToast('success', 'Profil berhasil diperbarui');
        } catch(e: any) { addToast('error', 'Gagal update profil.'); } finally { setIsSavingProfile(false); }
    };

    const handleRemoveFavorite = async (cafeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(favorites.filter(c => c.id !== cafeId));
        try {
            await toggleFavoriteDB(user.id, cafeId, true);
            const updatedSavedIds = (user.savedCafeIds || []).filter((id: string) => id !== cafeId);
            updateLocalUser({ savedCafeIds: updatedSavedIds });
        } catch(e) { 
            addToast('error', 'Gagal menghapus favorit');
            setFavorites(await fetchUserFavorites(user.id)); 
        }
    };

    const getRank = (count: number) => {
        if (count >= 20) return { title: 'Sultan Nongkrong', color: 'from-yellow-400 to-orange-500', icon: Crown, badge: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' };
        if (count >= 10) return { title: 'Reviewer Handal', color: 'from-blue-400 to-indigo-500', icon: Medal, badge: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' };
        if (count >= 5) return { title: 'Hobi Ngopi', color: 'from-green-400 to-teal-500', icon: Coffee, badge: 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400' };
        return { title: 'Pencinta Kopi', color: 'from-gray-400 to-slate-500', icon: UserIcon, badge: 'text-gray-600 bg-gray-50 dark:bg-slate-800 dark:text-slate-400' };
    };

    const rank = getRank(user.reviewsCount || 0);

    const getHeaderContent = () => {
        switch (activeTab) {
            case 'profile': return { title: `Identity Card`, subtitle: `Ruang pribadimu, ${user.name.split(' ')[0]}.` };
            case 'favorites': return { title: `Tempat Impian`, subtitle: `Daftar kafe yang kamu simpan untuk nanti.` };
            case 'history': return { title: `Jurnal Jejak`, subtitle: `Setiap cerita kopimu terangkum di sini.` };
            case 'orders': return { title: `Struk Digital`, subtitle: `Pantau status hidanganmu secara real-time.` };
            case 'support': return { title: `Bantuan & Layanan`, subtitle: `Kami siap membantumu kapan pun.` };
            default: return { title: 'Dashboard', subtitle: '' };
        }
    };

    const handleTabChange = (tab: string) => tab === 'support' ? (onSupportClick && onSupportClick()) : setActiveTab(tab);
    const { title, subtitle } = getHeaderContent();

    const getOrderStatusStyles = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-500 dark:border-yellow-900/30';
            case 'preparing': return 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30';
            case 'ready': return 'bg-orange-600 text-white border-orange-600 ring-4 ring-orange-500/20 shadow-lg';
            case 'completed': return 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30';
            case 'cancelled': return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30';
            default: return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const translateStatus = (status: string) => {
        const map: any = { 'pending': 'Menunggu', 'preparing': 'Dibuat', 'ready': 'SIAP!', 'completed': 'Selesai', 'cancelled': 'Batal' };
        return map[status] || status;
    };

    return (
        <DashboardLayout 
            user={user} 
            menuItems={MENU_ITEMS_USER} 
            activeTab={activeTab} 
            setActiveTab={handleTabChange} 
            onLogout={() => setShowLogoutConfirm(true)} 
            onHome={onHome} 
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode}
            notifications={notifications}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onDeleteNotification={onDeleteNotification}
            onClearAllNotifications={onClearAllNotifications}
            onNotificationClick={onNotificationClick}
            badges={{ 'orders': userOrders.filter(o => o.status === 'ready').length }}
        >
            <SEO title="Dashboard User" />
            
            <div className="mb-8 md:mb-12 animate-in fade-in duration-700 text-center">
                <h1 className="text-3xl md:text-5xl font-display font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3">{title}</h1>
                <p className="text-gray-500 dark:text-slate-400 text-xs md:text-sm font-medium max-w-lg mx-auto">{subtitle}</p>
            </div>
            
            {isLoadingData ? (
                <div className="flex flex-col items-center justify-center h-80 gap-4 opacity-50">
                    <Loader2 className="animate-spin text-orange-500" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sinkronisasi Data...</p>
                </div>
            ) : (
                <div className="animate-in slide-in-from-bottom-4 duration-700">
                    {activeTab === 'profile' && (
                        <div className="max-w-5xl mx-auto space-y-8">
                            <div className="relative rounded-[3rem] bg-white dark:bg-slate-900 shadow-2xl border border-gray-100 dark:border-white/5 p-8 md:p-12 overflow-hidden group">
                                <div className={`absolute top-0 right-0 w-80 h-80 bg-gradient-to-br ${rank.color} opacity-10 rounded-full blur-[100px] -mr-20 -mt-20 transition-transform duration-1000 group-hover:scale-110`}></div>
                                
                                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                                    <div className="relative shrink-0">
                                        <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr ${rank.color} p-1 shadow-2xl animate-in zoom-in duration-1000`}>
                                            <div className="w-full h-full rounded-full bg-white dark:bg-slate-800 p-1">
                                                <img src={newAvatar ? URL.createObjectURL(newAvatar) : user.avatar_url} className="w-full h-full rounded-full object-cover shadow-inner" alt={user.name} />
                                            </div>
                                        </div>
                                        <label className="absolute bottom-1 right-1 p-3 bg-gray-900 dark:bg-orange-600 text-white rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-transform active:scale-95 border-2 border-white dark:border-slate-900 z-20">
                                            <Camera size={18} />
                                            <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { if (file.size > 5 * 1024 * 1024) { addToast('error', 'Maksimal 5MB!'); return; } setNewAvatar(file); } }} accept="image/*" />
                                        </label>
                                    </div>

                                    <div className="text-center md:text-left flex-1 min-w-0">
                                        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
                                            <h2 className="text-3xl md:text-4xl font-display font-black text-gray-900 dark:text-white tracking-tight leading-none truncate">{user.name}</h2>
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${rank.badge} shrink-0`}>
                                                <rank.icon size={14} className="animate-pulse" /> {rank.title}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 text-gray-500 dark:text-slate-400 font-bold text-xs mb-8">
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-xl border dark:border-white/5"><Mail size={14} className="text-orange-500" /> {user.email}</div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-xl border dark:border-white/5"><Clock size={14} className="text-orange-500" /> Joined {new Date(user.created_at).getFullYear()}</div>
                                        </div>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3 items-center">
                                            <div className="flex-1 w-full">
                                                <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Ubah nama..." className="bg-gray-50 dark:bg-slate-800 border-none h-12 pl-6 rounded-2xl font-bold text-sm dark:text-white" />
                                            </div>
                                            <Button onClick={handleProfileUpdate} isLoading={isSavingProfile} className="h-12 px-8 rounded-2xl shadow-xl w-full sm:w-auto text-sm">Update Profil</Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-10 border-t border-gray-50 dark:border-white/5">
                                    {[
                                        { label: 'Favorit', value: favorites.length, icon: Heart, color: 'text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
                                        { label: 'Ulasan', value: user.reviewsCount || 0, icon: MessageSquare, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
                                        { label: 'Pesanan', value: userOrders.length, icon: Receipt, color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
                                        { label: 'Poin', value: (user.reviewsCount || 0) * 10, icon: Sparkles, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400' },
                                    ].map((stat, i) => (
                                        <div key={i} className="flex flex-col items-center p-5 rounded-[2rem] hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${stat.color}`}><stat.icon size={20} /></div>
                                            <span className="text-xl font-black text-gray-900 dark:text-white">{stat.value}</span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500 mt-1">{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'favorites' && (
                        <div className="space-y-8 pb-20">
                            {favorites.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                    {favorites.map(cafe => {
                                        const status = getCafeStatus(cafe.openingHours);
                                        return (
                                            <div key={cafe.id} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl border border-gray-100 dark:border-white/5 transition-all duration-700 hover:-translate-y-2 cursor-pointer ring-1 ring-black/5" onClick={() => onCafeSelect(cafe)}>
                                                <div className="aspect-[4/5] relative overflow-hidden">
                                                    <LazyImage src={getOptimizedImageUrl(cafe.image, 800)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={cafe.name} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity"></div>
                                                    
                                                    <div className="absolute top-5 left-5 right-5 flex justify-between items-start">
                                                        <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg border border-white/20 ${status.isOpen ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                                            {status.text}
                                                        </div>
                                                        <button onClick={(e) => handleRemoveFavorite(cafe.id, e)} className="p-3 bg-black/40 backdrop-blur-md text-white hover:bg-red-500 rounded-full transition-all shadow-lg active:scale-90 border border-white/10 group/btn">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>

                                                    <div className="absolute bottom-6 left-6 right-6">
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= Math.round(cafe.rating) ? "text-yellow-400 fill-current" : "text-white/30"} />)}
                                                            <span className="text-[10px] font-black text-white/50 ml-1">{formatRating(cafe.rating)}</span>
                                                        </div>
                                                        <h3 className="text-white font-display font-black text-xl truncate mb-1 leading-tight group-hover:text-orange-400 transition-colors uppercase tracking-tight">{cafe.name}</h3>
                                                        <p className="text-white/60 text-[10px] truncate flex items-center gap-2 font-bold tracking-wider uppercase">
                                                            <MapPin size={12} className="text-orange-500" /> {cafe.address.split(',')[0]}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-white/5 flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                        <Heart size={40} className="text-gray-200 dark:text-slate-700" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-800 dark:text-white uppercase">Koleksi Kosong</h3>
                                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-2 font-medium px-10 mb-8">Simpan kafe favoritmu untuk melihatnya di galeri ini.</p>
                                    <Button onClick={onHome} className="h-14 px-12 text-sm shadow-xl shadow-orange-500/20 w-full sm:w-auto mx-auto max-w-[280px]">Mulai Jelajah</Button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="max-w-4xl mx-auto space-y-5 pb-20">
                            {userOrders.length > 0 ? (
                                userOrders.map(order => (
                                    <div key={order.id} className={`bg-white dark:bg-slate-900 rounded-[2.2rem] p-5 md:p-7 shadow-xl border flex flex-col md:flex-row gap-6 relative overflow-hidden group transition-all duration-500 ${order.status === 'ready' ? 'border-orange-500 ring-2 ring-orange-500/10' : 'border-gray-50 dark:border-white/5 hover:border-orange-100 dark:hover:border-orange-500/30'}`}>
                                        <div className="w-full md:w-36 h-36 rounded-3xl overflow-hidden shrink-0 bg-gray-50 dark:bg-slate-800 shadow-inner relative">
                                            <LazyImage src={order.cafes?.image || DEFAULT_CAFE_IMG} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                            <div className="absolute bottom-3 left-3 text-[9px] font-black text-white/80 tracking-widest uppercase">{new Date(order.created_at).toLocaleDateString('id-ID', {month:'short', day:'numeric'})}</div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start gap-4 mb-4">
                                                    <div className="min-w-0">
                                                        <h4 className="font-display font-black text-xl text-gray-900 dark:text-white mb-0.5 leading-none group-hover:text-orange-600 transition-colors truncate uppercase">{order.cafes?.name || 'Kafe'}</h4>
                                                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-[0.25em]">{order.order_number}</p>
                                                    </div>
                                                    <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border transition-all duration-500 shadow-sm shrink-0 ${getOrderStatusStyles(order.status)}`}>
                                                        {translateStatus(order.status)}
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-4 items-center">
                                                    <div className="flex -space-x-2.5 overflow-hidden">
                                                        {order.order_items?.slice(0, 4).map((item, i) => (
                                                            <div key={i} className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 bg-gray-100 dark:bg-slate-800 overflow-hidden shadow-sm ring-1 ring-gray-100 dark:ring-white/5" title={item.menu_item?.name}>
                                                                <LazyImage src={item.menu_item?.image_url || DEFAULT_MENU_IMG} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                        ))}
                                                        {(order.order_items?.length || 0) > 4 && (
                                                            <div className="w-9 h-9 rounded-full border-2 border-white dark:border-slate-900 bg-gray-900 dark:bg-orange-600 flex items-center justify-center text-[9px] font-black text-white shadow-sm ring-1 ring-gray-100 dark:ring-white/5">
                                                                +{(order.order_items?.length || 0) - 4}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{order.order_items?.length || 0} Menu • {order.order_type === 'dine-in' ? `Meja ${order.table_number}` : 'Takeaway'}</span>
                                                </div>
                                            </div>

                                            <div 
                                                className="mt-6 pt-5 border-t border-gray-50 dark:border-white/5 flex items-center justify-between cursor-pointer hover:bg-orange-50/50 dark:hover:bg-orange-900/10 -mx-2 px-2 rounded-xl transition-colors group/bill"
                                                onClick={() => setSelectedOrder(order)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 shadow-inner group-hover/bill:bg-orange-500 group-hover/bill:text-white transition-colors"><Receipt size={18} /></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black text-gray-300 dark:text-slate-600 uppercase tracking-widest leading-none mb-1">Bill Amount</span>
                                                        <span className="text-lg font-black text-gray-900 dark:text-white tracking-tight group-hover/bill:text-orange-600 transition-colors">Rp {order.total_amount.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <button className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-slate-800 text-gray-400 flex items-center justify-center group-hover/bill:bg-orange-500 group-hover/bill:text-white transition-all active:scale-90">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border border-gray-100 dark:border-white/5">
                                    <Receipt size={48} className="mx-auto mb-6 text-gray-200 dark:text-slate-700" />
                                    <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase">Belum Ada Transaksi</h3>
                                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-2 font-medium">Struk digital pesananmu akan tersimpan di sini.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="max-w-4xl mx-auto pb-20">
                            {userReviews.length > 0 ? (
                                <div className="relative space-y-10 pl-12 md:pl-0">
                                    <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-orange-500 via-gray-100 dark:via-slate-800 to-transparent transform md:-translate-x-1/2 opacity-20"></div>
                                    
                                    {userReviews.map((review, idx) => (
                                        <div key={review.id} className={`relative flex flex-col md:flex-row items-center gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                            <div className="absolute left-[-24px] md:left-1/2 top-0 transform md:-translate-x-1/2 z-10 flex flex-col items-center">
                                                <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl border-4 border-orange-500 shadow-xl flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-[9px] font-black text-orange-600 leading-none">{review.date.split(' ')[0]}</span>
                                                    <span className="text-[7px] font-bold text-gray-400 uppercase leading-none mt-0.5">{review.date.split(' ')[1].slice(0,3)}</span>
                                                </div>
                                            </div>

                                            <div className="w-full md:w-[46%] animate-in slide-in-from-left duration-500">
                                                <div className="bg-white dark:bg-slate-900 rounded-[2.2rem] p-6 shadow-xl border border-gray-50 dark:border-white/5 hover:shadow-2xl transition-all duration-500 group relative">
                                                    <div className="flex items-start gap-4 mb-4">
                                                        <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-gray-50 dark:bg-slate-800 shadow-md">
                                                            <LazyImage src={getOptimizedImageUrl(review.cafeImage || '', 200)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pt-1">
                                                            <h4 className="font-display font-black text-base text-gray-900 dark:text-white truncate leading-none mb-2 uppercase tracking-tight">{review.cafeName}</h4>
                                                            <div className="flex items-center gap-1">
                                                                {[1,2,3,4,5].map(s => <Star key={s} size={10} className={s <= review.rating ? "text-orange-500 fill-current" : "text-gray-100 dark:text-slate-800"} />)}
                                                                <span className="text-[9px] font-black text-orange-600 ml-2 uppercase tracking-widest">{review.rating}.0 RATING</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute top-0 left-0 text-4xl font-serif text-gray-50 dark:text-slate-800 -mt-3 -ml-1 pointer-events-none">“</span>
                                                        <p className="text-gray-600 dark:text-slate-300 text-xs md:text-sm italic leading-relaxed font-medium relative z-10 pl-3">{review.comment}</p>
                                                    </div>
                                                    {review.reply && (
                                                        <div className="mt-5 pt-4 border-t border-gray-50 dark:border-white/5 flex gap-3">
                                                            <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 shrink-0"><Utensils size={12} /></div>
                                                            <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-relaxed italic"><span className="font-black text-orange-600 uppercase tracking-tighter mr-1">Owner:</span> {review.reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="hidden md:block w-[46%]"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-32 bg-white dark:bg-slate-900 rounded-[3rem] border border-gray-100 dark:border-white/5">
                                    <History size={48} className="mx-auto mb-6 text-gray-200 dark:text-slate-700" />
                                    <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase">Belum Ada Jejak</h3>
                                    <p className="text-gray-400 dark:text-slate-500 text-xs mt-2 font-medium">Beri ulasan pertamamu dan abadikan momen ngopimu!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            
            <Modal 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                title="Detail Pesanan"
                className="!max-w-md w-full dark:!bg-slate-900"
            >
                {selectedOrder && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 border-b border-gray-100 dark:border-white/5 pb-6">
                            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0">
                                <LazyImage src={selectedOrder.cafes?.image || DEFAULT_CAFE_IMG} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-black text-lg text-gray-900 dark:text-white truncate uppercase">{selectedOrder.cafes?.name}</h3>
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{selectedOrder.order_number}</p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase mt-1">{new Date(selectedOrder.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Item yang dipesan</h4>
                            {selectedOrder.order_items?.map((item: OrderItem) => (
                                <div key={item.id} className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm">{item.menu_item?.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">{item.quantity}x @ Rp {item.price_at_order.toLocaleString()}</p>
                                        {item.notes && <p className="text-[10px] text-orange-600 italic mt-1 font-medium bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg inline-block">Notes: {item.notes}</p>}
                                    </div>
                                    <p className="font-black text-gray-900 dark:text-white text-sm">Rp {(item.quantity * item.price_at_order).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-gray-500 dark:text-slate-400">
                                <span>Tipe Pesanan</span>
                                <span className="uppercase tracking-widest text-gray-900 dark:text-white">{selectedOrder.order_type === 'dine-in' ? `Dine In (Meja ${selectedOrder.table_number})` : 'Takeaway'}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-gray-100 dark:border-white/5 pt-3">
                                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Total Bayar</span>
                                <span className="text-xl font-black text-orange-600">Rp {selectedOrder.total_amount.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl text-center font-black text-xs uppercase tracking-widest border ${getOrderStatusStyles(selectedOrder.status)}`}>
                            Status: {translateStatus(selectedOrder.status)}
                        </div>

                        <Button onClick={() => setSelectedOrder(null)} className="w-full h-14 rounded-2xl">Tutup Detail</Button>
                    </div>
                )}
            </Modal>

            <ConfirmModal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={onLogout} title="Konfirmasi Keluar" message="Apakah Anda yakin ingin mengakhiri sesi nongkrong ini?" />
        </DashboardLayout>
    );
};
