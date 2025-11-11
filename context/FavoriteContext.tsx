import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';

interface FavoriteContextType {
    favoriteIds: string[];
    addFavorite: (cafeId: string) => void;
    removeFavorite: (cafeId: string) => void;
    isFavorite: (cafeId: string) => boolean;
}

export const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'nongkrongr_favorites';

export const FavoriteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

    // Load favorites from localStorage on initial render
    useEffect(() => {
        try {
            const storedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
            if (storedFavorites) {
                setFavoriteIds(JSON.parse(storedFavorites));
            }
        } catch (error) {
            console.error("Failed to parse favorites from localStorage", error);
        }
    }, []);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
    }, [favoriteIds]);

    const addFavorite = (cafeId: string) => {
        setFavoriteIds(prevIds => [...prevIds, cafeId]);
    };

    const removeFavorite = (cafeId: string) => {
        setFavoriteIds(prevIds => prevIds.filter(id => id !== cafeId));
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
            {children}
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
