import React, { useEffect, useRef } from 'react';
import { Cafe } from '../types';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';
import { DEFAULT_COVER_URL } from '../constants';

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
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-2.976, 104.745], 13);
      L.control.zoom({ position: 'topright' }).addTo(map);
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
  
  // Update markers and view
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Define a custom red icon for the detail page
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // --- 1. Cleanup previous markers ---
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
    }

    // --- 2. Helper to add user marker ---
    const addUserLocationMarker = (lat: number, lng: number) => {
        const userLocationIcon = L.divIcon({
            html: `<div class="user-location-marker"><div class="pulse"></div><div class="dot"></div></div>`,
            className: '', // important to be empty
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12]
        });
        userMarkerRef.current = L.marker([lat, lng], { icon: userLocationIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup("<b>Posisi Kamu</b>");
    };
    
    // --- 3. Add cafe markers and calculate bounds ---
    const bounds = L.latLngBounds();

    // Logic for Detail Page (single cafe)
    if (cafe && !cafes) {
        if (cafe.coords && typeof cafe.coords.lat === 'number' && typeof cafe.coords.lng === 'number') {
            const popupContent = `<div class="font-sans text-base"><b>${cafe.name}</b> berada di sini</div>`;
            const marker = L.marker([cafe.coords.lat, cafe.coords.lng], { icon: redIcon })
                .addTo(map)
                .bindPopup(popupContent);
            
            markersRef.current.push(marker);
            bounds.extend([cafe.coords.lat, cafe.coords.lng]);
            marker.openPopup();
        }
    } 
    // Logic for Explore Page (multiple cafes)
    else if (cafes) {
        cafes.forEach(c => {
            if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
                const coverUrl = c.coverUrl || DEFAULT_COVER_URL;
                const popupContent = `
                    <div class="font-sans" style="width: 200px;">
                        <img src="${optimizeCloudinaryImage(coverUrl, 200, 100)}" alt="${c.name}" class="w-full h-24 object-cover rounded-lg mb-2" />
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
    }

    // --- 4. Function to finalize map view ---
    const finalizeMapView = (userLatLng: [number, number] | null = null) => {
        if (userLatLng) {
            bounds.extend(userLatLng);
        }
        if (bounds.isValid()) {
            const padding = (cafe && userLatLng) ? [70, 70] : [50, 50];
            const maxZoom = (cafe) ? 16 : 15;
            map.fitBounds(bounds, { padding, maxZoom, duration: 0.5 });
        } else if (cafe && cafe.coords) {
             map.setView([cafe.coords.lat, cafe.coords.lng], 16); // Fallback for single cafe
        }
    };
    
    // --- 5. Get user location if requested ---
    if (showUserLocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLatLng: [number, number] = [position.coords.latitude, position.coords.longitude];
                addUserLocationMarker(userLatLng[0], userLatLng[1]);
                finalizeMapView(userLatLng);
            },
            (error) => {
                console.warn("Could not get user location:", error.message);
                finalizeMapView(); // Finalize view without user location
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    } else {
        finalizeMapView(); // Finalize view immediately
    }

  }, [cafe, cafes, showUserLocation]); // Dependency array ensures this runs when data changes

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;
