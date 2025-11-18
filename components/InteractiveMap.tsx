import React, { useEffect, useRef } from 'react';
import { Cafe } from '../types';
import { optimizeCloudinaryImage } from '../utils/imageOptimizer';
import { DEFAULT_COVER_URL } from '../constants';
import { calculateDistance } from '../utils/geolocation';

declare const L: any;

interface InteractiveMapProps {
  cafe?: Cafe;
  cafes?: Cafe[];
  theme?: 'light' | 'dark';
  showUserLocation?: boolean;
  showHeatmap?: boolean;
  showDistanceControl?: boolean;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ cafe, cafes, theme = 'light', showUserLocation = false, showHeatmap = false, showDistanceControl = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const locateControlRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const userLatLngRef = useRef<any>(null);

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-2.976, 104.745], 13);
      L.control.zoom({ position: 'topright' }).addTo(map);
      mapRef.current = map;
    }
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) tileLayerRef.current.remove();
    
    const isDark = theme === 'dark';
    const tileUrl = isDark ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = isDark ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>' : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    
    const newTileLayer = L.tileLayer(tileUrl, { attribution });
    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const cafesToDisplay = cafe ? [cafe] : cafes || [];
    if (cafesToDisplay.length === 0 && !showUserLocation) {
        map.setView([-2.976, 104.745], 13);
        return;
    }

    const bounds = L.latLngBounds();
    cafesToDisplay.forEach(c => {
      if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
        const isSingleView = !!cafe;
        const icon = isSingleView 
          ? new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }) 
          : new L.Icon.Default();

        const marker = L.marker([c.coords.lat, c.coords.lng], { icon }).addTo(map);
        
        if (!isSingleView) {
            const coverUrl = c.coverUrl || DEFAULT_COVER_URL;
            const popupContent = `<div class="font-sans" style="width: 200px;"><img src="${optimizeCloudinaryImage(coverUrl, 200, 100)}" alt="${c.name}" class="w-full h-24 object-cover rounded-lg mb-2" /><h3 class="font-bold font-jakarta text-base text-gray-800">${c.name}</h3><p class="text-gray-600 text-sm mb-2">${c.district}</p><a href="/#/cafe/${c.slug}" class="text-brand font-semibold text-sm hover:underline">Lihat Detail &rarr;</a></div>`;
            marker.bindPopup(popupContent, { className: 'glass-popup' });
        }
        
        markersRef.current.push(marker);
        bounds.extend([c.coords.lat, c.coords.lng]);
      }
    });

    if (bounds.isValid() && !showDistanceControl) {
        const padding = cafe ? [70, 70] : [50, 50];
        const maxZoom = cafe ? 16 : 15;
        map.fitBounds(bounds, { padding, maxZoom, duration: 0.5 });
    }
  }, [cafe, cafes, showDistanceControl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof L.heatLayer === 'undefined') return;

    if (showHeatmap && cafes) {
        markersRef.current.forEach(m => m.setOpacity(0));
        if (!heatLayerRef.current) {
            const points = cafes
                .map(c => c.coords ? [c.coords.lat, c.coords.lng, 0.6] : null) // lat, lng, intensity
                .filter((p): p is [number, number, number] => p !== null);
            heatLayerRef.current = L.heatLayer(points, { 
                radius: 25, 
                blur: 15, 
                maxZoom: 14,
                gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
            }).addTo(map);
        }
    } else {
        markersRef.current.forEach(m => m.setOpacity(1));
        if (heatLayerRef.current) {
            map.removeLayer(heatLayerRef.current);
            heatLayerRef.current = null;
        }
    }
  }, [showHeatmap, cafes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || (!showUserLocation && !showDistanceControl)) return;

    const userLocationIcon = L.divIcon({ html: `<div class="user-location-marker"><div class="pulse"></div><div class="dot"></div></div>`, className: '', iconSize: [24, 24], iconAnchor: [12, 12] });
    
    if (showUserLocation) {
        let isFirstLocationUpdate = true;
        
        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
                userLatLngRef.current = userLatLng;
                if (userMarkerRef.current) {
                    userMarkerRef.current.setLatLng(userLatLng);
                } else {
                    userMarkerRef.current = L.marker(userLatLng, { icon: userLocationIcon, zIndexOffset: 1000 }).addTo(map).bindPopup("<b>Posisi Kamu</b>");
                }
                if (isFirstLocationUpdate && (cafes || []).length === 0) {
                    map.setView(userLatLng, 15, { animate: true, duration: 0.5 });
                }
                isFirstLocationUpdate = false;
            },
            (error) => console.warn("Geolocation watch error:", error.message),
            { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );

        if (locateControlRef.current) map.removeControl(locateControlRef.current);
        const FindMeControl = L.Control.extend({
            onAdd: function(map: any) {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M21.75 12h-2.25m-1.666 5.834L16.5 16.5M4.5 12H2.25m1.666-5.834L5.25 7.5M12 21.75V19.5" /></svg>`;
                btn.title = 'Temukan Lokasi Saya';
                L.DomEvent.on(btn, 'click', (e: any) => {
                    L.DomEvent.stop(e);
                    if (userLatLngRef.current) map.flyTo(userLatLngRef.current, 16);
                    else alert('Lokasi belum ditemukan. Tunggu sebentar atau pastikan izin lokasi aktif.');
                });
                return btn;
            }
        });
        locateControlRef.current = new FindMeControl({ position: 'topright' });
        map.addControl(locateControlRef.current);
    }
    
    if (showDistanceControl && cafe) {
        if (locateControlRef.current) map.removeControl(locateControlRef.current);
        const DistanceControl = L.Control.extend({
            onAdd: function(map: any) {
                const btn = L.DomUtil.create('button', 'leaflet-bar leaflet-control leaflet-control-custom');
                const defaultIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style="width: 20px; height: 20px;"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clip-rule="evenodd" /></svg>`;
                btn.innerHTML = defaultIcon;
                btn.title = 'Hitung Jarak Dari Lokasi Saya';
                
                L.DomEvent.on(btn, 'click', (e: any) => {
                    L.DomEvent.stop(e);
                    btn.innerHTML = `<div style="width:18px;height:18px;box-sizing:border-box" class="animate-spin rounded-full border-2 border-dashed border-gray-500"></div>`;
                    (btn as HTMLButtonElement).disabled = true;

                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                          const userLatLng = L.latLng(position.coords.latitude, position.coords.longitude);
                          const cafeLatLng = L.latLng(cafe.coords.lat, cafe.coords.lng);
                          
                          if (!userMarkerRef.current) {
                            userMarkerRef.current = L.marker(userLatLng, { icon: userLocationIcon, zIndexOffset: 1000 }).addTo(map);
                          } else {
                            userMarkerRef.current.setLatLng(userLatLng);
                          }
                          
                          if (routeLineRef.current) map.removeLayer(routeLineRef.current);
                          routeLineRef.current = L.polyline([userLatLng, cafeLatLng], { color: '#7C4DFF', weight: 4, dashArray: '5, 10' }).addTo(map);

                          const distance = calculateDistance(userLatLng.lat, userLatLng.lng, cafeLatLng.lat, cafeLatLng.lng);
                          userMarkerRef.current.bindPopup(`<b>Posisi Kamu</b><br>Jarak: ${distance.toFixed(2)} km`).openPopup();

                          map.fitBounds(L.latLngBounds(userLatLng, cafeLatLng), { padding: [50, 50] });

                          btn.innerHTML = defaultIcon;
                          (btn as HTMLButtonElement).disabled = false;
                      },
                      (error) => {
                          alert(`Gagal mendapatkan lokasi: ${error.message}`);
                          btn.innerHTML = defaultIcon;
                          (btn as HTMLButtonElement).disabled = false;
                      }
                    );
                });
                return btn;
            }
        });
        locateControlRef.current = new DistanceControl({ position: 'topright' });
        map.addControl(locateControlRef.current);
    }

    return () => {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null; }
        if (locateControlRef.current) { map?.removeControl(locateControlRef.current); locateControlRef.current = null; }
        if (routeLineRef.current) { map?.removeLayer(routeLineRef.current); routeLineRef.current = null; }
    };
  }, [showUserLocation, showDistanceControl, cafe, cafes]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;