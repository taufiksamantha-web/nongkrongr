
export const UserRole = {
  GUEST: 'GUEST',
  USER: 'USER',
  ADMIN: 'ADMIN'
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

export type ViewState = 'HOME' | 'MAP' | 'EXPLORE' | 'DETAIL' | 'DASHBOARD' | 'PRIVACY_POLICY' | 'EMAIL_CONFIRMED' | 'COLLECTION' | 'PROMO' | 'COMMUNITY' | 'SUPPORT';

export type User = {
  id: string;
  name: string;
  username: string; 
  avatar_url: string; 
  role: string; 
  email: string;
  savedCafeIds?: string[];
  status?: 'active' | 'pending' | 'rejected' | 'banned';
  created_at?: string;
  last_login?: string; 
  reviewsCount?: number; 
  isOnboarded?: boolean;
  preferences?: string[];
  last_location?: { lat: number, lng: number }; 
  isLocationShared?: boolean; 
  last_active_at?: string;
};

// --- NEW TYPES FOR MENU & ORDERS ---

export type MenuItem = {
  id: string;
  cafe_id: string;
  name: string;
  description: string;
  price: string; 
  image_url: string;
  category: string;
  is_available: boolean;
  created_at: string;
};

export type OrderItem = {
  id?: string;
  order_id?: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  notes?: string;
  menu_item?: MenuItem;
};

export type Order = {
  id: string;
  cafe_id: string;
  order_number: string;
  customer_name: string;
  order_type: 'dine-in' | 'takeaway';
  table_number?: string;
  total_amount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  order_items?: OrderItem[];
  cafe?: { name: string, image: string };
};

// --- GLOBAL CART TYPES ---

export type CartCafeGroup = {
    cafe: {
        id: string;
        name: string;
        image: string;
        owner_id?: string;
    };
    items: OrderItem[];
};

export type GlobalCart = Record<string, CartCafeGroup>;

// --- EXISTING TYPES ---

export type NearbyUser = {
    id: string;
    name: string;
    avatar_url: string; 
    role: string;
    distance: number; 
    isOnline?: boolean;
    lastActive?: string;
};

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'like' | 'review' | 'promo' | 'event' | 'approval' | 'rejection' | 'wave'; 
  isRead: boolean;
  time: string;
  targetId?: string;
  metadata?: any;
};

export type HeroConfig = {
  title: string;
  description: string;
  backgroundImage: string;
};

export type Review = {
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
  cafeImage?: string;
  cafeAddress?: string;
  userRole?: string;
};

export type DailySchedule = {
  day: number; 
  open: string; 
  close: string; 
  isClosed: boolean; 
  is24Hours: boolean;
};

export type OpeningHours = {
  start?: string;
  end?: string;
  is24Hours?: boolean;
  schedules?: DailySchedule[]; 
};

export type PhotoSpot = {
  title: string;
  image: string;
};

export type Promo = {
  id: string;
  title: string;
  description?: string;
  code?: string;
  endDate?: string;
  value?: string;
  created_at?: string;
};

export type CafeEvent = {
  id: string;
  title: string;
  date: string; 
  description?: string;
};

export type Cafe = {
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
  dist?: number;
  time?: number;
  is_verified?: boolean; 
  status?: 'active' | 'pending' | 'rejected';
  rejectionReason?: string;
  openingHours?: OpeningHours;
  photoSpots?: PhotoSpot[];
  owner_id?: string;
  promos?: Promo[]; 
  events?: CafeEvent[]; 
  phoneNumber?: string; 
  created_at?: string; 
};

export type CollectionItem = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    image: string;
    filterTag: string;
    color: string;
};

export type SupportRoom = {
    id: string;
    user_id: string;
    status: 'open' | 'closed';
    created_at: string;
    last_message?: string;
    updated_at?: string;
};

export type SupportMessage = {
    id: string;
    room_id: string;
    sender_id: string; 
    message: string;
    created_at: string;
    is_read: boolean;
    is_admin?: boolean; 
};
