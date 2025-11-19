
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

// Helper to decode OSRM polyline (Google Encoded Polyline Algorithm)
const decodePolyline = (str: string, precision: number = 5) => {
  let index = 0,
      lat = 0,
      lng = 0,
      coordinates = [],
      shift = 0,
      result = 0,
      byte = null,
      latitude_change,
      longitude_change,
      factor = Math.pow(10, precision || 5);

  // Coordinates have variable length when encoded, so just keep
  // track of whether we've hit the end of the string. In each
  // loop, a digit is check for a sign that we should continue.
  while (index < str.length) {
      byte = null;
      shift = 0;
      result = 0;

      do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
      } while (byte >= 0x20);

      latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      shift = result = 0;

      do {
          byte = str.charCodeAt(index++) - 63;
          result |= (byte & 0x1f) << shift;
          shift += 5;
      } while (byte >= 0x20);

      longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

      lat += latitude_change;
      lng += longitude_change;

      coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
};


const InteractiveMap: React.FC<InteractiveMapProps> = ({ cafe, cafes, theme = 'light', showUserLocation = false, showHeatmap = false, showDistanceControl = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null); // To store the route polyline
  const watchIdRef = useRef<number | null>(null);
  const userLatLngRef = useRef<{lat: number, lng: number} | null>(null);

  // Fetch Road Distance & Geometry from OSRM
  const fetchRoadData = async (start: {lat: number, lng: number}, end: {lat: number, lng: number}) => {
    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full`);
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        return {
            distance: (data.routes[0].distance / 1000).toFixed(1), // km
            geometry: data.routes[0].geometry // encoded polyline string
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch OSRM data", error);
      return null;
    }
  };

  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current && typeof L !== 'undefined') {
      const map = L.map(mapContainerRef.current, { zoomControl: false }).setView([-2.976, 104.745], 13);
      L.control.zoom({ position: 'topright' }).addTo(map);
      
      // Add popup open listener for dynamic distance calculation (fallback/list view)
      map.on('popupopen', async (e: any) => {
        const popupNode = e.popup._contentNode;
        const distanceEl = popupNode.querySelector('.distance-placeholder');
        
        if (distanceEl && userLatLngRef.current) {
            const cafeLat = parseFloat(distanceEl.dataset.lat);
            const cafeLng = parseFloat(distanceEl.dataset.lng);
            
            distanceEl.innerHTML = '<span class="animate-pulse">Menghitung jarak...</span>';
            
            const routeData = await fetchRoadData(userLatLngRef.current, { lat: cafeLat, lng: cafeLng });
            
            if (routeData) {
                distanceEl.innerHTML = `<strong>${routeData.distance} km</strong> (Rute Jalan)`;
            } else {
                // Fallback to straight line if API fails
                const straightDist = calculateDistance(userLatLngRef.current.lat, userLatLngRef.current.lng, cafeLat, cafeLng);
                distanceEl.innerHTML = `<strong>${straightDist.toFixed(1)} km</strong> (Garis Lurus)`;
            }
        } else if (distanceEl && !userLatLngRef.current) {
             distanceEl.innerHTML = '<span class="text-xs text-muted">Lokasi Anda tidak aktif</span>';
        }
      });

      // Custom Control for Detail View - Explicit Button
      if (showDistanceControl && cafe) {
         const DistanceControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: function() {
               const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
               container.style.border = 'none';
               container.style.backgroundColor = 'transparent';
               
               const btn = L.DomUtil.create('button', 'bg-white text-gray-800 font-bold py-2 px-4 rounded-xl shadow-lg flex items-center gap-2 hover:bg-gray-50 transition-all border border-gray-200', container);
               btn.style.cursor = 'pointer';
               btn.innerHTML = `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 20px; height: 20px; color: #7C4DFF;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.159.69.159 1.006 0Z" />
                  </svg>
                  <span id="distance-label" style="font-size: 0.85rem;">Hitung Jarak Rute</span>
               `;
               
               // Prevent map clicks propagating
               L.DomEvent.disableClickPropagation(container);
               L.DomEvent.disableScrollPropagation(container);

               btn.onclick = async (e: any) => {
                  e.preventDefault();
                  const label = document.getElementById('distance-label');
                  if(label) label.innerText = 'Mencari lokasi...';
                  
                  const updateDistance = async (lat: number, lng: number) => {
                      if(label) label.innerText = 'Menghitung rute...';
                      
                      // Remove existing route if any
                      if (routeLayerRef.current) {
                          map.removeLayer(routeLayerRef.current);
                          routeLayerRef.current = null;
                      }

                      const routeData = await fetchRoadData({lat, lng}, {lat: cafe.coords.lat, lng: cafe.coords.lng});
                      
                      if (routeData) {
                          if(label) label.innerText = `${routeData.distance} km (Via Jalan)`;
                          
                          // Draw Route Line
                          const coordinates = decodePolyline(routeData.geometry);
                          routeLayerRef.current = L.polyline(coordinates, {
                              color: '#7C4DFF', // Brand color
                              weight: 5,
                              opacity: 0.8,
                              className: 'animate-route' // Add animation class
                          }).addTo(map);
                          
                          // Zoom to fit the route
                          map.fitBounds(routeLayerRef.current.getBounds(), { padding: [50, 50] });

                      } else {
                           // Fallback
                           const straight = calculateDistance(lat, lng, cafe.coords.lat, cafe.coords.lng);
                           if(label) label.innerText = `${straight.toFixed(1)} km (Garis Lurus)`;
                      }
                  }

                  if (userLatLngRef.current) {
                      updateDistance(userLatLngRef.current.lat, userLatLngRef.current.lng);
                  } else {
                      navigator.geolocation.getCurrentPosition(
                          (pos) => {
                              const { latitude, longitude } = pos.coords;
                              userLatLngRef.current = { lat: latitude, lng: longitude };
                              if (userMarkerRef.current) {
                                  userMarkerRef.current.setLatLng([latitude, longitude]);
                              } else {
                                  const userIcon = L.divIcon({
                                      className: 'user-location-marker',
                                      html: '<div class="pulse"></div><div class="dot"></div>',
                                      iconSize: [24, 24],
                                      iconAnchor: [12, 12]
                                  });
                                  userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
                              }
                              updateDistance(latitude, longitude);
                          },
                          (err) => {
                              console.error(err);
                              if(label) label.innerText = 'Gagal akses lokasi';
                          },
                          { enableHighAccuracy: true, timeout: 10000 }
                      );
                  }
               };
               
               return container;
            }
         });
         map.addControl(new DistanceControl());
      }

      mapRef.current = map;
    }
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Handle User Location
    if (showUserLocation) {
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                userLatLngRef.current = { lat: latitude, lng: longitude };
                
                if (userMarkerRef.current) {
                    userMarkerRef.current.setLatLng([latitude, longitude]);
                } else {
                    const userIcon = L.divIcon({
                        className: 'user-location-marker',
                        html: '<div class="pulse"></div><div class="dot"></div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
                    userMarkerRef.current.bindPopup("Lokasi Anda", { closeButton: false });
                }

                // Auto-Fit Bounds for Detail Page (User + Cafe)
                if (cafe && cafe.coords) {
                     const bounds = L.latLngBounds([
                        [latitude, longitude],
                        [cafe.coords.lat, cafe.coords.lng]
                     ]);
                     // Pad the bounds so markers aren't on the very edge
                     map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                }
            },
            (err) => console.warn("Geolocation error", err),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );
    } else {
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }
        userLatLngRef.current = null;
    }
    
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const cafesToDisplay = cafe ? [cafe] : cafes || [];
    // Only reset view if we aren't showing user location (to prevent fighting with fitBounds above)
    if (cafesToDisplay.length === 0 && !userLatLngRef.current && !showUserLocation) {
        if (!map.getBounds().isValid()) map.setView([-2.976, 104.745], 13);
    }

    const bounds = L.latLngBounds();
    if (userLatLngRef.current) bounds.extend([userLatLngRef.current.lat, userLatLngRef.current.lng]);

    cafesToDisplay.forEach(c => {
      if (c.coords && typeof c.coords.lat === 'number' && typeof c.coords.lng === 'number') {
        const isSingleView = !!cafe;
        const icon = isSingleView 
          ? new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] }) 
          : new L.Icon.Default();

        const marker = L.marker([c.coords.lat, c.coords.lng], { icon }).addTo(map);
        
        if (!isSingleView) {
            const coverUrl = c.coverUrl || DEFAULT_COVER_URL;
            const popupContent = `
                <div class="font-sans" style="width: 220px;">
                    <img src="${optimizeCloudinaryImage(coverUrl, 220, 120)}" alt="${c.name}" class="w-full h-28 object-cover rounded-lg mb-2" />
                    <h3 class="font-bold font-jakarta text-base text-gray-800 leading-tight">${c.name}</h3>
                    <p class="text-gray-600 text-xs mb-1">${c.district}</p>
                    <div class="text-sm text-blue-600 mb-2 distance-placeholder" data-lat="${c.coords.lat}" data-lng="${c.coords.lng}">
                        Klik untuk lihat jarak
                    </div>
                    <a href="/#/cafe/${c.slug}" class="block text-center bg-brand text-white text-xs font-bold py-1.5 rounded hover:bg-brand/90 transition-colors no-underline">Lihat Detail</a>
                </div>
            `;
            marker.bindPopup(popupContent, { className: 'glass-popup', minWidth: 220 });
        } else if (showDistanceControl) {
            // In single view, bind a simple popup for name
            marker.bindPopup(`<b class="font-sans">${c.name}</b>`, { className: 'glass-popup' });
        }
        
        markersRef.current.push(marker);
        bounds.extend([c.coords.lat, c.coords.lng]);
      }
    });

    // If not in single view mode or if user location isn't ready yet, fit bounds to cafes
    if (bounds.isValid() && !showDistanceControl && !showUserLocation) {
        const padding = cafe ? [70, 70] : [50, 50];
        const maxZoom = cafe ? 16 : 14;
        map.fitBounds(bounds, { padding, maxZoom, duration: 0.5 });
    }
  }, [cafe, cafes, showDistanceControl, showUserLocation, theme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || typeof L.heatLayer === 'undefined') return;

    if (showHeatmap && cafes) {
        markersRef.current.forEach(m => m.setOpacity(0));
        if (!heatLayerRef.current) {
            const points = cafes
                .map(c => c.coords ? [c.coords.lat, c.coords.lng, 0.6] : null)
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
            heatLayerRef.current.remove();
            heatLayerRef.current = null;
        }
    }
  }, [showHeatmap, cafes]);

  return <div ref={mapContainerRef} className="w-full h-full" />;
};

export default InteractiveMap;
