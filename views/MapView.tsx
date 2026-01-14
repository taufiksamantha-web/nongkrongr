
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { MapPin, Navigation, Star, X, ArrowRight, Crosshair, Clock, Loader2, Route, Send, Car, Zap, AlertTriangle, Coffee, Circle, Info, ExternalLink } from 'lucide-react';
import { Cafe } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { GlassCard, Button, LazyImage } from '../components/UI';
import { calculateDistance, estimateTime, getOptimizedImageUrl, getCafeStatus, formatRating } from '../constants';
import { fetchCafesInBounds, debounce, reverseGeocode } from '../services/dataService';
import { SEO } from '../components/SEO';
import { useSession } from '../components/SessionContext';
import { SafeStorage } from '../lib/supabase';

interface MapViewProps {
  onCafeClick: (cafe: Cafe) => void;
  cafes: Cafe[]; 
  isVisible?: boolean; 
  resetTrigger?: number;
  focusedCafe?: Cafe | null;
  userLocation: { lat: number; lng: number } | null; 
  activeLocation: { lat: number; lng: number } | null; 
  onLocationUpdate: (data: { lat: number, lng: number, name: string, isGPS: boolean }) => void;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const isValidGPS = (loc: any) => {
    return loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
}

const SelectedCafeFloatingCard: React.FC<{ 
    cafe: Cafe; 
    userLocation: { lat: number; lng: number } | null;
    onClick: () => void; 
    onClose: () => void;
    realRouteData: { distance: string, duration: string } | null;
    isCalculating: boolean;
}> = ({ cafe, userLocation, onClick, onClose, realRouteData, isCalculating }) => {
    const status = getCafeStatus(cafe.openingHours);
    
    const handleOpenExternalMaps = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/dir/?api=1&destination=${cafe.coordinates.lat},${cafe.coordinates.lng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+95px)] left-3 right-3 md:bottom-10 md:left-10 md:right-auto md:w-[420px] z-[6000] animate-in slide-in-from-bottom-8 fade-in duration-500">
             <div className="bg-white dark:bg-[#1E293B] rounded-[2.2rem] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 dark:border-slate-800 overflow-hidden relative ring-1 ring-black/5">
                  <div className="p-5">
                      {/* Close Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 p-2 rounded-full transition-colors z-10 bg-gray-50 dark:bg-slate-800 shadow-sm"
                      >
                          <X size={20}/>
                      </button>

                      {/* Header Info Area */}
                      <div className="flex gap-4 items-start mb-5 pr-8 cursor-pointer group" onClick={onClick}>
                          <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden shadow-lg shrink-0 bg-gray-100 dark:bg-slate-800 border border-black/5">
                              <LazyImage src={getOptimizedImageUrl(cafe.image, 200)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={cafe.name} />
                          </div>
                          <div className="flex-1 min-w-0">
                              <h3 className="font-display font-black text-lg md:text-xl text-gray-900 dark:text-white truncate leading-none mb-1.5 group-hover:text-orange-500 transition-colors uppercase tracking-tight">{cafe.name}</h3>
                              <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate leading-none mb-3 font-bold uppercase tracking-wide">{cafe.address}</p>
                              
                              <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-lg border border-orange-100 dark:border-orange-500/20">
                                      <Star size={12} fill="currentColor"/> <span>{formatRating(cafe.rating)}</span>
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest ${status.isOpen ? 'text-green-600 bg-green-50 border border-green-100' : 'text-red-600 bg-red-50 border border-red-100'}`}>
                                      {status.isOpen ? 'Buka' : 'Tutup'}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {/* Action & Route Info (Green Car & Green Text) */}
                      <div className="flex items-center gap-4 pt-4 border-t border-gray-50 dark:border-slate-800/50">
                          <div className="flex-1 min-w-0">
                              {isCalculating ? (
                                  <div className="flex items-center gap-2 text-xs text-orange-500 animate-pulse font-black uppercase tracking-widest">
                                      <Loader2 size={16} className="animate-spin" /> Menghitung...
                                  </div>
                              ) : realRouteData ? (
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2 text-green-600">
                                          <Car size={20} fill="currentColor" />
                                          <span className="text-xl font-black tracking-tighter">{realRouteData.duration}</span>
                                      </div>
                                      <span className="text-xs font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1 ml-0.5">
                                          {realRouteData.distance} km
                                      </span>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                                      <Info size={18} />
                                      <span className="text-xs font-black uppercase tracking-widest">GPS Nonaktif</span>
                                  </div>
                              )}
                          </div>
                          
                          <button 
                            onClick={handleOpenExternalMaps}
                            className="h-14 px-8 bg-green-600 hover:bg-green-700 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-green-600/30 transition-all text-xs uppercase tracking-[0.2em] border-2 border-white/20 shrink-0"
                          >
                              <Navigation size={20} fill="currentColor" /> Navigasi
                          </button>
                      </div>
                  </div>
             </div>
        </div>
    );
}

export const MapView: React.FC<MapViewProps> = ({ 
    onCafeClick, cafes: initialCafes, isVisible = true, focusedCafe,
    userLocation, activeLocation, onLocationUpdate, addToast
}) => {
  const { isDarkMode } = useSession();
  const [selectedCafe, setSelectedCafe] = useState<Cafe | null>(null);
  const [triggerLocate, setTriggerLocate] = useState(0); 
  const [isLocating, setIsLocating] = useState(false);
  const [visibleCafes, setVisibleCafes] = useState<Cafe[]>(initialCafes);
  const [isLoadingMapData, setIsLoadingMapData] = useState(false);
  const [realRouteData, setRealRouteData] = useState<{ distance: string, duration: string } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  
  const lastCalculationIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeCoordsRef = useRef<{lat: number, lng: number} | null>(null);

  useEffect(() => {
      if (initialCafes?.length > 0) setVisibleCafes(initialCafes);
  }, [initialCafes]);

  const calculateRealRoute = useCallback(async (userLoc: {lat: number, lng: number}, cafe: Cafe) => {
      if (!isValidGPS(userLoc) || !cafe.coordinates) return;
      
      const calcId = `${userLoc.lat.toFixed(4)},${userLoc.lng.toFixed(4)}-${cafe.id}`;
      if (lastCalculationIdRef.current === calcId) return;
      lastCalculationIdRef.current = calcId;

      const straightDist = calculateDistance(userLoc.lat, userLoc.lng, cafe.coordinates.lat, cafe.coordinates.lng);
      if (straightDist > 60) {
          setRouteCoordinates([]);
          setRealRouteData(null);
          return;
      }

      setIsCalculatingRoute(true);
      try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${userLoc.lng},${userLoc.lat};${cafe.coordinates.lng},${cafe.coordinates.lat}?overview=full&geometries=geojson`
          );
          const data = await response.json();

          if (data.code === 'Ok' && data.routes.length > 0) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
              const distKm = (route.distance / 1000).toFixed(1);
              
              const baseDurationMin = route.duration / 60;
              const adjustedDurationMin = Math.round(baseDurationMin * 1.8);

              setRouteCoordinates(coords);
              setRealRouteData({
                  distance: distKm,
                  duration: adjustedDurationMin < 60 
                    ? `${adjustedDurationMin} mnt` 
                    : `${Math.floor(adjustedDurationMin/60)} jam ${adjustedDurationMin%60} mnt`
              });
          }
      } catch (error) {
          console.error("Routing error:", error);
      } finally {
          setIsCalculatingRoute(false);
      }
  }, []);

  useEffect(() => {
      if (isVisible && focusedCafe) {
          setSelectedCafe(focusedCafe);
          if (isValidGPS(userLocation)) calculateRealRoute(userLocation!, focusedCafe);
      } 
  }, [focusedCafe, isVisible, userLocation, calculateRealRoute]); 

  const startRealtimeTracking = useCallback(() => {
      if (!navigator.geolocation) return;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      setIsLocating(true);
      watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              if (isVisible) {
                  const distFromLastGeocode = lastGeocodeCoordsRef.current 
                    ? calculateDistance(lat, lng, lastGeocodeCoordsRef.current.lat, lastGeocodeCoordsRef.current.lng)
                    : 999;
                  if (distFromLastGeocode > 0.5) {
                      try {
                          const areaName = await reverseGeocode(lat, lng);
                          onLocationUpdate({ lat, lng, name: areaName, isGPS: true });
                          lastGeocodeCoordsRef.current = { lat, lng };
                      } catch (e) {
                          onLocationUpdate({ lat, lng, name: "Lokasi Terdeteksi", isGPS: true });
                      }
                  }
                  setTriggerLocate(prev => prev + 1);
              }
              setIsLocating(false);
          },
          () => setIsLocating(false),
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
  }, [isVisible, onLocationUpdate]);

  useEffect(() => {
      return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  const handleCafeSelect = (cafe: Cafe) => {
      setSelectedCafe(cafe);
      if (isValidGPS(userLocation)) calculateRealRoute(userLocation!, cafe);
      else {
          setRealRouteData(null);
          setRouteCoordinates([]);
      }
  };

  const handleLocateMe = () => {
      startRealtimeTracking();
      if (isValidGPS(userLocation)) setTriggerLocate(prev => prev + 1);
  };

  const handleCloseDetail = () => {
      setSelectedCafe(null);
      setRouteCoordinates([]);
      setRealRouteData(null);
      lastCalculationIdRef.current = null;
  };

  const handleMoveEnd = useCallback(
    debounce(async (bounds: { minLat: number, maxLat: number, minLng: number, maxLng: number }) => {
        if (selectedCafe) return; 
        setIsLoadingMapData(true);
        try {
            const fetchedCafes = await fetchCafesInBounds(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng);
            if (fetchedCafes.length > 0) setVisibleCafes(fetchedCafes);
        } catch (error) {
            console.error("Map Data Fetch Error", error);
        } finally {
            setIsLoadingMapData(false);
        }
    }, 400), 
  [selectedCafe]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 z-10 animate-in fade-in duration-500">
        <style>{`
            .leaflet-container { user-select: none; -webkit-user-select: none; touch-action: none !important; }
        `}</style>
        <SEO title="Peta Interaktif" description="Jelajahi lokasi kafe terbaik dengan rute jalan akurat." />
        
        <div className="absolute top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-gray-100 dark:border-white/5 flex items-center gap-5 animate-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-1.5">
                    <Circle size={8} fill="#22c55e" className="text-green-500" />
                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Buka</span>
                </div>
                <div className="w-px h-3 bg-gray-200 dark:bg-slate-800"></div>
                <div className="flex items-center gap-1.5">
                    <Circle size={8} fill="#ef4444" className="text-red-500" />
                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">Tutup</span>
                </div>
            </div>
        </div>

        <div className="absolute inset-0 z-0 h-full w-full">
            <LeafletMap 
                cafes={visibleCafes} 
                onCafeSelect={handleCafeSelect} 
                selectedCafe={selectedCafe}
                userLocation={userLocation} 
                activeLocation={activeLocation} 
                triggerLocate={triggerLocate}
                isVisible={isVisible}
                onMapClick={handleCloseDetail} 
                onMoveEnd={handleMoveEnd}
                isDarkMode={isDarkMode}
                routeData={routeCoordinates}
            />
        </div>

        {isLoadingMapData && !selectedCafe && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4 pointer-events-none">
                <Loader2 className="animate-spin text-orange-500" size={16} />
                <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-[0.2em]">Memperbarui Peta</span>
            </div>
        )}

        {selectedCafe && (
             <SelectedCafeFloatingCard 
                cafe={selectedCafe} 
                userLocation={userLocation}
                onClick={() => onCafeClick(selectedCafe)} 
                onClose={handleCloseDetail}
                realRouteData={realRouteData}
                isCalculating={isCalculatingRoute}
             />
        )}

        <div className={`absolute right-4 z-[400] transition-all duration-500 ease-in-out ${selectedCafe ? 'bottom-[calc(env(safe-area-inset-bottom)+310px)] md:bottom-28' : 'bottom-[calc(env(safe-area-inset-bottom)+90px)] md:bottom-32'}`}>
            <button 
                className={`rounded-[1.5rem] shadow-2xl transition-all active:scale-90 p-4 h-14 w-14 flex items-center justify-center border ${isLocating ? 'bg-orange-500 text-white border-orange-400' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-white border-gray-100 dark:border-slate-800'}`}
                onClick={handleLocateMe}
                disabled={isLocating && !isValidGPS(userLocation)}
                title="Cari Lokasi Saya"
            >
                {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Crosshair size={24} />}
            </button>
        </div>
    </div>
  );
}
