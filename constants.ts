
import { Cafe, Review, User, UserRole, OpeningHours, CollectionItem, DailySchedule } from './types';
import { Coffee, MapPin, Star, TrendingUp, Utensils, Laptop, Camera, Zap, TreePalm, Music, DollarSign, Crown } from 'lucide-react';

export const LOGO_HOME_URL = "https://res.cloudinary.com/dovouihq8/image/upload/v1764663405/yntkr8sh1f2z5orn3jcg.png";
export const LOGO_DASHBOARD_URL = "https://res.cloudinary.com/dovouihq8/image/upload/v1764664004/hrj8boazgvct4cuaqdgg.png";

export const DEFAULT_USER_AVATAR = "https://nongkrongr.com/avatar/user.png";
export const DEFAULT_OWNER_AVATAR = "https://nongkrongr.com/avatar/owner.png";
export const DEFAULT_AVATAR = DEFAULT_USER_AVATAR; 

export const WEBSITE_URL = 'https://nongkrongr.com'; 
export const VAPID_PUBLIC_KEY = 'BPzJQGmbb0jix0Bue7zH0h2WNCVo8J5kS9VohE3LBbme4EG-vDP9JhjGGgbNvvYjedmMD35prq7N0A_MEgrB-0A'; 

// --- HOT CODE PUSH VERSIONING ---
// Update konstanta ini setiap kali melakukan perubahan fitur/tampilan.
// Sistem updater akan membandingkan versi ini dengan versi di server.
export const APP_VERSION = "1.2.5"; 
export const APP_CODE_STRUCTURE = { version: APP_VERSION, env: "production" };

export const getOptimizedImageUrl = (url: string, width: number): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_${width},c_fill,g_auto,f_auto,q_auto/`);
};

export const getLowResImageUrl = (url: string): string => {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/w_50,c_fill,g_auto,f_auto,q_low,e_blur:1000/`);
};

export const DEFAULT_COLLECTIONS: CollectionItem[] = [
    { id: 'wfc', title: 'Work From Cafe', subtitle: 'Tenang & Produktif', description: "Spot terbaik dengan WiFi kencang dan suasana kondusif buat kejar deadline.", image: "https://images.unsplash.com/photo-1593902340324-424f136697d0?q=80&w=2070&auto=format&fit=crop", filterTag: 'Workspace', color: 'bg-blue-100 text-blue-600' },
    { id: 'date', title: 'Date Night', subtitle: 'Romantis & Aesthetic', description: "Pilihan tempat romantis dengan ambiance warm dan cozy untuk momen spesialmu.", image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=2070&auto=format&fit=crop", filterTag: 'Aesthetic', color: 'bg-pink-100 text-pink-600' },
    { id: 'family', title: 'Family Time', subtitle: 'Ramah Anak & Luas', description: "Kafe luas yang nyaman untuk membawa keluarga besar dan anak-anak.", image: "https://images.unsplash.com/photo-1623682697838-51e6ba24e93e?q=80&w=2070&auto=format&fit=crop", filterTag: 'Family', color: 'bg-green-100 text-green-600' },
    { id: 'food', title: 'Makan Berat', subtitle: 'Lapar Banget?', description: "Gak cuma ngopi, tempat ini punya menu makanan berat yang juara rasanya.", image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1974&auto=format&fit=crop", filterTag: 'Main Course', color: 'bg-orange-100 text-orange-600' },
];

export const COLLECTION_TAG_MAPPING: Record<string, string[]> = {
    'wfc': ['Workspace', 'Indoor', 'Tenang', 'Library', 'Office', 'Nugas', 'Meeting', 'Quiet'],
    'date': ['Aesthetic', 'Rooftop', 'Luxury', 'Fine Dining', 'Romantic', 'Intimate', 'Live Music', 'View', 'Date'],
    'family': ['Family', 'Outdoor', 'Luas', 'Kids Friendly', 'Playground', 'Large Group', 'Ramah Anak'],
    'food': ['Main Course', 'Resto', 'Makan Berat', 'Breakfast', 'Lunch', 'Dinner', 'Western', 'Indonesian', 'Pastry']
};

export const QUICK_ACCESS_MENU = [
    { id: 'top_rated', label: 'Top Rated', icon: Star, color: 'bg-yellow-100 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'bg-red-100 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
    { id: 'near_me', label: 'Terdekat', icon: MapPin, color: 'bg-blue-100 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400' },
    { id: '24h', label: '24 Jam', icon: Zap, color: 'bg-gray-100 dark:bg-slate-800', text: 'text-gray-600 dark:text-gray-400' },
    { id: 'coffee', label: 'Ngopi', icon: Coffee, color: 'bg-orange-100 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400' },
    { id: 'food', label: 'Makan', icon: Utensils, color: 'bg-green-100 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
    { id: 'wfc', label: 'WFC', icon: Laptop, color: 'bg-purple-100 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400' },
    { id: 'aesthetic', label: 'Aesthetic', icon: Camera, color: 'bg-pink-100 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400' },
    { id: 'outdoor', label: 'Outdoor', icon: TreePalm, color: 'bg-emerald-100 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
    { id: 'live_music', label: 'Live Music', icon: Music, color: 'bg-indigo-100 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
    { id: 'cheap', label: 'Hemat', icon: DollarSign, color: 'bg-teal-100 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400' },
    { id: 'luxury', label: 'Sultan', icon: Crown, color: 'bg-amber-100 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400' },
];

export const SEARCH_PLACEHOLDERS = [
    "Lagi butuh kopi susu gula aren? ☕",
    "Cari tempat WFC wifi kenceng? 💻",
    "Spot foto aesthetic buat feed IG? 📸",
    "Kafe outdoor yang adem? 🍃",
    "Tempat nongkrong buka 24 jam? 🌙",
    "Cari live music buat malam mingguan? 🎸",
    "Lapar? Cari kafe yang makanannya enak 🍝",
    "Tempat meeting santai sama klien? 🤝",
    "Kafe ramah anak dan keluarga? 👨‍👩‍👧",
    "Nyari kopi manual brew terbaik? 🍵",
    "Spot sunset paling cantik dimana? 🌅",
    "Kafe yang ada malam mingguan? 🎸",
    "Tempat nugas yang colokannya banyak? 🔌",
    "Cari diskon atau promo ngopi? 🎟️",
    "Hidden gem yang belum banyak orang tau? 💎",
    "Tempat sarapan pagi yang cozy? 🍳",
    "Kafe dengan suasana vintage? 📻",
    "Mau ngopi sambil baca buku? 📚",
    "Cari es kopi susu kekinian? 🥤",
    "Tempat healing tipis-tipis? 🧘"
];

const deg2rad = (deg: number) => deg * (Math.PI / 180);

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 9999;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return 9999;
  
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  const multiplier = 1.35; 
  return parseFloat((d * multiplier).toFixed(1));
};

export const estimateTime = (distanceKm: number): number => {
    let factor = distanceKm < 2 ? 5 : distanceKm < 10 ? 4 : 3;
    return Math.max(1, Math.round(distanceKm * factor));
};

export const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} mnt`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h} jam ${m} mnt` : `${h} jam`;
};

export const formatRating = (rating: number): string => (rating || 0).toFixed(1);

export const getCafeStatus = (openingHours?: OpeningHours, masterIsOpen: boolean = true) => {
  if (!masterIsOpen) return { text: 'Tutup Sementara', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', isOpen: false };
  if (!openingHours) return { text: 'Tutup', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', isOpen: false };
  
  const now = new Date();
  const currentDay = now.getDay(); 
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (openingHours.schedules && openingHours.schedules.length > 0) {
      const todaySchedule = openingHours.schedules.find(s => s.day === currentDay);
      if (!todaySchedule || todaySchedule.isClosed) return { text: 'Tutup', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', isOpen: false };
      if (todaySchedule.is24Hours) return { text: 'Buka 24 Jam', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', isOpen: true };

      const openTime = todaySchedule.open || '08:00';
      const closeTime = todaySchedule.close || '22:00';
      
      const [startHour, startMinute] = openTime.split(':').map(Number);
      const [endHour, endMinute] = closeTime.split(':').map(Number);
      const startTotal = (startHour || 0) * 60 + (startMinute || 0);
      let endTotal = (endHour || 0) * 60 + (endMinute || 0);

      if (endTotal < startTotal) endTotal += 24 * 60;
      let adjustedCurrent = currentMinutes;
      if (adjustedCurrent < startTotal && (adjustedCurrent + 24 * 60) < endTotal) adjustedCurrent += 24 * 60;

      if (adjustedCurrent >= startTotal && adjustedCurrent < endTotal) {
          if (endTotal - adjustedCurrent <= 60) return { text: 'Segera Tutup', color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500', isOpen: true };
          return { text: 'Buka', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', isOpen: true };
      }
      return { text: 'Tutup', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', isOpen: false };
  }

  if (openingHours.is24Hours) return { text: 'Buka 24 Jam', color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500', isOpen: true };
  return { text: 'Tutup', color: 'text-red-500', bg: 'bg-red-50', dot: 'bg-red-500', isOpen: false };
};

export const FACILITIES = ['Wi-Fi', 'AC', 'Smoking Area', 'Live Music', 'Socket', 'Prayer Room', 'Parking', 'Toilet'];
