import { Amenity, Vibe } from './types';

export const AMENITIES: Amenity[] = [
  { id: 'wifi', name: 'WiFi Cepat', icon: '📶' },
  { id: 'power', name: 'Stop Kontak', icon: '🔌' },
  { id: 'ac', name: 'AC Dingin', icon: '❄️' },
  { id: 'outdoor', name: 'Outdoor Area', icon: '🌳' },
  { id: 'indoor', name: 'Indoor Area', icon: '🏠' },
  { id: 'musholla', name: 'Musholla', icon: '🕌' },
  { id: 'parking', name: 'Parkir Luas', icon: '🅿️' },
];

export const VIBES: Vibe[] = [
  { id: 'cozy', name: 'Cozy' },
  { id: 'minimalis', name: 'Minimalis' },
  { id: 'industrial', name: 'Industrial' },
  { id: 'tropical', name: 'Tropical' },
  { id: 'classic', name: 'Klasik' },
];

export const SOUTH_SUMATRA_CITIES: string[] = [
    "Palembang", "Prabumulih", "Lubuklinggau", "Pagar Alam", 
    "Banyuasin", "Empat Lawang", "Lahat", "Muara Enim", "Musi Banyuasin",
    "Musi Rawas", "Musi Rawas Utara", "Ogan Ilir", "Ogan Komering Ilir",
    "Ogan Komering Ulu", "OKU Selatan", "OKU Timur", "Penukal Abab Lematang Ilir"
];

// Fallback image URLs
export const DEFAULT_FAVICON_URL = "https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png";
export const DEFAULT_COVER_URL = "https://res.cloudinary.com/dovouihq8/image/upload/qgubxuffizriweewq9ui.png";