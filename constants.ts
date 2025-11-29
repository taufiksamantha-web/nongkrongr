
import { Cafe, Post, Review, User, UserRole } from './types';

export const LOGO_URL = "https://res.cloudinary.com/dovouihq8/image/upload/v1762701734/Logo.png";

// Utility: Optimize Cloudinary Image URL (Auto Format, Auto Quality, Resize)
export const getOptimizedImageUrl = (url: string, width: number = 500): string => {
  if (!url) return '';
  // Check if it's a Cloudinary URL
  if (url.includes('cloudinary.com')) {
      // If it's already optimized/transformed, we might want to replace the transformation
      // but simpler to just inject if missing.
      if (url.includes('/upload/') && !url.includes('/f_auto,q_auto')) {
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
      }
      // If it has transformations but we want to ensure width
      if (url.includes('/upload/') && url.includes('/f_auto,q_auto')) {
          // This is a basic regex replace, might need robust logic for complex URLs
          // but sufficient for standard upload usage
          return url; 
      }
  }
  return url;
};

// Utility: Calculate Distance (Haversine Formula) with Road Factor
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const straightDistance = R * c; 

  // Apply Tortuosity Factor (Approx 1.4 for urban road networks)
  // This converts "Air Distance" to estimated "Road Distance"
  const roadDistance = straightDistance * 1.4;
  
  return parseFloat(roadDistance.toFixed(1));
};

// Utility: Estimate Travel Time (assuming 30km/h inside city for motorbike/car mix)
export const estimateTime = (distanceKm: number): number => {
    const averageSpeedKmH = 30;
    const timeHours = distanceKm / averageSpeedKmH;
    return Math.round(timeHours * 60); // return in minutes
};

// Utility: Format Duration (Minutes to Hours/Minutes)
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} mnt`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} jam`;
    return `${hours} jam ${mins} mnt`;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

export const FACILITIES = ['Wi-Fi', 'AC', 'Smoking Area', 'Live Music', 'Socket', 'Prayer Room', 'Parking'];