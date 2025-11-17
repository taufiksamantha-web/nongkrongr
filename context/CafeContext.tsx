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
    const mutationChain = useRef(Promise.resolve());

    const fetchCafes = useCallback(async (force = false) => {
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
                const parsedReviews = (cafe.reviews || []).map((review: any) => ({
                    ...review,
                    photos: Array.isArray(review.photos) 
                        ? review.photos.filter((p: any): p is string => typeof p === 'string' && p.trim() !== '') 
                        : [],
                    helpful_count: review.helpful_count || 0,
                }));
            
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
        if (authLoading) return;
        fetchCafes();
    }, [authLoading, fetchCafes]);

    const performMutation = (mutationFn: () => Promise<any>, operationName: string) => {
        const chainedPromise = mutationChain.current.finally(async () => {
            try {
                const result = await mutationFn();
                await fetchCafes(true);
                return result;
            } catch (err: any) {
                console.error(`[CafeContext] Failed to perform operation "${operationName}":`, err);
                throw err;
            }
        });
        mutationChain.current = chainedPromise;
        return chainedPromise;
    };

    // Helper to manage relational data for a cafe
    const updateRelations = async (cafeId: string, relations: Partial<Cafe>) => {
        const { vibes, amenities, spots, events } = relations;
        // Delete all existing relations first for simplicity and atomicity
        await Promise.all([
            supabase.from('cafe_vibes').delete().eq('cafe_id', cafeId),
            supabase.from('cafe_amenities').delete().eq('cafe_id', cafeId),
            supabase.from('spots').delete().eq('cafe_id', cafeId),
            supabase.from('events').delete().eq('cafe_id', cafeId),
        ]);

        const insertPromises = [];
        if (vibes?.length) insertPromises.push(supabase.from('cafe_vibes').insert(vibes.map(v => ({ cafe_id: cafeId, vibe_id: v.id }))));
        if (amenities?.length) insertPromises.push(supabase.from('cafe_amenities').insert(amenities.map(a => ({ cafe_id: cafeId, amenity_id: a.id }))));
        if (spots?.length) insertPromises.push(supabase.from('spots').insert(spots.map(s => ({ ...s, cafe_id: cafeId }))));
        if (events?.length) insertPromises.push(supabase.from('events').insert(events.map(e => ({ ...e, cafe_id: cafeId, imageUrl: e.imageUrl || null }))));
        
        const results = await Promise.all(insertPromises);
        const errors = results.map(r => r.error).filter(Boolean);
        if (errors.length > 0) throw new Error(`Gagal menyimpan data relasi: ${errors.map(e => e.message).join(', ')}`);
    };

    const addCafe = async (cafeData: Partial<Cafe>) => {
        return performMutation(async () => {
            const cafeId = `cafe-${crypto.randomUUID()}`;
            const generateSlug = (name?: string): string => {
                const baseSlug = (name || 'cafe').toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
                const uniquePart = crypto.randomUUID().substring(0, 8);
                return `${baseSlug}-${uniquePart}`;
            };
            
            const status: 'approved' | 'pending' = currentUser?.role === 'admin' ? 'approved' : 'pending';
            const fullCafeData = {
                ...cafeData,
                id: cafeId,
                slug: generateSlug(cafeData.name),
                manager_id: currentUser?.role === 'admin_cafe' ? currentUser.id : null,
                status,
            };

            const cafeRecord = {
                ...prepareCafeRecord(fullCafeData),
                id: fullCafeData.id,
                slug: fullCafeData.slug
            };

            const { error: cafeError } = await supabase.from('cafes').insert(cafeRecord);
            if (cafeError) throw new Error(`Gagal menyimpan data kafe: ${cafeError.message}. (Hint: Pastikan 'slug' unik).`);
            
            await updateRelations(cafeId, cafeData);
            return cafeRecord;
        }, 'addCafe');
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        return performMutation(async () => {
            const cafeRecord = prepareCafeRecord(updatedData);
            if (Object.keys(cafeRecord).length > 0) {
                 const { error: cafeError } = await supabase.from('cafes').update(cafeRecord).eq('id', id);
                 if (cafeError) throw new Error(`Gagal update data utama: ${cafeError.message}`);
            }
            await updateRelations(id, updatedData);
        }, 'updateCafe');
    };

    const deleteCafe = (id: string) => deleteMultipleCafes([id]);

    const deleteMultipleCafes = async (ids: string[]) => {
        return performMutation(async () => {
            if (!ids || ids.length === 0) return;
            // Delete from child tables first to respect foreign key constraints
            const relationsToDelete = [
                supabase.from('cafe_vibes').delete().in('cafe_id', ids),
                supabase.from('cafe_amenities').delete().in('cafe_id', ids),
                supabase.from('spots').delete().in('cafe_id', ids),
                supabase.from('reviews').delete().in('cafe_id', ids),
                supabase.from('events').delete().in('cafe_id', ids),
                supabase.from('cafe_status_logs').delete().in('cafe_id', ids),
            ];
            await Promise.all(relationsToDelete);
            
            // Then delete from the parent table
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
            const currentCafe = cafes.find(c => c.id === cafeId);
            const oldStatus = currentCafe ? currentCafe.status : 'unknown';
            const { error: updateError } = await supabase.from('cafes').update({ status }).eq('id', cafeId);
            if (updateError) throw updateError;
            if (currentUser && currentUser.role === 'admin' && oldStatus !== status) {
                const logEntry = { cafe_id: cafeId, old_status: oldStatus, new_status: status, changed_by: currentUser.id };
                const { error: logError } = await supabase.from('cafe_status_logs').insert(logEntry);
                if (logError) console.error("Critical: Cafe status updated but failed to write to audit log.", logError);
            }
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
            if (error) throw error;
        }, 'incrementHelpfulCount');
    };

    const getPendingReviews = () => cafes.flatMap(cafe => cafe.reviews.filter(r => r.status === 'pending').map(review => ({ ...review, cafeName: cafe.name, cafeId: cafe.id })));
    const getAllReviews = () => cafes.flatMap(cafe => cafe.reviews.map(review => ({ ...review, cafeName: cafe.name, cafeId: cafe.id }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const getPendingCafes = () => cafes.filter(c => c.status === 'pending');

    return (
        <CafeContext.Provider value={{
            cafes, loading, error, fetchCafes, addCafe, updateCafe, deleteCafe, deleteMultipleCafes, addReview,
            updateReviewStatus, deleteReview, incrementHelpfulCount, getPendingReviews, getAllReviews, getPendingCafes, updateCafeStatus
        }}>
            {children}
        </CafeContext.Provider>
    );
};
