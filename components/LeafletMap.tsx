
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
    }, 50); // Mempercepat pengecekan library
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
      preferCanvas: true,
      minZoom: 4,
      maxBounds: [[-12, 94], [8, 142]],
      tap: false, 
      dragging: interactive,
      touchZoom: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: false,
      inertia: false, 
      bounceAtZoomLimits: false,
      markerZoomAnimation: true,
      updateWhenIdle: true,
      updateWhenZooming: false
    }).setView(center, zoom);

    mapRef.current = map;

    const tileUrl = isDarkMode 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; CARTO',
      maxZoom: 19,
      updateWhenIdle: true
    }).addTo(map);
    
    if (L.markerClusterGroup) {
        clusterGroupRef.current = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 40,
            spiderfyOnMaxZoom: true,
            chunkedLoading: true,
            iconCreateFunction: (cluster: any) => {
                const count = cluster.getChildCount();
                return L.divIcon({
                    html: `
                        <div class="w-full h-full flex items-center justify-center text-white font-black text-[10px] bg-blue-600 rounded-full border-2 border-white shadow-xl ring-4 ring-blue-500/20 active:scale-95 transition-transform">
                            <span>${count}</span>
                        </div>
                    `,
                    className: 'custom-cluster-compact', 
                    iconSize: [30, 30] 
                });
            }
        });
        clusterGroupRef.current.addTo(map);
    }

    const handleBoundsUpdate = () => {
        if (!isVisible || !onMoveEnd) return;
        const bounds = map.getBounds();
        onMoveEnd({
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast()
        });
    };

    map.on('moveend', handleBoundsUpdate);
    map.on('click', () => onMapClick?.());

    // Trigger pemuatan data pertama kali segera setelah init
    handleBoundsUpdate();

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
  }, [isLReady, isDarkMode, interactive]); 

  const createIconHTML = (mainColor: string, isBouncing: boolean = false) => `
    <div class="relative w-10 h-12 flex flex-col items-center ${isBouncing ? 'marker-bounce-slow' : 'marker-fade-entry'}">
        <div class="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center shadow-[0_8px_15px_-3px_rgba(0,0,0,0.3)]" 
             style="background: radial-gradient(circle at 30% 30%, ${mainColor}, #00000044), ${mainColor};">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 8h1a4 4 0 1 1 0 8h-1"></path>
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path>
                <line x1="6" y1="2" x2="6" y2="4"></line>
                <line x1="10" y1="2" x2="10" y2="4"></line>
                <line x1="14" y1="2" x2="14" y2="4"></line>
            </svg>
        </div>
        <div class="w-2.5 h-2.5 bg-white rotate-45 -mt-1.5 shadow-sm border-r-2 border-b-2 border-white/10" 
             style="background: ${mainColor};"></div>
    </div>
  `;

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current || !clusterGroupRef.current) return;
    
    clusterGroupRef.current.clearLayers();
    
    if (selectedCafe) return;

    const markers = cafes
        .filter(c => isValidLocation(c.coordinates))
        .map((cafe) => {
            const status = getCafeStatus(cafe.openingHours);
            const mainColor = status.isOpen ? '#22c55e' : '#ef4444'; 
            
            const customIcon = L.divIcon({
                className: 'marker-custom-wrapper', 
                html: createIconHTML(mainColor),
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
  }, [cafes, isLReady, selectedCafe]);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;
    const map = mapRef.current;

    if (selectedMarkerRef.current) {
        map.removeLayer(selectedMarkerRef.current);
        selectedMarkerRef.current = null;
    }

    if (selectedCafe && isValidLocation(selectedCafe.coordinates)) {
        const status = getCafeStatus(selectedCafe.openingHours);
        const mainColor = status.isOpen ? '#22c55e' : '#ef4444';

        const highlightIcon = L.divIcon({
            className: 'selected-marker-wrapper', 
            html: createIconHTML(mainColor, true),
            iconSize: [40, 48],
            iconAnchor: [20, 48] 
        });

        selectedMarkerRef.current = L.marker([selectedCafe.coordinates.lat, selectedCafe.coordinates.lng], { 
            icon: highlightIcon, 
            zIndexOffset: 5000 
        }).addTo(map);
        
        if (!routeData) {
            map.flyTo([selectedCafe.coordinates.lat, selectedCafe.coordinates.lng], 17, { animate: true, duration: 1 });
        }
    }
  }, [selectedCafe, isLReady]);

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
            color: '#3b82f6', 
            weight: 6, 
            opacity: 0.8, 
            lineJoin: 'round', 
            className: 'route-line-dynamic'
        }).addTo(map);

        map.fitBounds(L.latLngBounds(routeData), { 
            padding: [60, 60], 
            animate: true,
            maxZoom: 17
        });
    }
  }, [routeData, isLReady]);

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

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
        <style>{`
            .leaflet-container { 
                background: transparent !important; 
                outline: none; 
                touch-action: none !important; 
                -webkit-user-select: none;
                user-select: none;
            }
            
            @keyframes routeDash { 
                to { stroke-dashoffset: -24; } 
            }
            .route-line-dynamic { 
                stroke-dasharray: 12, 12; 
                animation: routeDash 1s linear infinite; 
                filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.6));
            }

            @keyframes markerFadeInOnly {
                from { opacity: 0; transform: scale(0.5); }
                to { opacity: 1; transform: scale(1); }
            }
            .marker-fade-entry {
                animation: markerFadeInOnly 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
                will-change: opacity, transform;
            }

            @keyframes bounceSlow {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-8px); }
            }
            .marker-bounce-slow {
                animation: bounceSlow 1.5s ease-in-out infinite;
                will-change: transform;
            }
            
            .marker-custom-wrapper, .selected-marker-wrapper, .user-location-marker, .custom-cluster-compact {
                background: transparent !important;
                border: none !important;
                overflow: visible !important;
            }

            .custom-cluster-compact div {
                background: #2563eb !important; 
                border: 2px solid white !important;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: 900;
            }
        `}</style>
        
        {(!isLReady || !mapRef.current) && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 transition-colors pointer-events-none">
                <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest">Memetakan Dunia...</p>
            </div>
        )}

        <div ref={containerRef} className="w-full h-full" style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
});
LeafletMap.displayName = "LeafletMap";
