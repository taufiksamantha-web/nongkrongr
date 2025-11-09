import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cafe, Review } from '../types';
import { cafeService } from '../services/cafeService';
import { cloudinaryService, DATABASE_URL } from '../services/cloudinaryService';

interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    fetchCafes: () => void;
    addCafe: (cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => Promise<void>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<void>;
    deleteCafe: (id: string) => Promise<void>;
    addReview: (slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>) => Promise<void>;
    updateReviewStatus: (reviewId: string, status: Review['status']) => Promise<void>;
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
            // Cache-busting query parameter
            const url = `${DATABASE_URL}?_=${new Date().getTime()}`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch database from Cloudinary: ${response.statusText}`);
            }
            const data: Cafe[] = await response.json();
            setCafes(data);
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

    const handleDataUpdate = async (updatedCafes: Cafe[]) => {
        try {
            await cloudinaryService.uploadDatabase(updatedCafes);
            setCafes(updatedCafes);
        } catch (uploadError) {
            console.error("Failed to upload database update:", uploadError);
            alert("Gagal menyimpan perubahan ke database. Perubahan Anda mungkin tidak tersimpan. Silakan coba lagi.");
            // Optionally revert local state on failure
            fetchCafes();
        }
    };

    const addCafe = async (cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => {
        const updatedCafes = cafeService.addCafe(cafes, cafeData);
        await handleDataUpdate(updatedCafes);
    };

    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        const updatedCafes = cafeService.updateCafe(cafes, id, updatedData);
        await handleDataUpdate(updatedCafes);
    };

    const deleteCafe = async (id: string) => {
        const updatedCafes = cafeService.deleteCafe(cafes, id);
        await handleDataUpdate(updatedCafes);
    };
    
    const addReview = async (slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>) => {
        const updatedCafes = cafeService.addReview(cafes, slug, review);
        await handleDataUpdate(updatedCafes);
    };
    
    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        const updatedCafes = cafeService.updateReviewStatus(cafes, reviewId, status);
        await handleDataUpdate(updatedCafes);
    };


    return (
        <CafeContext.Provider value={{ cafes, loading, error, fetchCafes, addCafe, updateCafe, deleteCafe, addReview, updateReviewStatus }}>
            {children}
        </CafeContext.Provider>
    );
};
