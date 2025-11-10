import { Cafe, Review } from '../types';

// This service now contains pure functions for data manipulation.
// The state (`cafes` array) is managed in CafeContext.

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
  addReview: (currentCafes: Cafe[], slug: string, review: Omit<Review, 'id' | 'createdAt' | 'status'>): Cafe[] => {
    const newCafes = [...currentCafes];
    const cafeIndex = newCafes.findIndex(c => c.slug === slug);
    if (cafeIndex > -1) {
        const newReview: Review = {
            ...review,
            id: `r${Date.now()}`,
            createdAt: new Date(),
            status: 'pending',
        };
        newCafes[cafeIndex].reviews.push(newReview);
    }
    return newCafes;
  },
  
  addCafe: (currentCafes: Cafe[], cafe: Omit<Cafe, 'id' | 'slug' | 'reviews' | 'avgAestheticScore' | 'avgWorkScore' | 'avgCrowdEvening' | 'avgCrowdMorning' | 'avgCrowdAfternoon'>): Cafe[] => {
    const newCafe: Cafe = {
      ...cafe,
      id: `${Date.now()}`,
      slug: cafe.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''),
      logoUrl: cafe.logoUrl || '',
      reviews: [],
      avgAestheticScore: 0,
      avgWorkScore: 0,
      avgCrowdMorning: 0,
      avgCrowdAfternoon: 0,
      avgCrowdEvening: 0
    };
    return [...currentCafes, newCafe];
  },

  updateCafe: (currentCafes: Cafe[], id: string, updatedData: Partial<Cafe>): Cafe[] => {
     const newCafes = [...currentCafes];
     const cafeIndex = newCafes.findIndex(c => c.id === id);
     if (cafeIndex > -1) {
        newCafes[cafeIndex] = { ...newCafes[cafeIndex], ...updatedData };
        if (updatedData.reviews) { // If reviews are part of the update, recalculate
            newCafes[cafeIndex] = recalculateAverages(newCafes[cafeIndex]);
        }
     }
     return newCafes;
  },
  
  deleteCafe: (currentCafes: Cafe[], id: string): Cafe[] => {
     return currentCafes.filter(c => c.id !== id);
  },

  getPendingReviews: (currentCafes: Cafe[]): (Review & { cafeName: string; cafeId: string })[] => {
    const pendingReviews: (Review & { cafeName: string; cafeId: string })[] = [];
    currentCafes.forEach(cafe => {
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

  updateReviewStatus: (currentCafes: Cafe[], reviewId: string, status: Review['status']): Cafe[] => {
    const newCafes = JSON.parse(JSON.stringify(currentCafes)); // Deep copy to avoid mutation issues
    for (let i = 0; i < newCafes.length; i++) {
        const reviewIndex = newCafes[i].reviews.findIndex((r: Review) => r.id === reviewId);
        if (reviewIndex > -1) {
            newCafes[i].reviews[reviewIndex].status = status;
            newCafes[i] = recalculateAverages(newCafes[i]);
            break; // Exit loop once found and updated
        }
    }
    return newCafes;
  }
};