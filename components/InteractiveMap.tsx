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
  
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

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

          const marker = L.marker([c.coords.lat, c.coords.lng])
            .addTo(map)
            .bindPopup(popupContent);
          
          markersRef.current.push(marker);
          bounds.extend([c.coords.lat, c.coords.lng]);
        }
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
    } 
    else if (cafe && cafe.coords) {
      const { lat, lng } = cafe.coords;
      const marker = L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${cafe.name}</b>`)
        .openPopup();
      
      markersRef.current.push(marker);
      map.setView([lat, lng], 16);
    }
  }, [cafe, cafes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showUserLocation) {
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }
        return;
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
        }

        const redMarkerSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" class="w-8 h-8 drop-shadow-lg">
            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s9.75 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clip-rule="evenodd" />
            <circle cx="12" cy="12" r="11" stroke="white" stroke-width="1.5" fill="transparent" />
          </svg>
        `;
        
        const userLocationIcon = L.divIcon({
          html: redMarkerSvg,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });
        
        const userMarker = L.marker([latitude, longitude], { icon: userLocationIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup("<b>Posisi Kamu</b>");

        userMarkerRef.current = userMarker;
      },
      (error) => {
        console.warn("Gagal mendapatkan lokasi pengguna:", error.message);
      },
      { enableHighAccuracy: true }
    );
  }, [showUserLocation]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;