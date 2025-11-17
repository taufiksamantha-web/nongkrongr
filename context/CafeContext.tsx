import React, { createContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Cafe, Review, Spot, Vibe, Amenity, Event } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

// Helper function to calculate averages client-side
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

const prepareCafeRecord = (data: Partial<Cafe>) => {
    const record = {
        id: data.id,
        slug: data.slug,
        name: data.name,
        description: data.description,
        address: data.address,
        city: data.city,
        district: data.district,
        openingHours: data.openingHours,
        priceTier: data.priceTier,
        lat: data.coords?.lat,
        lng: data.coords?.lng,
        isSponsored: data.isSponsored,
        sponsoredUntil: data.sponsoredUntil,
        sponsoredRank: data.sponsoredRank,
        logoUrl: data.logoUrl,
        coverUrl: data.coverUrl,
        manager_id: data.manager_id,
        status: data.status,
    };
    // Remove any keys that are undefined to avoid issues with Supabase client
    Object.keys(record).forEach(key => (record as any)[key] === undefined && delete (record as any)[key]);
    return record;
};


interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    fetchCafes: (force?: boolean) => Promise<void>;
    addCafe: (cafeData: Partial<Cafe>) => Promise<any>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<any>;
    deleteCafe: (id: string) => Promise<any>;
    deleteMultipleCafes: (ids: string[]) => Promise<void>;
    addReview: (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => Promise<any>;
    updateReviewStatus: (reviewId: string, status: Review['status']) => Promise<any>;
    deleteReview: (reviewId: string) => Promise<void>;
    incrementHelpfulCount: (reviewId: string) => Promise<void>;
    getPendingReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getAllReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getPendingCafes: () => Cafe[];
    updateCafeStatus: (cafeId: string, status: Cafe['status']) => Promise<void>;
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, loading: authLoading } = useAuth();
    const isMutating = useRef(false);

    const fetchCafes = useCallback(async (force = false) => {
        if (isMutating.current && !force) {
            console.log("Mutation in progress, skipping background refresh.");
            return;
        }

        if (force || cafes.length === 0) setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('cafes')
                .select(`
                    *,
                    vibes:cafe_vibes(*, vibes(*)),
                    amenities:cafe_amenities(*, amenities(*)),
                    spots(*),
                    reviews(*),
                    events(*)
                `);

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;

            const formattedData = data.map(cafe => {
                const { lat, lng, ...rest } = cafe;
                const parsedReviews = (cafe.reviews || []).map((review: any) => {
                    let photosArray: string[] = [];
                    try {
                        const photosData = review.photos;
                        if (Array.isArray(photosData)) {
                            photosArray = photosData.filter((p): p is string => typeof p === 'string' && p.trim() !== '');
                        } else if (typeof photosData === 'string' && photosData.startsWith('{') && photosData.endsWith('}')) {
                            const content = photosData.slice(1, -1);
                            if (content) {
                                photosArray = content.split(',')
                                     .map(p => p.trim().replace(/^"|"$/g, ''))
                                     .filter(p => p && p.trim() !== '');
                            }
                        }
                    } catch (parseError) {
                        console.warn(`[CafeContext] Failed to parse photos for review ID ${review.id}. Defaulting to empty array.`, { reviewData: review, error: parseError });
                        photosArray = [];
                    }
                    return { ...review, photos: photosArray, helpful_count: review.helpful_count || 0 };
                });

                return {
                    ...rest,
                    coords: { lat: lat ?? 0, lng: lng ?? 0 },
                    vibes: cafe.vibes.map((v: any) => v.vibes).filter(Boolean),
                    amenities: cafe.amenities.map((a: any) => a.amenities).filter(Boolean),
                    spots: cafe.spots || [],
                    reviews: parsedReviews,
                    events: cafe.events || [],
                } as Cafe;
            });
            
            const cafesWithAverages = formattedData.map(calculateAverages);
            setCafes(cafesWithAverages);
        } catch (err: any) {
            console.error("Error fetching cafes:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [cafes.length]);

    useEffect(() => {
        // This effect runs once when the provider mounts (after auth is resolved)
        // to perform the initial data fetch. Subsequent updates are handled by
        // mutations calling `fetchCafes(true)`.
        if (authLoading) return;
        fetchCafes();
    }, [authLoading, fetchCafes]);

    const performMutation = async (mutationFn: () => Promise<any>, operationName: string) => {
        if (isMutating.current) {
            const message = `Mutation already in progress. Skipping "${operationName}".`;
            console.warn(`[CafeContext] ${message}`);
            throw new Error(message);
        }
        isMutating.current = true;
        try {
            const result = await mutationFn();
            console.log(`[CafeContext] Operation "${operationName}" successful.`);
            try {
                await fetchCafes(true);
                console.log(`[CafeContext] State refreshed successfully after "${operationName}".`);
            } catch (fetchErr) {
                console.error(`[CafeContext] CRITICAL: Data was mutated by "${operationName}" but failed to refresh. The UI might be out of sync. Please manually refresh.`, fetchErr);
                throw new Error(`Data saved, but we couldn't refresh the list. Please reload the page.`);
            }
            return result;
        } catch (err: any) {
            console.error(`[CafeContext] Failed to perform operation "${operationName}":`, err);
            throw err;
        } finally {
            isMutating.current = false;
        }
    };
    
    const updateRelations = async (cafeId: string, relations: Partial<Cafe>) => {
        const { vibes, amenities, spots, events } = relations;
        await Promise.all([
            supabase.from('cafe_vibes').delete().eq('cafe_id', cafeId),
            supabase.from('cafe_amenities').delete().eq('cafe_id', cafeId),
            supabase.from('spots').delete().eq('cafe_id', cafeId),
            supabase.from('events').delete().eq('cafe_id', cafeId),
        ]);

        const insertPromises = [];
        if (vibes && (vibes as Vibe[]).length > 0) insertPromises.push(supabase.from('cafe_vibes').insert((vibes as Vibe[]).map(v => ({ cafe_id: cafeId, vibe_id: v.id }))));
        if (amenities && (amenities as Amenity[]).length > 0) insertPromises.push(supabase.from('cafe_amenities').insert((amenities as Amenity[]).map(a => ({ cafe_id: cafeId, amenity_id: a.id }))));
        if (spots && (spots as Spot[]).length > 0) insertPromises.push(supabase.from('spots').insert((spots as Spot[]).map(s => ({ id: s.id, cafe_id: cafeId, title: s.title, tip: s.tip, photoUrl: s.photoUrl }))));
        if (events && (events as Event[]).length > 0) insertPromises.push(supabase.from('events').insert((events as Event[]).map(e => ({ id: e.id, cafe_id: cafeId, name: e.name, description: e.description, start_date: e.start_date, end_date: e.end_date, imageUrl: e.imageUrl || null }))));
        
        const results = await Promise.all(insertPromises);
        const errors = results.map(r => r.error).filter(Boolean);
        if (errors.length > 0) throw new Error(`Gagal menyimpan data relasi: ${errors.map(e => e.message).join(', ')}`);
    };

    const addCafe = async (cafeData: Partial<Cafe>) => {
        return performMutation(async () => {
            const cafeId = `cafe-${crypto.randomUUID()}`;
            const generateSlug = (name?: string, id?: string): string => {
                const baseSlug = (name || 'cafe').toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
                const uniquePart = id ? id.substring(id.length - 12) : Math.random().toString(36).substring(2, 9);
                return `${baseSlug}-${uniquePart}`;
            };
            
            // FIX: Explicitly type `status` to prevent type widening to `string`.
            // The `status` property of a Cafe must be one of the literal types
            // 'approved', 'pending', or 'rejected'.
            const status: 'approved' | 'pending' = currentUser?.role === 'admin' ? 'approved' : 'pending';

            const fullCafeData = {
                ...cafeData,
                id: cafeId,
                slug: cafeData.slug || generateSlug(cafeData.name, cafeId),
                manager_id: currentUser?.role === 'admin_cafe' ? currentUser.id : null,
                status,
            };

            const cafeRecord = prepareCafeRecord(fullCafeData);
            const { error: cafeError } = await supabase.from('cafes').insert([cafeRecord]);
            if (cafeError) {
                console.error("Supabase Insert Error Details:", cafeError);
                throw new Error(`Gagal menyimpan data kafe: ${cafeError.message}. (Hint: Pastikan 'slug' unik).`);
            }
            await updateRelations(cafeId, cafeData);
            return cafeRecord;
        }, 'addCafe');
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        return performMutation(async () => {
            const cafeRecord = prepareCafeRecord(updatedData);
            if (Object.keys(cafeRecord).length > 1) {
                 const { error: cafeError } = await supabase.from('cafes').update(cafeRecord).eq('id', id);
                 if (cafeError) throw new Error(`Gagal update data utama: ${cafeError.message}`);
            }
            await updateRelations(id, updatedData);
        }, 'updateCafe');
    };

    const deleteCafe = async (id: string) => {
        return performMutation(async () => {
            const relationsToDelete = [
                supabase.from('cafe_vibes').delete().eq('cafe_id', id),
                supabase.from('cafe_amenities').delete().eq('cafe_id', id),
                supabase.from('spots').delete().eq('cafe_id', id),
                supabase.from('reviews').delete().eq('cafe_id', id),
                supabase.from('events').delete().eq('cafe_id', id),
            ];
            const results = await Promise.all(relationsToDelete);
            const errors = results.map(r => r.error).filter(Boolean);
            if (errors.length > 0) throw new Error(`Gagal menghapus data terkait: ${errors.map(e=>e.message).join(', ')}`);
            
            const { error: cafeError } = await supabase.from('cafes').delete().eq('id', id);
            if (cafeError) throw cafeError;
        }, 'deleteCafe');
    };

    const deleteMultipleCafes = async (ids: string[]) => {
        return performMutation(async () => {
            if (!ids || ids.length === 0) return;
            const relationsToDelete = [
                supabase.from('cafe_vibes').delete().in('cafe_id', ids),
                supabase.from('cafe_amenities').delete().in('cafe_id', ids),
                supabase.from('spots').delete().in('cafe_id', ids),
                supabase.from('reviews').delete().in('cafe_id', ids),
                supabase.from('events').delete().in('cafe_id', ids),
            ];
            const results = await Promise.all(relationsToDelete);
            const errors = results.map(r => r.error).filter(Boolean);
            if (errors.length > 0) throw new Error(`Gagal menghapus data terkait: ${errors.map(e => e.message).join(', ')}`);
            
            const { error: cafeError } = await supabase.from('cafes').delete().in('id', ids);
            if (cafeError) throw cafeError;
        }, 'deleteMultipleCafes');
    };

    const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => {
        return performMutation(async () => {
            const reviewData = { ...review, id: `rev-${crypto.randomUUID()}`, status: 'pending' as const, helpful_count: 0 };
            const { error } = await supabase.from('reviews').insert(reviewData);
            if (error) throw error;
        }, 'addReview');
    };

    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        return performMutation(async () => {
            const { data, error } = await supabase.from('reviews').update({ status }).eq('id', reviewId).select();
            if (error) throw error;
            if (!data || data.length === 0) throw new Error('Gagal memperbarui review. Tidak ditemukan.');
        }, 'updateReviewStatus');
    };

    const updateCafeStatus = async (cafeId: string, status: Cafe['status']) => {
        return performMutation(async () => {
            const { error } = await supabase.from('cafes').update({ status }).eq('id', cafeId);
            if (error) throw error;
        }, 'updateCafeStatus');
    };

    const deleteReview = async (reviewId: string) => {
        return performMutation(async () => {
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
        }, 'deleteReview');
    };
    
    const incrementHelpfulCount = async (reviewId: string) => {
        return performMutation(async () => {
            const { error } = await supabase.rpc('increment_helpful_count', { review_id_text: reviewId });
            if (error) {
                console.error("RPC Error:", error);
                throw error;
            }
        }, 'incrementHelpfulCount');
    };

    const getPendingReviews = () => {
        return cafes.flatMap(cafe =>
            cafe.reviews
                .filter(r => r.status === 'pending')
                .map(review => ({ ...review, cafeName: cafe.name, cafeId: cafe.id }))
        );
    };

    const getAllReviews = () => {
        const all = cafes.flatMap(cafe =>
            cafe.reviews.map(review => ({ ...review, cafeName: cafe.name, cafeId: cafe.id }))
        );
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return all;
    };
    
    const getPendingCafes = () => {
        return cafes.filter(c => c.status === 'pending');
    };

    return (
        <CafeContext.Provider value={{
            cafes, loading, error, fetchCafes, addCafe, updateCafe, deleteCafe, deleteMultipleCafes, addReview,
            updateReviewStatus, deleteReview, incrementHelpfulCount, getPendingReviews, getAllReviews, getPendingCafes, updateCafeStatus
        }}>
            {children}
        </CafeContext.Provider>
    );
};