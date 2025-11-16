import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
    fetchCafes: () => Promise<void>;
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

    const fetchCafes = useCallback(async () => {
        setLoading(true);
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

                const parsedReviews = (cafe.reviews || []).map((review: any) => {
                    let photosArray: string[] = [];
                    const photosData = review.photos; // Can be array, string, or null
                    
                    if (Array.isArray(photosData)) {
                        photosArray = photosData.filter(p => typeof p === 'string' && p.trim() !== '');
                    } else if (typeof photosData === 'string' && photosData.startsWith('{') && photosData.endsWith('}')) {
                        const content = photosData.slice(1, -1);
                        if (content) {
                            photosArray = content.split(',')
                                     .map(p => p.trim().replace(/^"|"$/g, ''))
                                     .filter(p => p.trim() !== '');
                        }
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
    }, []);

    useEffect(() => {
        if (authLoading) return;
        
        fetchCafes();
        
        const intervalId = setInterval(fetchCafes, 300000);
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') fetchCafes(); };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [currentUser, authLoading, fetchCafes]);

    const addCafe = async (cafeData: Partial<Cafe>) => {
        const { vibes = [], amenities = [], spots = [], events = [] } = cafeData;
        const cafeId = `cafe-${crypto.randomUUID()}`;
        
        const generateSlug = (name?: string): string => {
            const baseSlug = (name || 'cafe').toLowerCase().replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
            return `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
        };
        const slug = generateSlug(cafeData.name);

        const cafeRecord = {
            id: cafeId, slug, name: cafeData.name, description: cafeData.description, address: cafeData.address, city: cafeData.city, district: cafeData.district, openingHours: cafeData.openingHours, priceTier: cafeData.priceTier, lat: cafeData.coords?.lat, lng: cafeData.coords?.lng, isSponsored: cafeData.isSponsored, sponsoredUntil: cafeData.sponsoredUntil, sponsoredRank: cafeData.sponsoredRank, logoUrl: cafeData.logoUrl, coverUrl: cafeData.coverUrl,
        };

        const { error: cafeError } = await supabase.from('cafes').insert(cafeRecord);
        if (cafeError) throw new Error(`Gagal menyimpan data kafe utama: ${cafeError.message}`);

        try {
            const vibeRelations = (vibes as Vibe[]).map(v => ({ cafe_id: cafeId, vibe_id: v.id }));
            const amenityRelations = (amenities as Amenity[]).map(a => ({ cafe_id: cafeId, amenity_id: a.id }));
            const spotRecords = (spots as Spot[]).map(s => ({ ...s, cafe_id: cafeId }));
            const eventRecords = (events as Event[]).map(e => ({ ...e, cafe_id: cafeId }));

            const relationPromises = [
                vibeRelations.length > 0 ? supabase.from('cafe_vibes').insert(vibeRelations) : Promise.resolve({ error: null }),
                amenityRelations.length > 0 ? supabase.from('cafe_amenities').insert(amenityRelations) : Promise.resolve({ error: null }),
                spotRecords.length > 0 ? supabase.from('spots').insert(spotRecords) : Promise.resolve({ error: null }),
                eventRecords.length > 0 ? supabase.from('events').insert(eventRecords) : Promise.resolve({ error: null }),
            ];
            
            const results = await Promise.all(relationPromises);
            const errors = results.map(r => r.error).filter(Boolean);

            if (errors.length > 0) throw new Error(`Gagal menyimpan detail kafe: ${errors.map(e => e.message).join(', ')}`);

            await fetchCafes();
            return cafeRecord;
        } catch (relationError: any) {
            console.error("CRITICAL: Error inserting relations. Orphaned record exists.", { cafeId, relationError });
            throw new Error(`Kafe "${cafeRecord.name}" berhasil dibuat, TAPI GAGAL menyimpan detailnya. Harap hapus kafe ini dan coba lagi. Error: ${relationError.message}`);
        }
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        const { vibes, amenities, spots, events, coords } = updatedData;

        const cafeRecord = {
            name: updatedData.name, description: updatedData.description, address: updatedData.address, city: updatedData.city, district: updatedData.district, openingHours: updatedData.openingHours, priceTier: updatedData.priceTier, isSponsored: updatedData.isSponsored, sponsoredUntil: updatedData.sponsoredUntil, sponsoredRank: updatedData.sponsoredRank, logoUrl: updatedData.logoUrl, coverUrl: updatedData.coverUrl,
            ...(coords && { lat: coords.lat, lng: coords.lng }),
        };
        Object.keys(cafeRecord).forEach(key => (cafeRecord as any)[key] === undefined && delete (cafeRecord as any)[key]);

        const { error: cafeError } = await supabase.from('cafes').update(cafeRecord).eq('id', id);
        if (cafeError) throw cafeError;

        if (vibes) {
            await supabase.from('cafe_vibes').delete().eq('cafe_id', id);
            const vibeRelations = (vibes as Vibe[]).map(v => ({ cafe_id: id, vibe_id: v.id }));
            if (vibeRelations.length > 0) await supabase.from('cafe_vibes').insert(vibeRelations);
        }
        if (amenities) {
            await supabase.from('cafe_amenities').delete().eq('cafe_id', id);
            const amenityRelations = (amenities as Amenity[]).map(a => ({ cafe_id: id, amenity_id: a.id }));
            if (amenityRelations.length > 0) await supabase.from('cafe_amenities').insert(amenityRelations);
        }
        if (spots) {
             await supabase.from('spots').delete().eq('cafe_id', id);
             const spotRecords = (spots as Spot[]).map(s => ({ ...s, cafe_id: id }));
             if (spotRecords.length > 0) await supabase.from('spots').insert(spotRecords);
        }
        if (events) {
            await supabase.from('events').delete().eq('cafe_id', id);
            const eventRecords = (events as Event[]).map(e => ({ ...e, cafe_id: id }));
            if (eventRecords.length > 0) await supabase.from('events').insert(eventRecords);
        }
        
        await fetchCafes();
    };

    const deleteCafe = async (id: string) => {
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
    
        setCafes(prevCafes => prevCafes.filter(c => c.id !== id));
    };

    const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => {
        const reviewData = { ...review, id: `rev-${crypto.randomUUID()}`, status: 'pending' as const, helpful_count: 0 };
        const { error } = await supabase.from('reviews').insert(reviewData);
        if (error) throw error;
        await fetchCafes();
    };

    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        const { data, error } = await supabase.from('reviews').update({ status }).eq('id', reviewId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Gagal memperbarui review. Tidak ditemukan.');
        await fetchCafes(); // Re-fetch to ensure all averages are updated correctly.
    };

    const deleteReview = async (reviewId: string) => {
        const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
        if (error) throw error;
        await fetchCafes(); // Re-fetch to ensure all averages are updated correctly.
    };
    
    const incrementHelpfulCount = async (reviewId: string) => {
        const { error } = await supabase.rpc('increment_helpful_count', { review_id_text: reviewId });
        if (error) {
            console.error("RPC Error:", error);
            throw error;
        }
        
        setCafes(prevCafes => 
            prevCafes.map(cafe => ({
                ...cafe,
                reviews: cafe.reviews.map(review => 
                    review.id === reviewId ? { ...review, helpful_count: (review.helpful_count || 0) + 1 } : review
                )
            }))
        );
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