
import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { Cafe, Review, Tag } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
const ITEMS_PER_PAGE = 12;

// --- Client-Side Data Processing ---
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

// --- Supabase Data Helpers ---
const prepareCafeRecordForSupabase = (data: Partial<Cafe> & { created_by?: string }) => {
    const record = {
        id: data.id,
        name: data.name, slug: data.slug, description: data.description, address: data.address,
        city: data.city, district: data.district, openingHours: data.openingHours, priceTier: data.priceTier,
        lat: data.coords?.lat, lng: data.coords?.lng, isSponsored: data.isSponsored, sponsoredUntil: data.sponsoredUntil,
        sponsoredRank: data.sponsoredRank, logoUrl: data.logoUrl, coverUrl: data.coverUrl, manager_id: data.manager_id, 
        created_by: data.created_by,
        status: data.status,
        phoneNumber: data.phoneNumber,
        websiteUrl: data.websiteUrl,
    };
    Object.keys(record).forEach(key => (record as any)[key] === undefined && delete (record as any)[key]);
    return record;
};

const updateCafeRelationsInSupabase = async (cafeId: string, relations: Partial<Cafe>) => {
    if (relations.vibes !== undefined) {
        await supabase.from('cafe_vibes').delete().eq('cafe_id', cafeId);
        if (relations.vibes.length > 0) {
            const { error } = await supabase.from('cafe_vibes').insert(relations.vibes.map(v => ({ cafe_id: cafeId, vibe_id: v.id })));
            if (error) throw error;
        }
    }

    if (relations.amenities !== undefined) {
        await supabase.from('cafe_amenities').delete().eq('cafe_id', cafeId);
        if (relations.amenities.length > 0) {
            const { error } = await supabase.from('cafe_amenities').insert(relations.amenities.map(a => ({ cafe_id: cafeId, amenity_id: a.id })));
            if (error) throw error;
        }
    }

    if (relations.spots !== undefined) {
        await supabase.from('spots').delete().eq('cafe_id', cafeId);
        if (relations.spots.length > 0) {
            const { error } = await supabase.from('spots').insert(relations.spots.map(s => ({ ...s, cafe_id: cafeId })));
            if (error) throw error;
        }
    }
    
    if (relations.events !== undefined) {
        await supabase.from('events').delete().eq('cafe_id', cafeId);
        if (relations.events.length > 0) {
            const { error } = await supabase.from('events').insert(relations.events.map(e => ({ ...e, cafe_id: cafeId })));
            if (error) throw error;
        }
    }
};

// --- Fetcher Function for React Query ---
const fetchCafesPage = async ({ pageParam = 0 }: { pageParam: number }) => {
    const from = pageParam * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // 1. Fetch Cafes with Server-Side Pagination
    const { data, error } = await supabase
        .from('cafes')
        .select(`*,vibes:cafe_vibes(*, vibes(*)),amenities:cafe_amenities(*, amenities(*)),tags:cafe_tags(*, tags(*)),spots(*),reviews(*),events(*)`)
        .range(from, to)
        .order('created_at', { ascending: false });

    if (error) throw error;
    
    // 2. OPTIMIZED: Fetch Profiles ONLY for authors in the fetched reviews
    const authors = new Set<string>();
    data.forEach((cafe: any) => {
        if (cafe.reviews && Array.isArray(cafe.reviews)) {
            cafe.reviews.forEach((r: any) => {
                if (r.author) authors.add(r.author);
            });
        }
    });

    const profileAvatarMap = new Map<string, string>();
    
    if (authors.size > 0) {
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .in('username', Array.from(authors));
            
        if (profilesData) {
            for (const profile of profilesData) {
                if (profile.username && profile.avatar_url) {
                    profileAvatarMap.set(profile.username, profile.avatar_url);
                }
            }
        }
    }

    // 3. Format Data
    const formattedData = data.map(cafe => ({
        ...cafe, coords: { lat: cafe.lat ?? 0, lng: cafe.lng ?? 0 },
        vibes: cafe.vibes.map((v: any) => v.vibes).filter(Boolean),
        amenities: cafe.amenities.map((a: any) => a.amenities).filter(Boolean),
        tags: cafe.tags.map((t: any) => t.tags).filter(Boolean),
        spots: cafe.spots || [], events: cafe.events || [],
        reviews: (cafe.reviews || []).map((r: any) => ({ 
            ...r, 
            photos: Array.isArray(r.photos) ? r.photos.filter(Boolean) : [], 
            helpful_count: r.helpful_count || 0,
            author_avatar_url: profileAvatarMap.get(r.author) || null,
        })),
    } as Cafe));
    
    const cafesWithAverages = formattedData.map(calculateAverages);
    
    return cafesWithAverages;
};

// --- Context Definition ---
interface CafeContextType {
    cafes: Cafe[]; // This now returns a flattened list of all loaded pages
    loading: boolean;
    error: string | null;
    fetchCafes: (force?: boolean) => Promise<void>; // Kept for interface compatibility, but mainly triggers refetch
    fetchNextPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    
    addCafe: (cafeData: Partial<Cafe>) => Promise<{ data: any, error: any }>;
    updateCafe: (id: string, updatedData: Partial<Cafe>) => Promise<{ data: any, error: any }>;
    deleteCafe: (id: string) => Promise<{ error: any }>;
    archiveCafe: (id: string) => Promise<{ error: any }>;
    restoreCafe: (id: string) => Promise<{ error: any }>;
    deleteMultipleCafes: (ids: string[]) => Promise<{ error: any }>;
    
    addReview: (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => Promise<{ data: any, error: any }>;
    updateReviewStatus: (reviewId: string, status: Review['status']) => Promise<{ error: any }>;
    deleteReview: (reviewId: string) => Promise<{ error: any }>;
    incrementHelpfulCount: (reviewId: string) => Promise<{ error: any }>;
    
    getPendingReviews: () => (Review & { cafeName: string; cafeId: string; cafeSlug: string })[];
    getAllReviews: () => (Review & { cafeName: string; cafeId: string; cafeSlug: string })[];
    getPendingCafes: () => Cafe[];
    getRejectedCafes: () => Cafe[];
    getArchivedCafes: () => Cafe[];
    updateCafeStatus: (cafeId: string, status: Cafe['status']) => Promise<{ error: any }>;
    
    getAllTags: () => Promise<Tag[]>;
    addTagToCafe: (cafeId: string, tagName: string) => Promise<{ data: any, error: any }>;
    removeTagFromCafe: (cafeId: string, tagId: string) => Promise<{ error: any }>;
}

export const CafeContext = createContext<CafeContextType | undefined>(undefined);

// --- Provider Component ---
export const CafeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { currentUser } = useAuth();

    // REACT QUERY: Infinite Query Implementation
    const {
        data,
        error: queryError,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        refetch
    } = useInfiniteQuery({
        queryKey: ['cafes'],
        queryFn: fetchCafesPage,
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            return lastPage.length === ITEMS_PER_PAGE ? allPages.length : undefined;
        },
        staleTime: 1000 * 60 * 5, // 5 Minutes
    });

    // Flatten pages into a single array for consumption by existing components
    const cafes = useMemo(() => {
        return data?.pages.flatMap(page => page) || [];
    }, [data]);

    // Manual fetch (now just refetch)
    const fetchCafes = useCallback(async () => {
        await refetch();
    }, [refetch]);

    // REALTIME UPDATES
    // Using queryClient.invalidateQueries is safer than manual state manipulation with pagination
    useEffect(() => {
        const channel = supabase.channel('nongkrongr-db-changes-rq')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafes' }, () => {
                queryClient.invalidateQueries({ queryKey: ['cafes'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
                 queryClient.invalidateQueries({ queryKey: ['cafes'] });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cafe_tags' }, () => {
                 queryClient.invalidateQueries({ queryKey: ['cafes'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);


    // --- MUTATIONS (Wrapped with React Query Invalidation) ---
    
    const addCafe = async (cafeData: Partial<Cafe>) => {
        const safeName = cafeData.name || 'cafe';
        const slug = `${safeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${Math.random().toString(36).substring(2, 6)}`;
        const newId = `cafe-${crypto.randomUUID()}`;
        const status = currentUser?.role === 'admin' ? 'approved' : 'pending';

        try {
            const { vibes, amenities, spots, events, ...mainData } = cafeData;
            const manager_id = (currentUser?.role === 'admin_cafe') ? currentUser.id : (cafeData.manager_id || null);
            
            const record = prepareCafeRecordForSupabase({ 
                ...mainData, 
                id: newId,
                slug, 
                status,
                manager_id,
                created_by: currentUser?.id
            });
            const { data: newCafeDb, error: mainError } = await supabase.from('cafes').insert(record).select().single();
            if (mainError) throw mainError;
            await updateCafeRelationsInSupabase(newCafeDb.id, { vibes, amenities, spots, events });
            
            // Invalidate query to refetch new data
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { data: newCafeDb, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const updateCafe = async (id: string, updatedData: Partial<Cafe>) => {
        try {
            const { vibes, amenities, spots, events, ...mainData } = updatedData;
            const record = prepareCafeRecordForSupabase(mainData);
            if (Object.keys(record).length > 1 || record.id === undefined) {
                const { error: mainError } = await supabase.from('cafes').update(record).eq('id', id);
                if (mainError) throw mainError;
            }
            await updateCafeRelationsInSupabase(id, { vibes, amenities, spots, events });
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { data: { id }, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const deleteCafe = async (id: string) => {
        try {
            const { error } = await supabase.from('cafes').delete().eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    const archiveCafe = async (id: string) => {
        try {
            const { error } = await supabase.from('cafes').update({ status: 'archived' }).eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    const restoreCafe = async (id: string) => {
        try {
            const { error } = await supabase.from('cafes').update({ status: 'approved' }).eq('id', id);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };
    
    const deleteMultipleCafes = async (ids: string[]) => {
        try {
            const { error } = await supabase.from('cafes').delete().in('id', ids);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    const addReview = async (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => {
        // EXPLICITLY construct the object to avoid spreading unwanted props that trigger schema cache errors
        const newReview = { 
            id: `review-${crypto.randomUUID()}`,
            cafe_id: review.cafe_id,
            author: review.author,
            ratingAesthetic: review.ratingAesthetic,
            ratingWork: review.ratingWork,
            crowdMorning: review.crowdMorning,
            crowdAfternoon: review.crowdAfternoon,
            crowdEvening: review.crowdEvening,
            priceSpent: review.priceSpent,
            text: review.text,
            photos: review.photos,
            status: 'pending' as const, 
            createdAt: new Date().toISOString(), 
            helpful_count: 0 
        };

        const { data, error } = await supabase.from('reviews').insert(newReview);
        // Note: Realtime subscription usually catches this, but invalidation is safer
        queryClient.invalidateQueries({ queryKey: ['cafes'] }); 
        if (error) return { data: null, error };
        return { data, error: null };
    };

    const updateReviewStatus = async (reviewId: string, status: Review['status']) => {
        try {
            const { error } = await supabase.from('reviews').update({ status }).eq('id', reviewId);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    const deleteReview = async (reviewId: string) => {
        try {
            const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    const incrementHelpfulCount = async (reviewId: string): Promise<{ error: any }> => {
        // Optimistic update helper could go here, but for simplicity with React Query pagination:
        try {
            const { data: currentReview, error: fetchError } = await supabase
                .from('reviews').select('helpful_count').eq('id', reviewId).single();

            if (fetchError) throw fetchError;

            const newCount = (currentReview?.helpful_count || 0) + 1;

            const { error: updateError } = await supabase
                .from('reviews').update({ helpful_count: newCount }).eq('id', reviewId);

            if (updateError) throw updateError;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };

        } catch (error: any) {
            return { error };
        }
    };

    const updateCafeStatus = async (cafeId: string, status: Cafe['status']) => {
        try {
            const { error } = await supabase.from('cafes').update({ status }).eq('id', cafeId);
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };

    // Non-cached helpers (Fetching specific tags is lightweight)
    const getAllTags = async (): Promise<Tag[]> => {
        const { data, error } = await supabase.from('tags').select('*');
        if (error) return [];
        return data as Tag[];
    };

    const addTagToCafe = async (cafeId: string, tagName: string) => {
        const normalizedTagName = tagName.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!normalizedTagName || !currentUser) {
            return { data: null, error: { message: "Invalid tag name or user not logged in." } };
        }
        try {
            let { data: existingTag } = await supabase.from('tags').select('id, name').eq('name', normalizedTagName).single();
            let tag: Tag;
            if (existingTag) {
                tag = existingTag;
            } else {
                const newTagId = `tag-${crypto.randomUUID()}`;
                const { data: newTag, error: createError } = await supabase.from('tags').insert({ id: newTagId, name: normalizedTagName, created_by: currentUser.id }).select().single();
                if (createError) throw createError;
                tag = newTag;
            }
            const { error: linkError } = await supabase.from('cafe_tags').insert({ cafe_id: cafeId, tag_id: tag.id });
            if (linkError && linkError.code !== '23505') throw linkError;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { data: tag, error: null };
        } catch (err: any) {
            return { data: null, error: err };
        }
    };

    const removeTagFromCafe = async (cafeId: string, tagId: string) => {
        try {
            const { error } = await supabase.from('cafe_tags').delete().match({ cafe_id: cafeId, tag_id: tagId });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['cafes'] });
            return { error: null };
        } catch (err: any) {
            return { error: err };
        }
    };
    
    const getPendingReviews = () => cafes.flatMap(c => c.reviews.filter(r => r.status === 'pending').map(r => ({ ...r, cafeName: c.name, cafeId: c.id, cafeSlug: c.slug })));
    const getAllReviews = () => cafes.flatMap(c => c.reviews.map(r => ({ ...r, cafeName: c.name, cafeId: c.id, cafeSlug: c.slug }))).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const getPendingCafes = () => cafes.filter(c => c.status === 'pending');
    const getRejectedCafes = () => cafes.filter(c => c.status === 'rejected');
    const getArchivedCafes = () => cafes.filter(c => c.status === 'archived');

    return (
        <CafeContext.Provider value={{
            cafes, 
            loading: isFetching && !cafes.length, // Only show full loading on initial fetch
            error: queryError ? (queryError as Error).message : null,
            fetchCafes, 
            fetchNextPage,
            hasNextPage,
            isFetchingNextPage,
            addCafe, updateCafe, deleteCafe, archiveCafe, restoreCafe, deleteMultipleCafes,
            addReview, updateReviewStatus, deleteReview, incrementHelpfulCount, 
            getPendingReviews, getAllReviews, getPendingCafes, getRejectedCafes, getArchivedCafes, 
            updateCafeStatus, getAllTags, addTagToCafe, removeTagFromCafe
        }}>
            {children}
        </CafeContext.Provider>
    );
};
