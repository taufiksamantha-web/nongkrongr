
import React, { useEffect, useRef, useState } from 'react';
import { Cafe } from '../types';
import { getCafeStatus } from '../constants'; 
import { Loader2 } from 'lucide-react';

interface LeafletMapProps {
  cafes: Cafe[];
  onCafeSelect: (cafe: Cafe) => void;
  selectedCafe: Cafe | null;
  userLocation: { lat: number; lng: number } | null; 
  activeLocation?: { lat: number; lng: number } | null; 
  triggerLocate?: number;
  isVisible?: boolean; 
  onMapClick?: () => void;
  containerId?: string;
  interactive?: boolean;
  onMoveEnd?: (bounds: { minLat: number, maxLat: number, minLng: number, maxLng: number }) => void;
  isDarkMode?: boolean; 
  routeData?: [number, number][];
}

const isValidLocation = (loc: any) => {
    return loc && 
           typeof loc.lat === 'number' && !isNaN(loc.lat) && isFinite(loc.lat) &&
           typeof loc.lng === 'number' && !isNaN(loc.lng) && isFinite(loc.lng);
};

export const LeafletMap = React.memo<LeafletMapProps>(({ 
  cafes, onCafeSelect, selectedCafe, userLocation, activeLocation, triggerLocate, 
  isVisible = true, onMapClick, containerId = 'leaflet-map-main',
  interactive = true, onMoveEnd, isDarkMode = false, routeData
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const clusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const selectedMarkerRef = useRef<any>(null); 
  const polylineRef = useRef<any>(null);
  
  const [isLReady, setIsLReady] = useState(!!(window as any).L);

  useEffect(() => {
    if (isLReady) return;
    const interval = setInterval(() => {
      if ((window as any).L) {
        setIsLReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [isLReady]);

  useEffect(() => {
    if (!isLReady || !containerRef.current) return;
    const L = (window as any).L;

    if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
    }

    const defaultCenter: [number, number] = [ -2.5489, 118.0149 ]; 
    const centerLoc = activeLocation || userLocation;
    const center = isValidLocation(centerLoc) ? [centerLoc!.lat, centerLoc!.lng] as [number, number] : defaultCenter;
    const zoom = isValidLocation(centerLoc) ? 15 : 5;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      preferCanvas: false, 
      minZoom: 4,
      maxBounds: [[-12, 94], [8, 142]]
    }).setView(center, zoom);

    mapRef.current = map;

    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; CARTO',
      maxZoom: 19
    }).addTo(map);
    
    if (L.markerClusterGroup) {
        clusterGroupRef.current = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 50, 
            spiderfyOnMaxZoom: true,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `
                        <div class="w-full h-full flex items-center justify-center text-white font-black text-xs bg-orange-500 rounded-full border-2 border-white shadow-[0_8px_16px_rgba(249,115,22,0.4)] ring-2 ring-orange-500/20 transform-gpu active:scale-95 transition-transform">
                            <span>${count}</span>
                        </div>
                    `,
                    className: 'custom-cluster-3d', 
                    iconSize: [40, 40]
                });
            }
        });
        clusterGroupRef.current.addTo(map);
    }

    map.on('moveend', () => {
        if (!isVisible || !onMoveEnd) return;
        const bounds = map.getBounds();
        onMoveEnd({
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast()
        });
    });

    map.on('click', () => onMapClick?.());

    const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
    };
  }, [isLReady, isDarkMode]); 

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !clusterGroupRef.current) return;
    
    clusterGroupRef.current.clearLayers();
    
    // LOGIC PERBAIKAN: Jika ada kafe yang dipilih, sembunyikan semua marker lain di cluster
    // Ini menghilangkan "Ghost Marker" karena marker high-contrast sudah di-handle di useEffect terpisah.
    if (selectedCafe) return;

    const markers = cafes
        .filter(c => isValidLocation(c.coordinates))
        .map((cafe) => {
            const status = getCafeStatus(cafe.openingHours);
            const mainColor = status.isOpen ? '#22c55e' : '#ef4444'; 
            
            const customIcon = L.divIcon({
                className: 'marker-3d-wrapper', 
                html: `
                    <div class="marker-3d-entry relative w-10 h-12 flex flex-col items-center group">
                        <div class="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center shadow-[0_8px_15px_-3px_rgba(0,0,0,0.3)] transition-all duration-300" 
                             style="background: radial-gradient(circle at 30% 30%, ${mainColor}, #00000044), ${mainColor};">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
                                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
                                <line x1="6" y1="2" x2="6" y2="4"></line>
                                <line x1="10" y1="2" x2="10" y2="4"></line>
                                <line x1="14" y1="2" x2="14" y2="4"></line>
                            </svg>
                        </div>
                        <div class="w-3 h-3 bg-white rotate-45 -mt-1.5 shadow-sm border-r-2 border-b-2 border-white/10" 
                             style="background: ${mainColor};"></div>
                    </div>
                `,
                iconSize: [40, 48],
                iconAnchor: [20, 48] 
            });

            const marker = L.marker([cafe.coordinates.lat, cafe.coordinates.lng], { icon: customIcon });
            marker.on('click', (e: any) => { 
                L.DomEvent.stopPropagation(e); 
                onCafeSelect(cafe); 
            });
            return marker;
        });
    clusterGroupRef.current.addLayers(markers);
  }, [cafes, isLReady, selectedCafe]); // PERBAIKAN: Masukkan selectedCafe sebagai dependency

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !isValidLocation(userLocation)) return;
    const map = mapRef.current;

    if (!userMarkerRef.current) {
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
                <div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute inset-0 bg-blue-500/30 rounded-full animate-ping"></div>
                    <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-xl"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
        userMarkerRef.current = L.marker([userLocation!.lat, userLocation!.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
        userMarkerRef.current.setLatLng([userLocation!.lat, userLocation!.lng]);
    }
  }, [userLocation, isLReady]);

  useEffect(() => {
      if (isVisible && mapRef.current && isValidLocation(activeLocation) && !selectedCafe) {
          mapRef.current.panTo([activeLocation!.lat, activeLocation!.lng]);
      }
  }, [isVisible, activeLocation, selectedCafe]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
    }

    if (selectedCafe && isValidLocation(selectedCafe.coordinates)) {
        const highlightIcon = L.divIcon({
            className: 'selected-marker-container', 
            html: `
                <div class="relative w-16 h-20 flex flex-col items-center custom-pin-bounce">
                    <div class="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(249,115,22,0.5)]" 
                         style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);">
                         <svg viewBox="0 0 24 24" width="32" height="32" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
                            <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
                            <line x1="6" y1="2" x2="6" y2="4"></line>
                            <line x1="10" y1="2" x2="10" y2="4"></line>
                            <line x1="14" y1="2" x2="14" y2="4"></line>
                        </svg>
                    </div>
                    <div class="w-5 h-5 bg-orange-600 rotate-45 -mt-2.5 z-0 border-r-4 border-b-4 border-white/20"></div>
                </div>
            `,
            iconSize: [64, 80],
            iconAnchor: [32, 80] 
        });

        selectedMarkerRef.current = L.marker([selectedCafe.coordinates.lat, selectedCafe.coordinates.lng], { 
            icon: highlightIcon, 
            zIndexOffset: 5000 
        }).addTo(map);
        
        if (!routeData) map.flyTo([selectedCafe.coordinates.lat, selectedCafe.coordinates.lng], 17, { animate: true });
    }
  }, [selectedCafe, routeData, isLReady]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
    }

    if (routeData && routeData.length > 0) {
        polylineRef.current = L.polyline(routeData, {
            color: '#F97316', 
            weight: 6, 
            opacity: 0.8, 
            lineJoin: 'round', 
            dashArray: '1, 10', 
            className: 'route-line-anim'
        }).addTo(map);
        map.fitBounds(L.latLngBounds(routeData), { padding: [60, 60], animate: true });
    }
  }, [routeData, isLReady]);

  return (
    <div className="relative w-full h-full bg-slate-100">
        <style>{`
            @keyframes routeDash { to { stroke-dashoffset: 0; } }
            .route-line-anim { stroke-dasharray: 12; animation: routeDash 30s linear infinite; filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.5)); }
            .leaflet-container { font-family: 'Poppins', sans-serif; background: transparent !important; }
            
            @keyframes markerPop {
                0% { transform: scale(0.1); opacity: 0; }
                80% { transform: scale(1.1); opacity: 1; }
                100% { transform: scale(1); opacity: 1; }
            }
            .marker-3d-entry {
                animation: markerPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                will-change: transform, opacity;
            }

            @keyframes pinBounce {
                0%, 100% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-15px) scale(1.03); }
            }
            .custom-pin-bounce {
                animation: pinBounce 1.5s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
                transform-origin: bottom center;
                will-change: transform;
            }
            
            .marker-3d-wrapper, .selected-marker-container, .user-location-marker {
                background: transparent !important;
                border: none !important;
                overflow: visible !important;
            }

            .custom-cluster-3d div {
                background: #F97316 !important;
                border: 2px solid white !important;
                border-radius: 50%;
                box-shadow: 0 8px 16px rgba(249, 115, 22, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
            }
        `}</style>
        
        {(!isLReady || !mapRef.current) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 transition-colors">
                <Loader2 className="animate-spin text-orange-500" size={40} />
                <p className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Menyiapkan Peta...</p>
            </div>
        )}

        <div 
            ref={containerRef} 
            className="w-full h-full" 
            style={{ position: 'absolute', inset: 0 }} 
        />
    </div>
  );
});
LeafletMap.displayName = "LeafletMap";
