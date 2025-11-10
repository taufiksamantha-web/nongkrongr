import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cafe, Review } from '../types';
import { cafeService } from '../services/cafeService';
import { cloudinaryService, DATABASE_URL } from '../services/cloudinaryService';

interface CafeContextType {
    cafes: Cafe[];
    loading: boolean;
    error: string | null;
    hasUnsavedChanges: boolean;
    fetchCafes: () => void;
    addCafe: (cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => void;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => void;
    deleteCafe: (id: string) => void;
    addReview: (slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>) => void;
    updateReviewStatus: (reviewId: string, status: Review['status']) => void;
    saveChangesToCloud: () => Promise<{ success: boolean; error?: string }>;
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

    const fetchCafes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Cache-busting query parameter is still useful as a fallback
            const url = `${DATABASE_URL}?_=${new Date().getTime()}`;
            const response = await fetch(url, {
                cache: 'no-store', // Most important for modern browsers
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache', // For HTTP/1.0 proxies
                    'Expires': '0', // For older caches
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch database from Cloudinary: ${response.statusText}`);
            }
            const data: Cafe[] = await response.json();
            setCafes(data);
            setHasUnsavedChanges(false); // Reset on a fresh fetch
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

    const saveChangesToCloud = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
        try {
            await cloudinaryService.uploadDatabase(cafes);
            setHasUnsavedChanges(false);
            return { success: true };
        } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'An unknown error occurred during upload.';
            console.error("Failed to upload database update:", uploadError);
            return { success: false, error: errorMessage };
        }
    }, [cafes]);

    const addCafe = useCallback((cafeData: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>) => {
        setCafes(currentCafes => {
            const updatedCafes = cafeService.addCafe(currentCafes, cafeData);
            setHasUnsavedChanges(true);
            return updatedCafes;
        });
    }, []);

    const updateCafe = useCallback((id: string, updatedData: Partial<Cafe>) => {
        setCafes(currentCafes => {
            const updatedCafes = cafeService.updateCafe(currentCafes, id, updatedData);
            setHasUnsavedChanges(true);
            return updatedCafes;
        });
    }, []);

    const deleteCafe = useCallback((id: string) => {
        setCafes(currentCafes => {
            const updatedCafes = cafeService.deleteCafe(currentCafes, id);
            setHasUnsavedChanges(true);
            return updatedCafes;
        });
    }, []);
    
    const addReview = useCallback((slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>) => {
        setCafes(currentCafes => {
            const updatedCafes = cafeService.addReview(currentCafes, slug, review);
            setHasUnsavedChanges(true);
            return updatedCafes;
        });
    }, []);
    
    const updateReviewStatus = useCallback((reviewId: string, status: Review['status']) => {
        setCafes(currentCafes => {
            const updatedCafes = cafeService.updateReviewStatus(currentCafes, reviewId, status);
            setHasUnsavedChanges(true);
            return updatedCafes;
        });
    }, []);


    return (
        <CafeContext.Provider value={{ 
            cafes, loading, error, hasUnsavedChanges, fetchCafes, 
            addCafe, updateCafe, deleteCafe, addReview, updateReviewStatus,
            saveChangesToCloud
         }}>
            {children}
        </CafeContext.Provider>
    );
};
