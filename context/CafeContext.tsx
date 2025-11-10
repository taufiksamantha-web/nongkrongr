import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cafe, Review, Spot } from '../types';
import { supabase } from '../services/supabaseClient';

interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    fetchCafes: () => void;
    addCafe: (cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'spots' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => Promise<void>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<void>;
    deleteCafe: (id: string) => Promise<void>;
    addReview: (cafeId: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>) => Promise<void>;
    updateReviewStatus: (reviewId: string, cafeId: string, status: Review['status']) => Promise<void>;
    getPendingReviews: () => Promise<(Review & { cafeName: string; cafeId: string })[]>;
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

// Helper to recalculate averages
const recalculateAverages = (reviews: Review[]): Partial<Cafe> => {
    const approvedReviews = reviews.filter(r => r.status === 'approved');
    if (approvedReviews.length === 0) {
        return { 
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
        avgAestheticScore: parseFloat((totalAesthetic / approvedReviews.length).toFixed(1)),
        avgWorkScore: parseFloat((totalWork / approvedReviews.length).toFixed(1)),
        avgCrowdMorning: parseFloat((totalCrowdMorning / approvedReviews.length).toFixed(1)),
        avgCrowdAfternoon: parseFloat((totalCrowdAfternoon / approvedReviews.length).toFixed(1)),
        avgCrowdEvening: parseFloat((totalCrowdEvening / approvedReviews.length).toFixed(1)),
    };
};


export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCafes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('cafes')
                .select(`
                    *,
                    reviews(*),
                    spots(*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCafes(data as unknown as Cafe[]);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCafes();
    }, [fetchCafes]);

    const addCafe = async (cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'spots' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => {
        const slug = cafeData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const { data, error } = await supabase
          .from('cafes')
          .insert([{ ...cafeData, slug, reviews: [], spots: [] }])
          .select()
          .single();
    
        if (error) throw error;
        if(data) setCafes(prev => [...prev, data as unknown as Cafe]);
    };
    
    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        const { data, error } = await supabase
          .from('cafes')
          .update(updatedData)
          .eq('id', id)
          .select(`*, reviews(*), spots(*)`)
          .single();

        if (error) throw error;
        if (data) {
            setCafes(prev => prev.map(c => (c.id === id ? data as unknown as Cafe : c)));
        }
    };
    
    const deleteCafe = async (id: string) => {
        const { error } = await supabase.from('cafes').delete().eq('id', id);
        if (error) throw error;
        setCafes(prev => prev.filter(c => c.id !== id));
    };
    
    const addReview = async (cafeId: string, reviewData: Omit<Review, 'id' | 'createdAt' | 'status'>) => {
        const newReview = {
            ...reviewData,
            cafe_id: cafeId,
            status: 'pending'
        };
        const { error } = await supabase.from('reviews').insert([newReview]);
        if (error) throw error;
        // No need to fetch, the app will show "pending moderation" message.
        // Admin dashboard will see the new pending review on next load.
    };

    const updateReviewStatus = async (reviewId: string, cafeId: string, status: Review['status']) => {
        // 1. Update the review's status
        const { error: updateError } = await supabase
            .from('reviews')
            .update({ status })
            .eq('id', reviewId);
    
        if (updateError) throw updateError;
    
        // 2. Fetch all reviews for the affected cafe to recalculate averages
        const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('*')
            .eq('cafe_id', cafeId);
    
        if (reviewsError) throw reviewsError;
    
        // 3. Recalculate and update the cafe's average scores
        const newAverages = recalculateAverages(reviewsData as Review[]);
        await updateCafe(cafeId, newAverages);
    
        // 4. Refetch all cafes to update the UI state globally
        await fetchCafes();
    };

    const getPendingReviews = async (): Promise<(Review & { cafeName: string; cafeId: string })[]> => {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                *,
                cafes (
                    id,
                    name
                )
            `)
            .eq('status', 'pending');

        if (error) throw error;

        return data.map(r => ({
            ...r,
            cafeId: r.cafes.id,
            cafeName: r.cafes.name
        })) as (Review & { cafeName: string; cafeId: string })[];
    };


    return (
        <CafeContext.Provider value={{ 
            cafes, loading, error, fetchCafes,
            addCafe, updateCafe, deleteCafe, addReview, updateReviewStatus,
            getPendingReviews
         }}>
            {children}
        </CafeContext.Provider>
    );
};
