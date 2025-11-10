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

export const DISTRICTS: string[] = [
    "Ilir Timur I", "Ilir Timur II", "Ilir Timur III", "Ilir Barat I", "Ilir Barat II",
    "Sukarami", "Sako", "Sematang Borang", "Alang-Alang Lebar", "Kemuning", "Kalidoni",
    "Bukit Kecil", "Kertapati", "Plaju", "Seberang Ulu I", "Seberang Ulu II", "Jakabaring", "Gandus"
];
