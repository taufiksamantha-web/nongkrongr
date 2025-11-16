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
  created_at?: string;
}

export interface Vibe {
  id:string;
  name: string;
  created_at?: string;
}

export interface Spot {
  id: string;
  cafe_id?: string;
  title: string;
  tip: string;
  photoUrl: string;
  created_at?: string;
}

export interface Review {
  id: string;
  cafe_id?: string;
  author: string;
  ratingAesthetic: number; // 1-10
  ratingWork: number; // 1-10
  crowdMorning: number; // 1-5
  crowdAfternoon: number; // 1-5
  crowdEvening: number; // 1-5
  priceSpent: number;
  text: string;
  photos: string[];
  createdAt: string | Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Cafe {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  district: string;
  openingHours: string;
  priceTier: PriceTier;
  coords: {
    lat: number;
    lng: number;
  };
  isSponsored: boolean;
  sponsoredUntil: Date | string | null;
  sponsoredRank: number; // for ordering sponsored results
  logoUrl?: string; // Optional: URL for the cafe's logo
  coverUrl: string;
  vibes: Vibe[];
  amenities: Amenity[];
  spots: Spot[];
  reviews: Review[];
  created_at?: string;
  // Aggregated scores
  avgAestheticScore: number;
  avgWorkScore: number;
  avgCrowdMorning: number;
  avgCrowdAfternoon: number;
  avgCrowdEvening: number;
}

// For Supabase 'profiles' table
export interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  updated_at?: string;
}

// Combined user object for the app
export interface User extends Profile {}