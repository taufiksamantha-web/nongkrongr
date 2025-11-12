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

  // Initialize map instance and custom controls
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-2.976, 104.745], 13);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapRef.current = map;

      // --- Helper to add/update user location marker ---
      const updateUserLocationMarker = (latlng: any) => {
          if (userMarkerRef.current) {
              userMarkerRef.current.remove();
          }
          const userMarkerSvg = `
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <defs><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="black" flood-opacity="0.4"/></filter></defs>
              <g filter="url(#shadow)"><circle cx="16" cy="16" r="10" fill="#3b82f6" stroke="white" stroke-width="3"/><circle cx="16" cy="16" r="14" fill="#3b82f6" fill-opacity="0.3"><animate attributeName="r" from="12" to="20" dur="1.5s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.165 0.84 0.44 1" keyTimes="0;1" values="10;20"/><animate attributeName="opacity" from="0.3" to="0" dur="1.5s" begin="0s" repeatCount="indefinite" calcMode="spline" keySplines="0.3 0.61 0.355 1" keyTimes="0;1" values="0.3;0"/></circle></g>
            </svg>`;
          const userLocationIcon = L.divIcon({
            html: userMarkerSvg,
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          userMarkerRef.current = L.marker(latlng, { icon: userLocationIcon, zIndexOffset: 1000 })
            .addTo(map)
            .bindPopup("<b>Posisi Kamu</b>");
      };
      
      // --- Custom Locate Control ---
      const LocateControl = L.Control.extend({
        options: { position: 'bottomright' },
        onAdd: function() {
          const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
          container.innerHTML = `
            <button id="locate-btn" title="Temukan lokasi saya" class="w-10 h-10 flex items-center justify-center">
              <svg id="locate-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-primary"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
              <svg id="locate-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-6 h-6 text-brand animate-spin" style="display: none;"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </button>`;
          L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation)
            .on(container, 'click', () => {
              const locateBtn = container.querySelector('#locate-btn') as HTMLButtonElement;
              const locateIcon = container.querySelector('#locate-icon') as SVGElement;
              const locateSpinner = container.querySelector('#locate-spinner') as SVGElement;
              locateIcon.style.display = 'none';
              locateSpinner.style.display = 'block';
              locateBtn.disabled = true;
              map.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true });
            });
          return container;
        }
      });
      new LocateControl().addTo(map);

      // --- Map Event Listeners ---
      map.on('locationfound', (e: any) => {
          updateUserLocationMarker(e.latlng);
          const control = document.getElementById('locate-btn')?.parentElement;
          if (control) {
            (control.querySelector('#locate-icon') as SVGElement).style.display = 'block';
            (control.querySelector('#locate-spinner') as SVGElement).style.display = 'none';
            (control.querySelector('#locate-btn') as HTMLButtonElement).disabled = false;
          }
      });

      map.on('locationerror', (e: any) => {
          alert(`Error: ${e.message}. Pastikan izin lokasi sudah diaktifkan.`);
          const control = document.getElementById('locate-btn')?.parentElement;
           if (control) {
            (control.querySelector('#locate-icon') as SVGElement).style.display = 'block';
            (control.querySelector('#locate-spinner') as SVGElement).style.display = 'none';
            (control.querySelector('#locate-btn') as HTMLButtonElement).disabled = false;
          }
      });
    }
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Update tile layer and control style based on theme
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) tileLayerRef.current.remove();

    const isDark = theme === 'dark';
    const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = isDark ? '&copy; OpenStreetMap &copy; CARTO' : '&copy; OpenStreetMap';
    const newTileLayer = L.tileLayer(tileUrl, { attribution });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
    
    // Update locate button background
    const locateControl = document.querySelector('.leaflet-control-custom');
    if (locateControl) {
      const bgColor = isDark ? 'hsl(var(--card))' : 'white';
      (locateControl as HTMLElement).style.backgroundColor = bgColor;
      (locateControl as HTMLElement).style.boxShadow = '0 1px 5px rgba(0,0,0,0.4)';
      (locateControl as HTMLElement).style.borderRadius = '8px';
    }
  }, [theme]);
  
  // Update markers for cafes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
    }

    if (cafes && cafes.length > 0) {
      const bounds = L.latLngBounds();
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
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      }
      if (showUserLocation) {
        map.locate();
      }
    } 
    else if (cafe && cafe.coords) {
      const cafeLatLng: [number, number] = [cafe.coords.lat, cafe.coords.lng];
      const marker = L.marker(cafeLatLng).addTo(map).bindPopup(`<b>${cafe.name}</b>`).openPopup();
      markersRef.current.push(marker);
      map.setView(cafeLatLng, 16);
    }
  }, [cafe, cafes, showUserLocation]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;
