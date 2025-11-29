

export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  CAFE_MANAGER = 'CAFE_MANAGER',
  ADMIN = 'ADMIN'
}

export interface User {
  id: string;
  name: string;
  username: string; // Wajib ada sesuai schema baru
  avatar: string;
  role: string; // Disimpan sebagai string di DB ('USER', 'CAFE_MANAGER', 'ADMIN')
  email: string;
  savedCafeIds?: string[];
  status?: 'active' | 'pending' | 'rejected' | 'banned';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'like' | 'review';
  isRead: boolean;
  time: string;
  targetId?: string;
}

export interface HeroConfig {
  title: string;
  description: string;
  backgroundImage: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
  reply?: string;
  cafeId?: string;
  cafeName?: string;
}

export interface OpeningHours {
  start: string;
  end: string;
  is24Hours: boolean;
}

export interface PhotoSpot {
  title: string;
  image: string;
}

export interface Cafe {
  id: string;
  name: string;
  description: string;
  rating: number;
  reviewsCount: number;
  address: string;
  coordinates: { lat: number; lng: number };
  image: string;
  images: string[];
  tags: string[];
  facilities: string[];
  priceRange: string;
  isOpen: boolean;
  distance?: string;
  isVerified?: boolean;
  status?: 'active' | 'pending' | 'rejected';
  openingHours?: OpeningHours;
  photoSpots?: PhotoSpot[];
  owner_id?: string;
}

export interface Post {
  id: string;
  cafeId: string;
  cafeName: string;
  cafeAvatar: string;
  content: string;
  image?: string;
  likes: number;
  timestamp: string;
}

export type ViewState = 'HOME' | 'MAP' | 'EXPLORE' | 'DETAIL' | 'DASHBOARD' | 'LOGIN';