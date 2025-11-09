export enum PriceTier {
  BUDGET = 1,
  STANDARD = 2,
  PREMIUM = 3,
  LUXURY = 4,
}

export interface Amenity {
  id: string;
  name: string;
  icon: string; // Emoji or SVG string
}

export interface Vibe {
  id:string;
  name: string;
}

export interface Spot {
  id: string;
  title: string;
  tip: string;
  photoUrl: string;
}

export interface Review {
  id: string;
  author: string;
  ratingAesthetic: number; // 1-10
  ratingWork: number; // 1-10
  crowdMorning: number; // 1-5
  crowdAfternoon: number; // 1-5
  crowdEvening: number; // 1-5
  priceSpent: number;
  text: string;
  photos: string[];
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Cafe {
  id: string;
  slug: string;
  name: string;
  address: string;
  district: string;
  openingHours: string;
  priceTier: PriceTier;
  coords: {
    lat: number;
    lng: number;
  };
  isSponsored: boolean;
  sponsoredUntil: Date | null;
  sponsoredRank: number; // for ordering sponsored results
  logoUrl?: string; // Optional: URL for the cafe's logo
  coverUrl: string;
  vibes: Vibe[];
  amenities: Amenity[];
  spots: Spot[];
  reviews: Review[];
  // Aggregated scores
  avgAestheticScore: number;
  avgWorkScore: number;
  avgCrowdMorning: number;
  avgCrowdAfternoon: number;
  avgCrowdEvening: number;
}