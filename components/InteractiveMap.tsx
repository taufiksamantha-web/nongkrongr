import React, { useEffect, useRef } from 'react';
import { Cafe } from '../types';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';

declare const L: any;

interface InteractiveMapProps {
  cafe?: Cafe;
  cafes?: Cafe[];
  theme?: 'light' | 'dark';
  showUserLocation?: boolean;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ cafe, cafes, theme = 'light', showUserLocation = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  // Initialize map instance
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current).setView([-2.976, 104.745], 13);
      mapRef.current = map;
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update tile layer based on theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    const isDark = theme === 'dark';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    const newTileLayer = L.tileLayer(tileUrl, { attribution });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [theme]);
  
  // Update markers for cafes and user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // --- 1. Cleanup previous layers ---
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
    }

    // --- 2. Helper to add user marker ---
    const addUserLocationMarker = (lat: number, lng: number) => {
      const userMarkerSvg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.4"/>
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <circle cx="16" cy="16" r="12" fill="#ef4444" stroke="white" stroke-width="3"/>
          </g>
        </svg>
      `;
      const userLocationIcon = L.divIcon({
        html: userMarkerSvg,
        className: '', // important to be empty
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
      userMarkerRef.current = L.marker([lat, lng], { icon: userLocationIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup("<b>Posisi Kamu</b>");
    };

    // --- 3. Logic for Explore Page (multiple cafes) ---
    if (cafes && cafes.length > 0) {
      const bounds = L.latLngBounds();
      cafes.forEach(c => {
        if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
          const popupContent = `
            <div class="font-sans" style="width: 200px;">
              <img src="${optimizeCloudinaryImage(c.coverUrl, 200, 100)}" alt="${c.name}" class="w-full h-24 object-cover rounded-lg mb-2" />
              <h3 class="font-bold font-jakarta text-base text-gray-800">${c.name}</h3>
              <p class="text-gray-600 text-sm mb-2">${c.district}</p>
              <a href="/#/cafe/${c.slug}" class="text-brand font-semibold text-sm hover:underline">Lihat Detail &rarr;</a>
            </div>
          `;
          const marker = L.marker([c.coords.lat, c.coords.lng]).addTo(map).bindPopup(popupContent);
          markersRef.current.push(marker);
          bounds.extend([c.coords.lat, c.coords.lng]);
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
      if (showUserLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => addUserLocationMarker(pos.coords.latitude, pos.coords.longitude),
          (err) => console.warn("Gagal mendapatkan lokasi:", err.message),
          { enableHighAccuracy: true }
        );
      }
    } 
    // --- 4. Logic for Detail Page (single cafe) ---
    else if (cafe && cafe.coords) {
      const cafeLatLng: [number, number] = [cafe.coords.lat, cafe.coords.lng];
      const marker = L.marker(cafeLatLng).addTo(map).bindPopup(`<b>${cafe.name}</b>`).openPopup();
      markersRef.current.push(marker);

      if (showUserLocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const userLatLng: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            addUserLocationMarker(userLatLng[0], userLatLng[1]);
            const bounds = L.latLngBounds([cafeLatLng, userLatLng]);
            map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
          },
          (err) => {
            console.warn("Gagal mendapatkan lokasi, hanya menampilkan kafe:", err.message);
            map.setView(cafeLatLng, 16); // Fallback
          },
          { enableHighAccuracy: true }
        );
      } else {
        map.setView(cafeLatLng, 16);
      }
    }
  }, [cafe, cafes, showUserLocation]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;