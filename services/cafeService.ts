import { MOCK_CAFES } from '../constants';
import { Cafe, Review } from '../types';

let cafes: Cafe[] = JSON.parse(JSON.stringify(MOCK_CAFES));

const recalculateAverages = (cafe: Cafe): Cafe => {
    const approvedReviews = cafe.reviews.filter(r => r.status === 'approved');
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

export const cafeService = {
  getCafes: async (): Promise<Cafe[]> => {
    await new Promise(res => setTimeout(res, 500));
    return cafes;
  },

  getCafeBySlug: async (slug: string): Promise<Cafe | undefined> => {
    await new Promise(res => setTimeout(res, 300));
    return cafes.find(cafe => cafe.slug === slug);
  },

  addReview: async (slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>): Promise<Cafe | null> => {
    await new Promise(res => setTimeout(res, 700));
    const cafeIndex = cafes.findIndex(c => c.slug === slug);
    if (cafeIndex > -1) {
        const newReview: Review = {
            ...review,
            id: `r${Date.now()}`,
            createdAt: new Date(),
            status: 'pending',
        };
        cafes[cafeIndex].reviews.push(newReview);
        // Averages are NOT recalculated until review is approved
        return cafes[cafeIndex];
    }
    return null;
  },
  
  addCafe: async (cafe: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>): Promise<Cafe> => {
    await new Promise(res => setTimeout(res, 500));
    const newCafe: Cafe = {
      ...cafe,
      id: `${Date.now()}`,
      slug: cafe.name.toLowerCase().replace(/\s+/g, '-'),
      reviews: [],
      avgAestheticScore: 0,
      avgWorkScore: 0,
      avgCrowdMorning: 0,
      avgCrowdAfternoon: 0,
      avgCrowdEvening: 0
    }
    cafes.push(newCafe);
    return newCafe;
  },

  updateCafe: async (id: string, updatedData: Partial<Cafe>): Promise<Cafe | null> => {
     await new Promise(res => setTimeout(res, 500));
     const cafeIndex = cafes.findIndex(c => c.id === id);
     if (cafeIndex > -1) {
        cafes[cafeIndex] = { ...cafes[cafeIndex], ...updatedData };
        if (updatedData.reviews) {
            cafes[cafeIndex] = recalculateAverages(cafes[cafeIndex]);
        }
        return cafes[cafeIndex];
     }
     return null;
  },
  
  deleteCafe: async (id: string): Promise<boolean> => {
     await new Promise(res => setTimeout(res, 500));
     const initialLength = cafes.length;
     cafes = cafes.filter(c => c.id !== id);
     return cafes.length < initialLength;
  },

  getPendingReviews: async (): Promise<(Review & { cafeName: string; cafeId: string })[]> => {
    await new Promise(res => setTimeout(res, 400));
    const pendingReviews: (Review & { cafeName: string; cafeId: string })[] = [];
    cafes.forEach(cafe => {
        cafe.reviews.forEach(review => {
            if (review.status === 'pending') {
                pendingReviews.push({
                    ...review,
                    cafeName: cafe.name,
                    cafeId: cafe.id
                });
            }
        });
    });
    return pendingReviews;
  },

  updateReviewStatus: async (reviewId: string, status: Review['status']): Promise<boolean> => {
    await new Promise(res => setTimeout(res, 600));
    for (let i = 0; i < cafes.length; i++) {
        const reviewIndex = cafes[i].reviews.findIndex(r => r.id === reviewId);
        if (reviewIndex > -1) {
            cafes[i].reviews[reviewIndex].status = status;
            cafes[i] = recalculateAverages(cafes[i]);
            return true;
        }
    }
    return false;
  }
};