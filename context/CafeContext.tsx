import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cafe, Review, Spot, Vibe, Amenity } from '../types';
import { supabase } from '../lib/supabaseClient';

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
    getPendingReviews: () => (Review & { cafeName: string; cafeId: string })[];
    getAllReviews: () => (Review & { cafeName: string; cafeId: string })[];
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

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
                    reviews(*)
                `);

            if (fetchError) throw fetchError;

            const formattedData = data.map(cafe => {
                const { lat, lng, ...rest } = cafe;

                const parsedReviews = (cafe.reviews || []).map((review: any) => {
                    let photosArray: string[] = [];
                    const photosData = review.photos; // Can be array, string, or null
                    
                    if (Array.isArray(photosData)) {
                        // Handle native arrays, filtering out any non-string or empty values
                        photosArray = photosData.filter(p => typeof p === 'string' && p.trim() !== '');
                    } else if (typeof photosData === 'string' && photosData.startsWith('{') && photosData.endsWith('}')) {
                        // Handle PostgreSQL array strings like '{"url1","url2"}' or '{}'
                        const content = photosData.slice(1, -1);
                        if (content) {
                            photosArray = content.split(',')
                                     .map(p => p.trim().replace(/^"|"$/g, ''))
                                     .filter(p => p.trim() !== '');
                        }
                    }
                    return { ...review, photos: photosArray };
                });

                return {
                    ...rest,
                    coords: { lat: lat ?? 0, lng: lng ?? 0 },
                    vibes: cafe.vibes.map((v: any) => v.vibes).filter(Boolean),
                    amenities: cafe.amenities.map((a: any) => a.amenities).filter(Boolean),
                    spots: cafe.spots || [],
                    reviews: parsedReviews,
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
        fetchCafes(); // Initial fetch on component mount
        const intervalId = setInterval(fetchCafes, 300000); // Refresh data every 5 minutes
        return () => clearInterval(intervalId); // Cleanup interval on unmount
    }, [fetchCafes]);


    const addCafe = async (cafeData: Partial<Cafe>) => {
        const { vibes = [], amenities = [], spots = [], coords, ...mainCafeData } = cafeData;

        const cafeRecord = {
            ...mainCafeData,
            slug: mainCafeData.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || `cafe-${Date.now()}`,
            lat: coords?.lat,
            lng: coords?.lng,
        };
        const { data: newCafe, error: cafeError } = await supabase
            .from('cafes')
            .insert(cafeRecord)
            .select()
            .single();

        if (cafeError) throw cafeError;

        const cafeId = newCafe.id;
        const vibeRelations = (vibes as Vibe[]).map(v => ({ cafe_id: cafeId, vibe_id: v.id }));
        const amenityRelations = (amenities as Amenity[]).map(a => ({ cafe_id: cafeId, amenity_id: a.id }));
        const spotRecords = (spots as Spot[]).map(s => ({ 
            id: s.id, 
            title: s.title, 
            tip: s.tip, 
            photoUrl: s.photoUrl, 
            cafe_id: cafeId 
        }));

        const [vibeError, amenityError, spotError] = await Promise.all([
            supabase.from('cafe_vibes').insert(vibeRelations),
            supabase.from('cafe_amenities').insert(amenityRelations),
            supabase.from('spots').insert(spotRecords)
        ]).then(results => results.map(r => r.error));

        if (vibeError || amenityError || spotError) {
            console.error("Error inserting relations:", { vibeError, amenityError, spotError });
            throw new Error('Failed to save all cafe details.');
        }

        await fetchCafes();
        return newCafe;
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        const { vibes, amenities, spots, coords, ...mainCafeData } = updatedData;

        const cafeRecord = {
            ...mainCafeData,
            ...(coords && { lat: coords.lat, lng: coords.lng }),
        };
        const { error: cafeError } = await supabase
            .from('cafes')
            .update(cafeRecord)
            .eq('id', id);
        
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
             const spotRecords = (spots as Spot[]).map(s => ({ 
                id: s.id, 
                title: s.title, 
                tip: s.tip, 
                photoUrl: s.photoUrl, 
                cafe_id: id 
             }));
             if (spotRecords.length > 0) await supabase.from('spots').insert(spotRecords);
        }
        
        await fetchCafes();
    };

    const deleteCafe = async (id: string) => {
        // Delete all related data first to satisfy foreign key constraints.
        const relationsToDelete = [
            { table: 'cafe_vibes', promise: supabase.from('cafe_vibes').delete().eq('cafe_id', id) },
            { table: 'cafe_amenities', promise: supabase.from('cafe_amenities').delete().eq('cafe_id', id) },
            { table: 'spots', promise: supabase.from('spots').delete().eq('cafe_id', id) },
            { table: 'reviews', promise: supabase.from('reviews').delete().eq('cafe_id', id) },
        ];
    
        const results = await Promise.all(relationsToDelete.map(r => r.promise));
    
        const failedDeletes = results
            .map((result, index) => ({ ...result, table: relationsToDelete[index].table }))
            .filter(result => result.error);
    
        if (failedDeletes.length > 0) {
            const errorDetails = failedDeletes.map(failure => {
                console.error(`Error deleting from table "${failure.table}":`, failure.error);

                let detailedMessage = 'An unknown error occurred.';
                if (failure.error) {
                    if (typeof failure.error.message === 'string' && failure.error.message.trim()) {
                        detailedMessage = failure.error.message;
                    } else {
                        try {
                            detailedMessage = JSON.stringify(failure.error);
                        } catch {
                            detailedMessage = 'Could not stringify the error object.';
                        }
                    }
                }
                return `[${failure.table}: ${detailedMessage}]`;
            }).join(' ');
    
            throw new Error(`Gagal menghapus data terkait kafe. Detail: ${errorDetails}`);
        }
    
        const { error: cafeError } = await supabase.from('cafes').delete().eq('id', id);
        if (cafeError) {
            console.error("Error deleting the main cafe record:", cafeError);
            throw cafeError;
        }
    
        // Optimistically update the local state instead of re-fetching.
        setCafes(prevCafes => prevCafes.filter(c => c.id !== id));
    };

    const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status'> & { cafe_id: string }) => {
        const reviewData = { 
            ...review, 
            id: `rev-${crypto.randomUUID()}`,
            status: 'pending' as const 
        };
        const { error } = await supabase.from('reviews').insert(reviewData);
        if (error) throw error;
        await fetchCafes();
    };

    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        const { data: updatedReviews, error } = await supabase
            .from('reviews')
            .update({ status })
            .eq('id', reviewId)
            .select();

        if (error) {
            console.error("Supabase update error:", error);
            throw error;
        }

        if (!updatedReviews || updatedReviews.length === 0) {
            throw new Error('Gagal memperbarui review. Review tidak ditemukan atau Anda tidak memiliki izin (cek RLS).');
        }

        setCafes(prevCafes => 
            prevCafes.map(cafe => {
                const reviewIndex = cafe.reviews.findIndex(r => r.id === reviewId);
                if (reviewIndex !== -1) {
                    const updatedReviews = cafe.reviews.map(review => 
                        review.id === reviewId ? { ...review, status } : review
                    );
                    const updatedCafe = {
                        ...cafe,
                        reviews: updatedReviews,
                    };
                    return calculateAverages(updatedCafe);
                }
                return cafe;
            })
        );
    };

    const deleteReview = async (reviewId: string) => {
        const { error } = await supabase
            .from('reviews')
            .delete()
            .eq('id', reviewId);

        if (error) {
            console.error("Supabase delete error:", error);
            throw error;
        }
        
        // Optimistically update UI
        setCafes(prevCafes =>
            prevCafes.map(cafe => {
                const hasReview = cafe.reviews.some(r => r.id === reviewId);
                if (hasReview) {
                    const updatedCafe = {
                        ...cafe,
                        reviews: cafe.reviews.filter(r => r.id !== reviewId),
                    };
                    return calculateAverages(updatedCafe); // Recalculate scores
                }
                return cafe;
            })
        );
    };
    
    const getPendingReviews = () => {
        const pending: (Review & { cafeName: string; cafeId: string })[] = [];
        cafes.forEach(cafe => {
            cafe.reviews
                .filter(r => r.status === 'pending')
                .forEach(review => {
                    pending.push({
                        ...review,
                        cafeName: cafe.name,
                        cafeId: cafe.id,
                    });
                });
        });
        return pending;
    };

    const getAllReviews = () => {
        const all: (Review & { cafeName: string; cafeId: string })[] = [];
        cafes.forEach(cafe => {
            cafe.reviews.forEach(review => {
                all.push({
                    ...review,
                    cafeName: cafe.name,
                    cafeId: cafe.id,
                });
            });
        });
        // Sort by most recent first
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return all;
    };


    return (
        <CafeContext.Provider value={{
            cafes,
            loading,
            error,
            fetchCafes,
            addCafe,
            updateCafe,
            deleteCafe,
            addReview,
            updateReviewStatus,
            deleteReview,
            getPendingReviews,
            getAllReviews,
        }}>
            {children}
        </CafeContext.Provider>
    );
};