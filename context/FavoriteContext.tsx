
import React, { createContext, useState, useEffect, ReactNode, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';

interface FavoriteContextType {
    favoriteIds: string[];
    addFavorite: (cafeId: string) => void;
    removeFavorite: (cafeId: string) => void;
    isFavorite: (cafeId: string) => boolean;
}

export const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'nongkrongr_favorites';

export const FavoriteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const syncLocalFavoritesToDB = useCallback(async (userId: string) => {
        try {
            const localFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
            if (Array.isArray(localFavorites) && localFavorites.length > 0) {
                const records = localFavorites.map((cafeId: string) => ({ user_id: userId, cafe_id: cafeId }));
                // Upsert will insert new favorites and ignore duplicates on primary key conflict
                const { error } = await supabase.from('user_favorites').upsert(records, { onConflict: 'user_id,cafe_id' });
                if (error) throw error;
                // Clear local storage only after successful sync
                localStorage.removeItem(FAVORITES_STORAGE_KEY);
            }
        } catch (error) {
            console.error("Failed to sync local favorites to database:", error);
        }
    }, []);

    useEffect(() => {
        const loadFavorites = async () => {
            setLoading(true);
            if (currentUser) {
                // For logged-in users, sync local favorites first, then fetch all from DB.
                await syncLocalFavoritesToDB(currentUser.id);
                
                const { data, error } = await supabase
                    .from('user_favorites')
                    .select('cafe_id')
                    .eq('user_id', currentUser.id);
                
                if (error) {
                    console.error("Error fetching user favorites from DB:", error.message || error);
                    setFavoriteIds([]);
                } else {
                    setFavoriteIds(data.map(fav => fav.cafe_id));
                }
            } else {
                // For guest users, load from localStorage.
                try {
                    const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
                    if (storedFavorites) {
                        const parsed = JSON.parse(storedFavorites);
                        if (Array.isArray(parsed)) setFavoriteIds(parsed);
                    } else {
                        setFavoriteIds([]);
                    }
                } catch (error) {
                    console.error("Failed to load favorites from localStorage:", error);
                    setFavoriteIds([]);
                }
            }
            setLoading(false);
        };
        loadFavorites();
    }, [currentUser, syncLocalFavoritesToDB]);

    const addFavorite = async (cafeId: string) => {
        if (favoriteIds.includes(cafeId)) return;

        const newFavorites = [...favoriteIds, cafeId];
        setFavoriteIds(newFavorites);

        if (currentUser) {
            const { error } = await supabase.from('user_favorites').insert({ user_id: currentUser.id, cafe_id: cafeId });
            if (error) {
                console.error("Error adding favorite to DB:", error);
                // Revert optimistic update on error
                setFavoriteIds(prev => prev.filter(id => id !== cafeId));
            }
        } else {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        }
    };

    const removeFavorite = async (cafeId: string) => {
        const newFavorites = favoriteIds.filter(id => id !== cafeId);
        setFavoriteIds(newFavorites);

        if (currentUser) {
            const { error } = await supabase.from('user_favorites').delete().match({ user_id: currentUser.id, cafe_id: cafeId });
            if (error) {
                console.error("Error removing favorite from DB:", error);
                // Revert optimistic update
                setFavoriteIds(prev => [...prev, cafeId]);
            }
        } else {
            localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        }
    };

    const isFavorite = (cafeId: string) => {
        return favoriteIds.includes(cafeId);
    };

    const value = {
        favoriteIds,
        addFavorite,
        removeFavorite,
        isFavorite,
    };

    return (
        <FavoriteContext.Provider value={value}>
            {!loading && children}
        </FavoriteContext.Provider>
    );
};

export const useFavorites = () => {
    const context = useContext(FavoriteContext);
    if (context === undefined) {
        throw new Error('useFavorites must be used within a FavoriteProvider');
    }
    return context;
};
