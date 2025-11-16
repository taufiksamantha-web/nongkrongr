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

interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    fetchCafes: (force?: boolean) => Promise<void>;
    addCafe: (cafeData: Partial<Cafe>) => Promise<any>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<any>;
    deleteCafe: (id: string) => Promise<any>;
    addReview: (review: Omit<Review, 'id' | 'createdAt' | 'status'> & { cafe_id: string }) => Promise<any>;
    updateReviewStatus: (reviewId: string, status: Review['status']) => Promise<any>;
    deleteReview: (reviewId: string) => Promise<void>;
    incrementHelpfulCount: (reviewId: string) => Promise<void>;
    getPendingReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getAllReviews: () => (Review & { cafeName: string; cafeId: string })[];
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { currentUser, loading: authLoading } = useAuth();
    const isMutating = useRef(false); // Ref to lock background fetches during mutations

    const fetchCafes = useCallback(async (force = false) => {
        if (isMutating.current && !force) {
            console.log("Mutation in progress, skipping background refresh.");
            return;
        }

        if (force || cafes.length === 0) setLoading(true); // Only show full loading on initial/manual fetch
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('cafes')
                .select(`
                    *,
                    vibes:cafe_vibes(*, vibes(*)),
                    amenities:cafe_amenities(*, amenities(*)),
                    spots(*),
                    reviews(*),
                    events(*)
                `);

            if (fetchError) throw fetchError;

            const formattedData = data.map(cafe => {
                const { lat, lng, ...rest } = cafe;

                // STABILITY UPGRADE: Safely parse review photos.
                // This prevents the entire app from crashing if one review has malformed photo data.
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
        if (authLoading) return;
        
        fetchCafes();
        
        if (window.location.hash.startsWith('#/admin')) {
            return;
        }

        const intervalId = setInterval(() => fetchCafes(false), 300000);
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') fetchCafes(false); };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentUser, authLoading, fetchCafes]);

    /**
     * STABILITY UPGRADE: A robust wrapper for all database mutation operations (CUD).
     * - Prevents concurrent mutations to avoid race conditions.
     * - Centralizes state locking, logging, and error handling.
     * - Differentiates between a mutation error and a subsequent fetch error for better user feedback.
     * @param mutationFn The async function that performs the database operation.
     * @param operationName A string name for the operation for logging purposes.
     */
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
                await fetchCafes(true); // Force refresh to sync state
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

    const addCafe = async (cafeData: Partial<Cafe>) => {
        return performMutation(async () => {
            const { vibes = [], amenities = [], spots = [], events = [] } = cafeData;
            const cafeId = `cafe-${crypto.randomUUID()}`;
            
            const generateSlug = (name?: string, id?: string): string => {
                const baseSlug = (name || 'cafe').toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
                const uniquePart = id ? id.substring(id.length - 12) : Math.random().toString(36).substring(2, 9);
                return `${baseSlug}-${uniquePart}`;
            };
            const slug = cafeData.slug || generateSlug(cafeData.name, cafeId);

            const cafeRecord = {
                id: cafeId, slug, name: cafeData.name, description: cafeData.description, address: cafeData.address, city: cafeData.city, district: cafeData.district, openingHours: cafeData.openingHours, priceTier: cafeData.priceTier, lat: cafeData.coords?.lat, lng: cafeData.coords?.lng, isSponsored: cafeData.isSponsored, sponsoredUntil: cafeData.sponsoredUntil, sponsoredRank: cafeData.sponsoredRank, logoUrl: cafeData.logoUrl, coverUrl: cafeData.coverUrl,
                manager_id: currentUser?.role === 'admin_cafe' ? currentUser.id : null,
            };
            
            Object.keys(cafeRecord).forEach(key => (cafeRecord as any)[key] === undefined && delete (cafeRecord as any)[key]);
            
            // Step 1: Insert main cafe record.
            const { error: cafeError } = await supabase.from('cafes').insert([cafeRecord]);
            if (cafeError) {
                console.error("Supabase Insert Error Details:", cafeError);
                throw new Error(`Gagal menyimpan data kafe: ${cafeError.message}. (Hint: Pastikan 'slug' unik).`);
            }

            // Step 2: Insert relations. If any of these fail, the whole operation fails and rolls back (conceptually).
            if ((vibes as Vibe[]).length > 0) {
                const { error } = await supabase.from('cafe_vibes').insert((vibes as Vibe[]).map(v => ({ cafe_id: cafeId, vibe_id: v.id })));
                if (error) throw new Error(`Gagal menyimpan Vibes: ${error.message}`);
            }
            if ((amenities as Amenity[]).length > 0) {
                const { error } = await supabase.from('cafe_amenities').insert((amenities as Amenity[]).map(a => ({ cafe_id: cafeId, amenity_id: a.id })));
                if (error) throw new Error(`Gagal menyimpan Fasilitas: ${error.message}`);
            }
            if ((spots as Spot[]).length > 0) {
                const { error } = await supabase.from('spots').insert((spots as Spot[]).map(s => ({ ...s, cafe_id: cafeId })));
                if (error) throw new Error(`Gagal menyimpan Spot Foto: ${error.message}`);
            }
            if ((events as Event[]).length > 0) {
                const { error } = await supabase.from('events').insert((events as Event[]).map(e => ({ ...e, cafe_id: cafeId })));
                if (error) throw new Error(`Gagal menyimpan Events: ${error.message}`);
            }

            return cafeRecord;
        }, 'addCafe');
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        return performMutation(async () => {
            const { vibes, amenities, spots, events, coords, ...mainData } = updatedData;

            // Step 1: Update the main cafe data if there's any.
            const cafeRecord = { ...mainData, ...(coords && { lat: coords.lat, lng: coords.lng }) };
            Object.keys(cafeRecord).forEach(key => (cafeRecord as any)[key] === undefined && delete (cafeRecord as any)[key]);

            if (Object.keys(cafeRecord).length > 0) {
                 const { error: cafeError } = await supabase.from('cafes').update(cafeRecord).eq('id', id);
                 if (cafeError) throw new Error(`Gagal update data utama: ${cafeError.message}`);
            }

            // Step 2: Update relations using a "delete-then-insert" strategy for simplicity.
            if (vibes) {
                const { error: deleteError } = await supabase.from('cafe_vibes').delete().eq('cafe_id', id);
                if(deleteError) throw new Error(`Gagal hapus vibes lama: ${deleteError.message}`);
                if ((vibes as Vibe[]).length > 0) {
                    const { error: insertError } = await supabase.from('cafe_vibes').insert((vibes as Vibe[]).map(v => ({ cafe_id: id, vibe_id: v.id })));
                    if(insertError) throw new Error(`Gagal simpan vibes baru: ${insertError.message}`);
                }
            }
            if (amenities) {
                const { error: deleteError } = await supabase.from('cafe_amenities').delete().eq('cafe_id', id);
                if(deleteError) throw new Error(`Gagal hapus fasilitas lama: ${deleteError.message}`);
                if ((amenities as Amenity[]).length > 0) {
                     const { error: insertError } = await supabase.from('cafe_amenities').insert((amenities as Amenity[]).map(a => ({ cafe_id: id, amenity_id: a.id })));
                     if(insertError) throw new Error(`Gagal simpan fasilitas baru: ${insertError.message}`);
                }
            }
            if (spots) {
                const { error: deleteError } = await supabase.from('spots').delete().eq('cafe_id', id);
                 if(deleteError) throw new Error(`Gagal hapus spot foto lama: ${deleteError.message}`);
                if ((spots as Spot[]).length > 0) {
                    const { error: insertError } = await supabase.from('spots').insert((spots as Spot[]).map(s => ({ ...s, cafe_id: id })));
                    if(insertError) throw new Error(`Gagal simpan spot foto baru: ${insertError.message}`);
                }
            }
            if (events) {
                const { error: deleteError } = await supabase.from('events').delete().eq('cafe_id', id);
                if(deleteError) throw new Error(`Gagal hapus event lama: ${deleteError.message}`);
                if ((events as Event[]).length > 0) {
                    const { error: insertError } = await supabase.from('events').insert((events as Event[]).map(e => ({ ...e, cafe_id: id })));
                    if(insertError) throw new Error(`Gagal simpan event baru: ${insertError.message}`);
                }
            }
        }, 'updateCafe');
    };

    const deleteCafe = async (id: string) => {
        return performMutation(async () => {
            // IMPORTANT: Delete from referencing tables first to avoid foreign key constraint violations.
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

    const deleteReview = async (reviewId: string) => {
        return performMutation(async () => {
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
        }, 'deleteReview');
    };
    
    const incrementHelpfulCount = async (reviewId: string) => {
        // This is a special case that doesn't need a full state refresh,
        // but we wrap it for consistency and locking.
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

    return (
        <CafeContext.Provider value={{
            cafes, loading, error, fetchCafes, addCafe, updateCafe, deleteCafe, addReview,
            updateReviewStatus, deleteReview, incrementHelpfulCount, getPendingReviews, getAllReviews,
        }}>
            {children}
        </CafeContext.Provider>
    );
};
