import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cafe, Review, Tag } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// --- Cache Management ---
const CACHE_KEY = 'nongkrongr_cached_cafes';

const getCachedCafes = (): Cafe[] | null => {
    try {
        const cachedData = sessionStorage.getItem(CACHE_KEY);
        if (cachedData) return JSON.parse(cachedData);
    } catch (error) {
        console.error("Failed to read cafe cache:", error);
        sessionStorage.removeItem(CACHE_KEY);
    }
    return null;
};

const setCachedCafes = (cafes: Cafe[]) => {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cafes));
    } catch (error) {
        console.error("Failed to write to cafe cache:", error);
    }
};

// --- Client-Side Data Processing ---
const calculateAverages = (cafe: Cafe): Cafe => {
    const approvedReviews = cafe.reviews?.filter(r => r.status === 'approved') || [];
    if (approvedReviews.length === 0) {
        return { 
            ...cafe, 
            avgAestheticScore: 0, 
            avgWorkScore: 0,
            avgCrowdMorning: 0,
            avgCrowdAfternoon: 0,
            avgCrowdEvening: 0
        };
    }
    const totalAesthetic = approvedReviews.reduce((sum, r) => sum + r.ratingAesthetic, 0);
    const totalWork = approvedReviews.reduce((sum, r) => sum + r.ratingWork, 0);
    const totalCrowdMorning = approvedReviews.reduce((sum, r) => sum + r.crowdMorning, 0);
    const totalCrowdAfternoon = approvedReviews.reduce((sum, r) => sum + r.crowdAfternoon, 0);
    const totalCrowdEvening = approvedReviews.reduce((sum, r) => sum + r.crowdEvening, 0);
    
    return {
        ...cafe,
        avgAestheticScore: parseFloat((totalAesthetic / approvedReviews.length).toFixed(1)),
        avgWorkScore: parseFloat((totalWork / approvedReviews.length).toFixed(1)),
        avgCrowdMorning: parseFloat((totalCrowdMorning / approvedReviews.length).toFixed(1)),
        avgCrowdAfternoon: parseFloat((totalCrowdAfternoon / approvedReviews.length).toFixed(1)),
        avgCrowdEvening: parseFloat((totalCrowdEvening / approvedReviews.length).toFixed(1)),
    };
};

// --- Supabase Data Helpers ---
const prepareCafeRecordForSupabase = (data: Partial<Cafe> & { created_by?: string }) => {
    const record = {
        id: data.id, // FIX: Ensure the ID is included in the record for insertion.
        name: data.name, slug: data.slug, description: data.description, address: data.address,
        city: data.city, district: data.district, openingHours: data.openingHours, priceTier: data.priceTier,
        lat: data.coords?.lat, lng: data.coords?.lng, isSponsored: data.isSponsored, sponsoredUntil: data.sponsoredUntil,
        sponsoredRank: data.sponsoredRank, logoUrl: data.logoUrl, coverUrl: data.coverUrl, manager_id: data.manager_id, 
        created_by: data.created_by,
        status: data.status,
    };
    Object.keys(record).forEach(key => (record as any)[key] === undefined && delete (record as any)[key]);
    return record;
};

const updateCafeRelationsInSupabase = async (cafeId: string, relations: Partial<Cafe>) => {
    // FIX: Only update relations if they are explicitly provided in the `relations` object.
    // This prevents accidental deletion when updating other non-relational fields (like 'isSponsored').
    if (relations.vibes !== undefined) {
        await supabase.from('cafe_vibes').delete().eq('cafe_id', cafeId);
        if (relations.vibes.length > 0) {
            const { error } = await supabase.from('cafe_vibes').insert(relations.vibes.map(v => ({ cafe_id: cafeId, vibe_id: v.id })));
            if (error) throw error;
        }
    }

    if (relations.amenities !== undefined) {
        await supabase.from('cafe_amenities').delete().eq('cafe_id', cafeId);
        if (relations.amenities.length > 0) {
            const { error } = await supabase.from('cafe_amenities').insert(relations.amenities.map(a => ({ cafe_id: cafeId, amenity_id: a.id })));
            if (error) throw error;
        }
    }

    if (relations.spots !== undefined) {
        await supabase.from('spots').delete().eq('cafe_id', cafeId);
        if (relations.spots.length > 0) {
            const { error } = await supabase.from('spots').insert(relations.spots.map(s => ({ ...s, cafe_id: cafeId })));
            if (error) throw error;
        }
    }
    
    if (relations.events !== undefined) {
        await supabase.from('events').delete().eq('cafe_id', cafeId);
        if (relations.events.length > 0) {
            const { error } = await supabase.from('events').insert(relations.events.map(e => ({ ...e, cafe_id: cafeId })));
            if (error) throw error;
        }
    }
};

// --- Context Definition ---
interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    fetchCafes: (force?: boolean) => Promise<void>;
    addCafe: (cafeData: Partial<Cafe>) => Promise<{ data: any, error: any }>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<{ data: any, error: any }>;
    deleteCafe: (id: string) => Promise<{ error: any }>;
    deleteMultipleCafes: (ids: string[]) => Promise<{ error: any }>;
    addReview: (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => Promise<{ data: any, error: any }>;
    updateReviewStatus: (reviewId: string, status: Review['status']) => Promise<{ error: any }>;
    deleteReview: (reviewId: string) => Promise<{ error: any }>;
    incrementHelpfulCount: (reviewId: string) => Promise<{ error: any }>;
    getPendingReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getAllReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getPendingCafes: () => Cafe[];
    updateCafeStatus: (cafeId: string, status: Cafe['status']) => Promise<{ error: any }>;
    getAllTags: () => Promise<Tag[]>;
    addTagToCafe: (cafeId: string, tagName: string) => Promise<{ data: any, error: any }>;
    removeTagFromCafe: (cafeId: string, tagId: string) => Promise<{ error: any }>;
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

// --- Provider Component ---
export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>(() => getCachedCafes() || []);
    const [loading, setLoading] = useState<boolean>(() => !getCachedCafes());
    const [error, setError] = useState<string | null>(null);
    const { currentUser, loading: authLoading } = useAuth();

    const fetchCafes = useCallback(async (showLoader = false) => {
        if (showLoader) setLoading(true);
        setError(null);
        try {
            const { data: profilesData, error: profilesError } = await supabase.from('profiles').select('username, avatar_url');
            if (profilesError) console.warn("Could not fetch profiles for review avatars:", profilesError);

            const profileAvatarMap = new Map<string, string>();
            if (profilesData) {
                for (const profile of profilesData) {
                    if (profile.username && profile.avatar_url) {
                        profileAvatarMap.set(profile.username, profile.avatar_url);
                    }
                }
            }

            const { data, error: fetchError } = await supabase.from('cafes').select(`*,vibes:cafe_vibes(*, vibes(*)),amenities:cafe_amenities(*, amenities(*)),tags:cafe_tags(*, tags(*)),spots(*),reviews(*),events(*)`);
            if (fetchError) throw fetchError;

            const formattedData = data.map(cafe => ({
                ...cafe, coords: { lat: cafe.lat ?? 0, lng: cafe.lng ?? 0 },
                vibes: cafe.vibes.map((v: any) => v.vibes).filter(Boolean),
                amenities: cafe.amenities.map((a: any) => a.amenities).filter(Boolean),
                tags: cafe.tags.map((t: any) => t.tags).filter(Boolean),
                spots: cafe.spots || [], events: cafe.events || [],
                reviews: (cafe.reviews || []).map((r: any) => ({ 
                    ...r, 
                    photos: Array.isArray(r.photos) ? r.photos.filter(Boolean) : [], 
                    helpful_count: r.helpful_count || 0,
                    author_avatar_url: profileAvatarMap.get(r.author) || null,
                })),
            } as Cafe));
            const cafesWithAverages = formattedData.map(calculateAverages);
            setCafes(cafesWithAverages);
            setCachedCafes(cafesWithAverages);
        } catch (err: any) {
            console.error("Error fetching cafes:", err);
            setError(err.message);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authLoading) return;

        // Initial fetch when provider mounts or auth status changes
        fetchCafes(!getCachedCafes());
        
        // Setup real-time subscription
        const channel = supabase.channel('nongkrongr-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
                console.log('Real-time change detected, refetching all cafes.', payload);
                fetchCafes(false);
            })
            .subscribe((status, err) => {
                // This callback is critical for monitoring the health of the real-time connection.
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully connected to real-time database channel.');
                    // If there was a previous connection error, we can clear it now.
                    setError(null);
                }

                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
                    console.error('Database subscription error:', { status, err });
                    setError(
                        'Koneksi real-time ke database terputus. Perubahan mungkin tidak akan tampil otomatis. Coba muat ulang halaman.'
                    );
                }
            });

        // Cleanup function to remove the channel subscription when the component unmounts.
        return () => {
            supabase.removeChannel(channel);
        };
    }, [authLoading, fetchCafes]);

    const addCafe = async (cafeData: Partial<Cafe>) => {
        const tempId = `temp-${Date.now()}`;
        const newId = `cafe-${crypto.randomUUID()}`; // FIX: Generate a permanent, unique ID for the new cafe.
        const slug = `${cafeData.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
        const newCafeOptimistic: Cafe = {
            id: tempId, slug, status: currentUser?.role === 'admin' ? 'approved' : 'pending', ...cafeData,
            reviews: [], spots: [], events: [], amenities: cafeData.amenities || [], vibes: cafeData.vibes || [], tags: [],
            avgAestheticScore: 0, avgWorkScore: 0, avgCrowdMorning: 0, avgCrowdAfternoon: 0, avgCrowdEvening: 0
        } as Cafe;
        setCafes(prev => [newCafeOptimistic, ...prev]);

        try {
            const { vibes, amenities, spots, events, ...mainData } = cafeData;
            
            const manager_id = (currentUser?.role === 'admin_cafe') 
                ? currentUser.id 
                : (cafeData.manager_id || null);
            
            const record = prepareCafeRecordForSupabase({ 
                ...mainData, 
                id: newId, // FIX: Pass the newly generated ID to the record for insertion.
                slug, 
                status: newCafeOptimistic.status,
                manager_id,
                created_by: currentUser?.id
            });
            const { data: newCafeDb, error: mainError } = await supabase.from('cafes').insert(record).select().single();
            if (mainError) throw mainError;
            await updateCafeRelationsInSupabase(newCafeDb.id, { vibes, amenities, spots, events });
            fetchCafes(false); // Refresh for consistency
            return { data: newCafeDb, error: null };
        } catch (err: any) {
            setCafes(prev => prev.filter(c => c.id !== tempId));
            return { data: null, error: err };
        }
    };

    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        const originalCafes = [...cafes];
        const cafeToUpdate = originalCafes.find(c => c.id === id);
        if (!cafeToUpdate) return { data: null, error: { message: "Cafe not found" } };
        const updatedCafeOptimistic = calculateAverages({ ...cafeToUpdate, ...updatedData });
        setCafes(prev => prev.map(c => c.id === id ? updatedCafeOptimistic : c));

        try {
            const { vibes, amenities, spots, events, ...mainData } = updatedData;
            const record = prepareCafeRecordForSupabase(mainData);
            if (Object.keys(record).length > 1 || record.id === undefined) { // Check if there's more than just the ID (if it exists)
                const { error: mainError } = await supabase.from('cafes').update(record).eq('id', id);
                if (mainError) throw mainError;
            }
            await updateCafeRelationsInSupabase(id, { vibes, amenities, spots, events });
            fetchCafes(false);
            return { data: { id }, error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { data: null, error: err };
        }
    };

    const deleteCafe = async (id: string) => {
        const originalCafes = [...cafes];
        setCafes(prev => prev.filter(c => c.id !== id));
        try {
            const { error } = await supabase.from('cafes').delete().eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { error: err };
        }
    };
    
    const deleteMultipleCafes = async (ids: string[]) => {
        const originalCafes = [...cafes];
        setCafes(prev => prev.filter(c => !ids.includes(c.id)));
        try {
            const { error } = await supabase.from('cafes').delete().in('id', ids);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { error: err };
        }
    };

    const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => {
        const newReview = { 
            id: `review-${crypto.randomUUID()}`,
            ...review, 
            status: 'pending' as const, 
            createdAt: new Date().toISOString(), 
            helpful_count: 0 
        };
        const { data, error } = await supabase.from('reviews').insert(newReview);
        if (error) return { data: null, error };
        fetchCafes(false);
        return { data, error: null };
    };

    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        const originalCafes = [...cafes];
        const optimisticCafes = originalCafes.map(c => ({...c, reviews: c.reviews.map(r => r.id === reviewId ? {...r, status} : r)}));
        setCafes(optimisticCafes.map(calculateAverages));
        try {
            const { error } = await supabase.from('reviews').update({ status }).eq('id', reviewId);
            if (error) throw error;
            fetchCafes(false);
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { error: err };
        }
    };

    const deleteReview = async (reviewId: string) => {
        const originalCafes = [...cafes];
        const optimisticCafes = originalCafes.map(c => ({...c, reviews: c.reviews.filter(r => r.id !== reviewId)}));
        setCafes(optimisticCafes.map(calculateAverages));
        try {
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
            fetchCafes(false);
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { error: err };
        }
    };

    const incrementHelpfulCount = async (reviewId: string): Promise<{ error: any }> => {
        // Optimistic update: immediately increment in the UI
        setCafes(prev => prev.map(c => ({...c, reviews: c.reviews.map(r => r.id === reviewId ? {...r, helpful_count: (r.helpful_count || 0) + 1} : r)})));

        try {
            // The RPC call was failing, likely because the function doesn't exist in the DB.
            // This is a non-atomic read-then-write operation as a fallback.
            // It might have race conditions but is better than a broken feature.
            
            // 1. Fetch the current review from the database
            const { data: currentReview, error: fetchError } = await supabase
                .from('reviews')
                .select('helpful_count')
                .eq('id', reviewId)
                .single();

            if (fetchError) {
                // If the review is not found, or another error occurs
                throw fetchError;
            }

            // 2. Calculate the new count based on the *actual* database value
            const newCount = (currentReview?.helpful_count || 0) + 1;

            // 3. Update the review with the new count
            const { error: updateError } = await supabase
                .from('reviews')
                .update({ helpful_count: newCount })
                .eq('id', reviewId);

            if (updateError) {
                throw updateError;
            }
            
            // If the update is successful, the optimistic UI state is likely correct.
            // The real-time subscription will eventually ensure consistency across clients.
            return { error: null };

        } catch (error: any) {
            // Log the actual error message
            console.error("Failed to increment helpful count, reverting:", error.message || error);
            
            // Revert optimistic update by decrementing the count in the UI
            setCafes(prev => prev.map(c => ({...c, reviews: c.reviews.map(r => r.id === reviewId ? {...r, helpful_count: Math.max(0, (r.helpful_count || 1) - 1)} : r)})));
            
            return { error };
        }
    };

    const updateCafeStatus = async (cafeId: string, status: Cafe['status']) => {
        const originalCafes = [...cafes];
        setCafes(prev => prev.map(c => c.id === cafeId ? { ...c, status } : c));
        try {
            const { error } = await supabase.from('cafes').update({ status }).eq('id', cafeId);
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes);
            return { error: err };
        }
    };

    const getAllTags = async (): Promise<Tag[]> => {
        const { data, error } = await supabase.from('tags').select('*');
        if (error) {
            console.error("Error fetching tags:", error);
            return [];
        }
        return data as Tag[];
    };

    const addTagToCafe = async (cafeId: string, tagName: string) => {
        const normalizedTagName = tagName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalizedTagName || !currentUser) {
            return { data: null, error: { message: "Invalid tag name or user not logged in." } };
        }

        const originalCafes = [...cafes];

        try {
            // Find or create the tag
            let { data: existingTag } = await supabase.from('tags').select('id, name').eq('name', normalizedTagName).single();
            let tag: Tag;

            if (existingTag) {
                tag = existingTag;
            } else {
                const newTagId = `tag-${crypto.randomUUID()}`;
                const { data: newTag, error: createError } = await supabase.from('tags').insert({ id: newTagId, name: normalizedTagName, created_by: currentUser.id }).select().single();
                if (createError) throw createError;
                tag = newTag;
            }

            // Optimistic update
            setCafes(prev => prev.map(c => c.id === cafeId ? { ...c, tags: [...c.tags, tag] } : c));

            // Link tag to cafe
            const { error: linkError } = await supabase.from('cafe_tags').insert({ cafe_id: cafeId, tag_id: tag.id });
            if (linkError && linkError.code !== '23505') { // 23505 is unique violation, which is fine
                throw linkError;
            }
            
            return { data: tag, error: null };
        } catch (err: any) {
            setCafes(originalCafes); // Rollback
            return { data: null, error: err };
        }
    };

    const removeTagFromCafe = async (cafeId: string, tagId: string) => {
        const originalCafes = [...cafes];
        // Optimistic update
        setCafes(prev => prev.map(c => c.id === cafeId ? { ...c, tags: c.tags.filter(t => t.id !== tagId) } : c));

        try {
            const { error } = await supabase.from('cafe_tags').delete().match({ cafe_id: cafeId, tag_id: tagId });
            if (error) throw error;
            return { error: null };
        } catch (err: any) {
            setCafes(originalCafes); // Rollback
            return { error: err };
        }
    };
    
    const getPendingReviews = () => cafes.flatMap(c => c.reviews.filter(r => r.status === 'pending').map(r => ({ ...r, cafeName: c.name, cafeId: c.id })));
    const getAllReviews = () => cafes.flatMap(c => c.reviews.map(r => ({ ...r, cafeName: c.name, cafeId: c.id }))).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const getPendingCafes = () => cafes.filter(c => c.status === 'pending');

    return (
        <CafeContext.Provider value={{
            cafes, loading, error, fetchCafes, addCafe, updateCafe, deleteCafe, deleteMultipleCafes,
            addReview, updateReviewStatus, deleteReview, incrementHelpfulCount, getPendingReviews,
            getAllReviews, getPendingCafes, updateCafeStatus,
            getAllTags, addTagToCafe, removeTagFromCafe
        }}>
            {children}
        </CafeContext.Provider>
    );
};