
import { supabase } from '../lib/supabase';
import { Cafe, Review, User, AppNotification, NearbyUser, SupportRoom, SupportMessage, CollectionItem, HeroConfig, MenuItem, Order, OrderItem } from '../types';
import { calculateDistance, VAPID_PUBLIC_KEY, DEFAULT_USER_AVATAR, DEFAULT_OWNER_AVATAR, getCafeStatus } from '../constants';

// --- UTILS ---

export const debounce = (fn: Function, ms: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
};

export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
        if (!res.ok) throw new Error("API Geocode Unreachable");
        const data = await res.json();
        const addr = data.address;
        if (!addr) return 'Lokasi Terdeteksi';

        let areaName = addr.city || addr.town || addr.county || addr.city_district || addr.state_district || 'Lokasi Terdeteksi';
        
        const cleanName = areaName
            .replace(/Kota /gi, '')
            .replace(/Kabupaten /gi, '')
            .replace(/Regency /gi, '')
            .trim();
            
        return cleanName;
    } catch (error) {
        console.warn("Geocode failed:", error);
        return 'Lokasi Terdeteksi';
    }
};

export const searchLocationOnline = async (query: string): Promise<any[]> => {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=id&limit=5`);
        if (!res.ok) throw new Error("Search API Unreachable");
        const data = await res.json();
        return (data || []).map((item: any) => ({
            name: item.display_name.split(',')[0],
            fullName: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon)
        }));
    } catch {
        return [];
    }
};

// --- CAFE HELPERS ---

export const createCafeSlug = (cafe: Cafe): string => {
    return `${cafe.name.toLowerCase().replace(/\s+/g, '-')}-${cafe.id}`;
};

const mapCafeFromDB = (dbCafe: any): Cafe => ({
    id: String(dbCafe.id),
    name: dbCafe.name,
    description: dbCafe.description || '',
    rating: Number(dbCafe.rating) || 0,
    reviewsCount: dbCafe.reviews_count || 0,
    address: dbCafe.address || '',
    coordinates: { 
        lat: Number(dbCafe.latitude) || 0, 
        lng: Number(dbCafe.longitude) || 0 
    },
    image: dbCafe.image || '',
    images: dbCafe.images || [],
    tags: dbCafe.tags || [],
    facilities: dbCafe.facilities || [],
    priceRange: dbCafe.price_range || '',
    isOpen: dbCafe.is_open !== false,
    is_verified: dbCafe.is_verified || false,
    status: dbCafe.status,
    openingHours: dbCafe.opening_hours,
    photoSpots: dbCafe.photo_spots,
    owner_id: dbCafe.owner_id,
    promos: dbCafe.promos || [],
    events: dbCafe.events || [],
    phoneNumber: dbCafe.phone_number,
    created_at: dbCafe.created_at,
    dist: dbCafe.dist !== undefined ? Number(dbCafe.dist) : undefined
});

// --- DATA FETCHING ---

export const fetchDashboardStats = async (city?: string) => {
    try {
        // Pembersihan nama kota untuk pencarian alamat
        const cleanCity = (city === 'Lokasi Saya' || city === 'Lokasi Terdeteksi' || city === 'Mencari Lokasi...') ? '' : city;
        
        // Ambil data minimal (opening_hours, promos, is_open) dari semua kafe aktif di kota tersebut
        let query = supabase
            .from('cafes')
            .select('opening_hours, promos, is_open')
            .eq('status', 'active');

        if (cleanCity) {
            query = query.ilike('address', `%${cleanCity}%`);
        }

        const { data, error } = await query;
        if (error || !data) return { promoCount: 0, openCount: 0 };

        let promoCount = 0;
        let openCount = 0;

        // Loop data untuk kalkulasi real-time
        data.forEach(cafe => {
            // 1. Cek Promo (Harus array dan tidak kosong)
            if (cafe.promos && Array.isArray(cafe.promos) && cafe.promos.length > 0) {
                promoCount++;
            }

            // 2. Cek Jam Operasional menggunakan logic getCafeStatus (Time-Aware)
            const status = getCafeStatus(cafe.opening_hours, cafe.is_open);
            if (status.isOpen) {
                openCount++;
            }
        });
        
        return { promoCount, openCount };
    } catch (e) {
        console.error("Dashboard Stats Error:", e);
        return { promoCount: 0, openCount: 0 };
    }
};

export const fetchCafeBySlug = async (slug: string): Promise<Cafe | null> => {
    const parts = slug.split('-');
    const id = parts[parts.length - 1];
    if (!id) return null;
    
    try {
        const { data, error } = await supabase
            .from('cafes')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        
        if (error) throw error;
        return data ? mapCafeFromDB(data) : null;
    } catch (err) {
        return null;
    }
};

export const fetchCafesPaginated = async (
    page: number, 
    limit: number, 
    query: string = '', 
    status: string = 'active', 
    city?: string,
    userLocation?: { lat: number, lng: number } | null,
    sortBy: string = 'distance',
    maxDistance: number = 50 
) => {
    const isFallbackCity = !city || city === 'Lokasi Saya' || city === 'Lokasi Terdeteksi' || city === 'Mencari Lokasi...';
    const effectiveCity = (query.trim().length > 0) ? '' : (isFallbackCity ? '' : city);
    const effectiveMaxDistance = (!isFallbackCity && !userLocation) ? 9999 : maxDistance;

    const lat = typeof userLocation?.lat === 'number' ? userLocation.lat : -2.9761;
    const lng = typeof userLocation?.lng === 'number' ? userLocation.lng : 104.7754;

    try {
        const { data, error } = await supabase.rpc('get_cafes_with_metadata', {
            user_lat: lat, 
            user_lng: lng,
            search_text: query.trim(),
            city_filter: effectiveCity,
            status_filter: status,
            sort_by: sortBy,
            limit_count: limit,
            offset_count: (page - 1) * limit
        });
        
        if (error) throw error;
        
        let mappedData = (data || []).map(mapCafeFromDB);

        if (userLocation) {
            mappedData = mappedData.map(cafe => {
                cafe.dist = calculateDistance(lat, lng, cafe.coordinates.lat, cafe.coordinates.lng);
                return cafe;
            });
            
            if (effectiveMaxDistance < 9999) {
                mappedData = mappedData.filter(cafe => (cafe.dist || 0) <= effectiveMaxDistance);
            }
        }

        return { data: mappedData, total: 0 };
    } catch (e) {
        try {
            let q = supabase.from('cafes').select('*').eq('status', status);
            if (effectiveCity) q = q.ilike('address', `%${effectiveCity}%`);
            if (query.trim()) q = q.or(`name.ilike.%${query}%,address.ilike.%${query}%,description.ilike.%${query}%`);
            
            if (sortBy === 'rating') q = q.order('rating', { ascending: false });
            else if (sortBy === 'newest') q = q.order('created_at', { ascending: false });
            else q = q.order('name', { ascending: true });

            const { data: basicData, error: basicError } = await q.range((page - 1) * limit, page * limit - 1);
            if (basicError) throw basicError;

            let mappedData = (basicData || []).map(mapCafeFromDB);
            if (userLocation) {
                mappedData = mappedData.map(cafe => {
                    cafe.dist = calculateDistance(lat, lng, cafe.coordinates.lat, cafe.coordinates.lng);
                    return cafe;
                });
                
                if (sortBy === 'distance') {
                    mappedData.sort((a, b) => (a.dist || 0) - (b.dist || 0));
                }

                if (effectiveMaxDistance < 9999) {
                    mappedData = mappedData.filter(cafe => (cafe.dist || 0) <= effectiveMaxDistance);
                }
            }
            return { data: mappedData, total: 0 };
        } catch (err) {
            console.error("Critical error fetching cafes:", err instanceof Error ? err.message : err);
            return { data: [], total: 0 };
        }
    }
};

export const fetchCollectionsFromDB = async (): Promise<CollectionItem[]> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'collections_config')
            .maybeSingle();
        
        if (error) return [];
        if (data && data.value) {
            return Array.isArray(data.value) ? data.value : [];
        }
        return [];
    } catch (e) {
        return [];
    }
};

export const fetchHeroConfig = async (): Promise<HeroConfig | null> => {
    try {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'hero_config').maybeSingle();
        if (error) throw error;
        return data?.value || null;
    } catch (err) {
        return null;
    }
};

export const fetchPromosByLocation = async (cityFilter?: string, coords?: { lat: number, lng: number }): Promise<Cafe[]> => {
    try {
        let query = supabase.from('cafes').select('*').eq('status', 'active').not('promos', 'is', null);
        if (cityFilter && cityFilter !== 'Lokasi Saya' && cityFilter !== 'Lokasi Terdeteksi') {
            query = query.ilike('address', `%${cityFilter}%`);
        }
        const { data } = await query.limit(100);
        if (!data) return [];
        let mapped = data.map(mapCafeFromDB).filter(c => c.promos && c.promos.length > 0);
        if (coords) {
            mapped = mapped.map(c => ({ ...c, dist: calculateDistance(coords.lat, coords.lng, c.coordinates.lat, c.coordinates.lng) }))
                          .filter(c => (c.dist || 0) <= 50).sort((a,b) => (a.dist||0) - (b.dist||0));
        }
        return mapped;
    } catch (err) {
        return [];
    }
};

export const loginUser = async (id: string, p: string) => {
    let email = id.trim();
    if (!email.includes('@')) {
        const { data } = await supabase.from('profiles').select('email').eq('username', email.toLowerCase()).maybeSingle();
        if (data?.email) email = data.email;
    }
    return await supabase.auth.signInWithPassword({ email, password: p });
};

export const sendPasswordResetEmail = async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/auth/update-password`,
    });
};

export const updateUserPassword = async (newPassword: string) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
};

export const registerUser = async (e: string, p: string, m: any) => {
    return await supabase.auth.signUp({ email: e, password: p, options: { data: { name: m.name, username: m.username, role: m.role } } });
};

export const signOutUser = async () => { await supabase.auth.signOut(); };

export const getUserProfile = async (id: string): Promise<User | null> => {
    try {
        const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
        if (pError || !profile) return null;

        const { data: favorites } = await supabase.from('favorites').select('cafe_id').eq('user_id', id);
        const savedCafeIds = favorites?.map(f => String(f.cafe_id)) || [];

        const { count: reviewsCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('user_id', id);

        return {
            id: profile.id, name: profile.name, username: profile.username, email: profile.email, role: profile.role,
            avatar_url: profile.avatar_url || DEFAULT_USER_AVATAR, isLocationShared: profile.is_location_shared,
            reviewsCount: reviewsCount || 0, isOnboarded: profile.is_onboarded, preferences: profile.preferences,
            savedCafeIds: savedCafeIds, created_at: profile.created_at, last_location: profile.last_location
        };
    } catch (err) {
        console.error("Error in getUserProfile:", err instanceof Error ? err.message : err);
        return null;
    }
};

export const ensureUserProfile = async (authUser: any): Promise<User | null> => {
    try {
        const { data: existing } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
        if (existing) return getUserProfile(existing.id);
        const role = authUser.user_metadata?.role || 'USER';
        const { data: created } = await supabase.from('profiles').insert({
            id: authUser.id, email: authUser.email, name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
            username: authUser.user_metadata?.username || `user_${authUser.id.slice(0, 8)}`,
            role: role, avatar_url: role === 'USER' ? DEFAULT_USER_AVATAR : DEFAULT_OWNER_AVATAR
        }).select().maybeSingle();
        return created ? getUserProfile(created.id) : null;
    } catch (err) {
        return null;
    }
};

export const updateUserProfile = async (id: string, updates: any) => {
    try {
        const dbMap: any = { ...updates };
        if (updates.isLocationShared !== undefined) { dbMap.is_location_shared = updates.isLocationShared; delete dbMap.isLocationShared; }
        if (updates.isOnboarded !== undefined) { dbMap.is_onboarded = updates.isOnboarded; delete dbMap.isOnboarded; }
        if (updates.savedCafeIds !== undefined) { delete dbMap.savedCafeIds; } 
        const { error } = await supabase.from('profiles').update(dbMap).eq('id', id);
        if (error) throw error;
    } catch (err) {
        throw err;
    }
};

export const updateUserLocationDB = async (id: string, lat: number, lng: number) => {
    try {
        await supabase.from('profiles').update({ last_location: { lat, lng }, last_active_at: new Date().toISOString() }).eq('id', id);
    } catch (err) {
        console.warn("Location update failed:", err instanceof Error ? err.message : err);
    }
};

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'nongkrongr_preset');
    const res = await fetch(`https://api.cloudinary.com/v1_1/dovouihq8/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
};

export const fetchCafeReviewsPaginated = async (id: string, p: number, l: number) => {
    try {
        const from = (p - 1) * l; const to = from + l - 1;
        const { data, count } = await supabase.from('reviews').select(`*, profiles(name, avatar_url, role)`, { count: 'exact' }).eq('cafe_id', id).order('created_at', { ascending: false }).range(from, to);
        return { data: (data || []).map((r: any) => ({
            id: r.id, userId: r.user_id, userName: r.profiles?.name, userAvatar: r.profiles?.avatar_url || DEFAULT_USER_AVATAR,
            rating: r.rating, comment: r.comment, date: r.created_at, reply: r.reply, userRole: r.profiles?.role
        })), total: count || 0 };
    } catch (err) {
        return { data: [], total: 0 };
    }
};

export const createReview = async (cid: string, uid: string, r: number, c: string) => {
    const { error } = await supabase.from('reviews').insert({ cafe_id: cid, user_id: uid, rating: r, comment: c });
    if (error) throw error;
};

export const toggleFavoriteDB = async (uid: string, cid: string, isCurrentlySaved: boolean) => {
    if (isCurrentlySaved) {
        const { error } = await supabase.from('favorites').delete().match({ user_id: uid, cafe_id: cid });
        if (error) throw error;
    } else {
        const { error = null } = await supabase.from('favorites').insert({ user_id: uid, cafe_id: cid });
        if (error) throw error;
    }
};

export const fetchUserFavorites = async (uid: string): Promise<Cafe[]> => {
    try {
        const { data, error } = await supabase
            .from('favorites')
            .select(`cafe_id, cafes (*)`)
            .eq('user_id', uid);
        
        if (error) throw error;
        return (data || [])
            .filter(item => item.cafes)
            .map(item => mapCafeFromDB(item.cafes));
    } catch (err) {
        return [];
    }
};

export const fetchUserReviews = async (uid: string) => {
    try {
        const { data, error } = await supabase.from('reviews').select('*, cafes(name, image, address)').eq('user_id', uid).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        return [];
    }
};

export const submitReport = async (cid: string, uid: string | undefined, r: string, d: string) => {
    await supabase.from('reports').insert({ cafe_id: cid, user_id: uid, reason: r, description: d });
};

export const fetchLeaderboardUsers = async (city?: string): Promise<User[]> => {
    try {
        let query = supabase
            .from('reviews')
            .select(`user_id, profiles(id, name, username, avatar_url, role, last_location), cafes!inner(address)`)
            .order('created_at', { ascending: false });
        
        if (city && city !== 'Lokasi Saya' && city !== 'Lokasi Terdeteksi' && city !== 'Mencari Lokasi...') {
            query = query.ilike('cafes.address', `%${city}%`);
        }
        
        const { data, error } = await query.limit(400); 
        if (error) throw error;
        
        const userMap = new Map<string, { profile: any, count: number }>();
        (data || []).forEach((rev: any) => {
            if (!rev.profiles) return;
            const uid = rev.user_id;
            const existing = userMap.get(uid);
            if (existing) {
                existing.count += 1;
            } else {
                userMap.set(uid, { profile: rev.profiles, count: 1 });
            }
        });

        return Array.from(userMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 20)
            .map(item => ({
                id: item.profile.id,
                name: item.profile.name,
                username: item.profile.username,
                avatar_url: item.profile.avatar_url || DEFAULT_USER_AVATAR,
                role: item.profile.role,
                reviewsCount: item.count,
                last_location: item.profile.last_location
            })) as any;
    } catch (err) {
        return [];
    }
};

export const fetchCommunityReviewsPaginated = async (p: number, l: number, userLoc?: { lat: number, lng: number } | null) => {
    try {
        const from = (p - 1) * l; const to = from + l - 1;
        let q = supabase.from('reviews').select(`*, profiles(name, avatar_url, role), cafes(name, image, address, latitude, longitude)`, { count: 'exact' });
        const { data, count, error } = await q.order('created_at', { ascending: false });
        if (error) throw error;

        let mappedData = (data || []).map((r: any) => ({
            id: r.id, userId: r.user_id, userName: r.profiles?.name, userAvatar: r.profiles?.avatar_url || DEFAULT_USER_AVATAR,
            rating: r.rating, comment: r.comment, date: r.created_at, reply: r.reply, userRole: r.profiles?.role,
            cafeId: r.cafe_id, cafeName: r.cafes?.name, cafeImage: r.cafes?.image, cafeAddress: r.cafes?.address,
            cafeLat: r.cafes?.latitude, cafeLng: r.cafes?.longitude
        }));

        if (userLoc) {
            mappedData = mappedData.filter(r => {
                if (r.cafeLat === undefined || r.cafeLng === undefined) return true;
                const dist = calculateDistance(userLoc.lat, userLoc.lng, r.cafeLat, r.cafeLng);
                return dist <= 50;
            });
        }

        const paginatedData = mappedData.slice(from, to + 1);
        return { data: paginatedData, total: userLoc ? mappedData.length : (count || 0) };
    } catch (err) {
        return { data: [], total: 0 };
    }
};

export const fetchNearbyUsers = async (lat: number, lng: number, r: number, uid: string): Promise<NearbyUser[]> => {
    try {
        const { data, error } = await supabase.rpc('get_nearby_users', { lat, lng, radius_km: r, current_user_id: uid });
        if (error) throw error;
        return (data || []).map((u: any) => ({
            id: u.id, name: u.name, avatar_url: u.avatar_url || DEFAULT_USER_AVATAR, role: u.role, distance: u.distance, isOnline: u.is_online, lastActive: u.last_active_at
        }));
    } catch(e) { 
        return []; 
    }
};

export const toggleLocationSharingDB = async (uid: string, s: boolean) => {
    await supabase.from('profiles').update({ is_location_shared: s }).eq('id', uid);
};

export const sendWave = async (fid: string, tid: string, fname: string) => {
    await supabase.from('notifications').insert({ user_id: tid, type: 'wave', title: 'Seseorang menyapamu! 👋', message: `${fname} melambaikan tangan padamu dari radar!`, target_id: fid });
};

export const fetchNotifications = async (uid: string): Promise<AppNotification[]> => {
    try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50);
        if (error) throw error;
        return (data || []).map(n => ({ id: n.id, title: n.title, message: n.message, type: n.type, isRead: n.is_read, time: n.created_at, targetId: n.target_id }));
    } catch (err) {
        return [];
    }
};

export const markNotificationReadDB = async (id: string) => { await supabase.from('notifications').update({ is_read: true }).eq('id', id); };
export const markAllNotificationsReadDB = async (uid: string) => { await supabase.from('notifications').update({ is_read: true }).eq('user_id', uid); };
export const deleteNotificationDB = async (id: string) => { await supabase.from('notifications').delete().eq('id', id); };
export const deleteAllNotificationsDB = async (uid: string) => { await supabase.from('notifications').delete().eq('user_id', uid); };

export const subscribeUserToPush = async (uid: string) => {
    if (!('serviceWorker' in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY });
        await supabase.from('push_subscriptions').upsert({ user_id: uid, endpoint: sub.endpoint, keys: sub.toJSON().keys });
    } catch (e) {}
};

export const getOrCreateSupportRoom = async (uid: string): Promise<SupportRoom | null> => {
    try {
        const { data: ex } = await supabase.from('support_rooms').select('*').eq('user_id', uid).eq('status', 'open').limit(1).maybeSingle();
        if (ex) return ex;
        const { data: cr } = await supabase.from('support_rooms').insert({ user_id: uid, status: 'open' }).select().maybeSingle();
        return cr;
    } catch (err) {
        return null;
    }
};

export const fetchUserSupportRooms = async (uid: string): Promise<SupportRoom[]> => {
    try {
        const { data, error = null } = await supabase.from('support_rooms').select('*').eq('user_id', uid).order('updated_at', { ascending: false });
        if (error) throw error;
        return data || [];
    } catch (err) {
        return [];
    }
};

export const fetchSupportMessages = async (rid: string): Promise<SupportMessage[]> => {
    try {
        const { data, error } = await supabase.from('support_messages').select('*').eq('room_id', rid).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    } catch (err) {
        return [];
    }
};

export const sendSupportMessage = async (rid: string, sid: string, m: string) => {
    await supabase.from('support_messages').insert({ room_id: rid, sender_id: sid, message: m });
    await supabase.from('support_rooms').update({ updated_at: new Date().toISOString() }).eq('id', rid);
};

export const countUnreadSupportMessages = async (uid: string): Promise<number> => {
    try {
        const { data } = await supabase.from('support_rooms').select('id').eq('user_id', uid);
        if (!data?.length) return 0;
        const { count } = await supabase.from('support_messages').select('*', { count: 'exact', head: true }).in('room_id', data.map(r => r.id)).eq('is_read', false).neq('sender_id', uid);
        return count || 0;
    } catch {
        return 0;
    }
};

export const fetchCafesInBounds = async (minLat: number, maxLat: number, minLng: number, maxLng: number): Promise<Cafe[]> => {
    try {
        const { data, error } = await supabase
            .from('cafes')
            .select('*')
            .eq('status', 'active')
            .gte('latitude', minLat)
            .lte('latitude', maxLat)
            .gte('longitude', minLng)
            .lte('longitude', maxLng);
        
        if (error) throw error;
        return (data || []).map(mapCafeFromDB);
    } catch (err) {
        return [];
    }
};

export const fetchMenuItems = async (cafeId: string): Promise<MenuItem[]> => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select('*')
            .eq('cafe_id', cafeId);
        
        if (error) throw error;
        return (data || []).map(item => ({
            ...item,
            id: String(item.id),
            cafe_id: String(item.cafe_id)
        }));
    } catch (err) {
        return [];
    }
};

export const fetchUserOrders = async (userId: string): Promise<Order[]> => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*, cafes(name, image), order_items(*, menu_items(*))')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return (data || []).map(order => ({
            ...order,
            id: String(order.id),
            cafe_id: String(order.cafe_id),
            order_items: (order.order_items || []).map((item: any) => ({
                ...item,
                id: String(item.id),
                order_id: String(item.order_id),
                menu_item_id: String(item.menu_item_id),
                menu_item: item.menu_items
            }))
        }));
    } catch (err) {
        return [];
    }
};

export const createOrder = async (orderData: any, items: OrderItem[]) => {
    const orderNumber = `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const { cafe_owner_id, ...cleanOrderData } = orderData;
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
            ...cleanOrderData,
            status: 'pending',
            order_number: orderNumber
        })
        .select()
        .single();
    
    if (orderError) throw orderError;

    const orderItems = items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price_at_order: item.price_at_order,
        notes: item.notes
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
    
    if (itemsError) throw itemsError;

    if (cafe_owner_id) {
        const locationText = orderData.order_type === 'dine-in' 
            ? `Meja ${orderData.table_number}` 
            : 'Pesanan Takeaway';

        await supabase.from('notifications').insert({
            user_id: cafe_owner_id,
            type: 'info',
            title: 'Pesanan Baru Masuk! ☕',
            message: `${orderData.customer_name} memesan dari ${locationText}. Segera cek dashboard partner!`,
            target_id: orderData.cafe_id
        });
    }
    
    return order;
};
