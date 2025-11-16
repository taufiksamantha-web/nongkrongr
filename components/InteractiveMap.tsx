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
  const watchIdRef = useRef<number | null>(null);

  // Effect 1: Initialize and destroy map instance
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-2.976, 104.745], 13);
      L.control.zoom({ position: 'topright' }).addTo(map);
      mapRef.current = map;
    }
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Effect 2: Update tile layer for theme
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

  // Effect 3: Update cafe markers (for single or multiple cafes)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    // Clear previous cafe markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();
    const cafesToDisplay = cafe ? [cafe] : cafes || [];

    if (cafesToDisplay.length === 0) {
        map.setView([-2.976, 104.745], 13); // Reset view if no cafes
        return;
    }

    cafesToDisplay.forEach(c => {
      if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
        const isSingleView = !!cafe;
        const icon = isSingleView 
          ? new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
            }) 
          : new L.Icon.Default();

        const coverUrl = c.coverUrl || DEFAULT_COVER_URL;
        const popupContent = `
            <div class="font-sans" style="width: 200px;">
                <img src="${optimizeCloudinaryImage(coverUrl, 200, 100)}" alt="${c.name}" class="w-full h-24 object-cover rounded-lg mb-2" />
                <h3 class="font-bold font-jakarta text-base text-gray-800">${c.name}</h3>
                ${!isSingleView ? `<p class="text-gray-600 text-sm mb-2">${c.district}</p><a href="/#/cafe/${c.slug}" class="text-brand font-semibold text-sm hover:underline">Lihat Detail &rarr;</a>` : ''}
            </div>`;
        
        const marker = L.marker([c.coords.lat, c.coords.lng], { icon }).addTo(map).bindPopup(popupContent);
        if (isSingleView) marker.openPopup();
        
        markersRef.current.push(marker);
        bounds.extend([c.coords.lat, c.coords.lng]);
      }
    });

    if (bounds.isValid() && !showUserLocation) {
        const padding = cafe ? [70, 70] : [50, 50];
        const maxZoom = cafe ? 16 : 15;
        map.fitBounds(bounds, { padding, maxZoom, duration: 0.5 });
    }

  }, [cafe, cafes]);

  // Effect 4: Manage real-time user location
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (showUserLocation) {
      const userLocationIcon = L.divIcon({
          html: `<div class="user-location-marker"><div class="pulse"></div><div class="dot"></div></div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
      });

      let isFirstLocationUpdate = true;

      watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
              const { latitude, longitude } = position.coords;
              const userLatLng = L.latLng(latitude, longitude);

              if (userMarkerRef.current) {
                  userMarkerRef.current.setLatLng(userLatLng);
              } else {
                  userMarkerRef.current = L.marker(userLatLng, { icon: userLocationIcon, zIndexOffset: 1000 })
                      .addTo(map)
                      .bindPopup("<b>Posisi Kamu</b>");
              }

              if (isFirstLocationUpdate) {
                  const cafeBounds = L.latLngBounds();
                  const cafesToConsider = cafe ? [cafe] : cafes || [];
                  cafesToConsider.forEach(c => {
                      if (c.coords) cafeBounds.extend([c.coords.lat, c.coords.lng]);
                  });

                  const finalBounds = cafeBounds.extend(userLatLng);
                  if (finalBounds.isValid()) {
                      map.fitBounds(finalBounds, { padding: [50, 50], maxZoom: 16, duration: 0.5 });
                  } else {
                      map.setView(userLatLng, 15);
                  }
                  isFirstLocationUpdate = false;
              }
          },
          (error) => {
              console.warn("Geolocation watch error:", error.message);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    return () => { // Cleanup for this effect
      if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
      }
      if (userMarkerRef.current) {
          userMarkerRef.current.remove();
          userMarkerRef.current = null;
      }
    };
  }, [showUserLocation, cafe, cafes]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;
