import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import { MapPin, Navigation, Star, X, ArrowRight, Crosshair, Clock, Loader2, Route, Send, Car, Zap, AlertTriangle } from 'lucide-react';
import { Cafe } from '../types';
import { LeafletMap } from '../components/LeafletMap';
import { GlassCard, Button, LazyImage } from '../components/UI';
import { calculateDistance, estimateTime, getOptimizedImageUrl, getCafeStatus, formatRating } from '../constants';
import { fetchCafesInBounds, debounce, reverseGeocode } from '../services/dataService';
import { SEO } from '../components/SEO';
import { useSession } from '../components/SessionContext';
// Fix: Import SafeStorage from ../lib/supabase to resolve 'Cannot find name SafeStorage' error on line 235
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
    isTooFar: boolean;
}> = ({ cafe, userLocation, onClick, onClose, realRouteData, isCalculating, isTooFar }) => {
    const status = getCafeStatus(cafe.openingHours);
    
    const handleStartNavigation = (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `https://www.google.com/maps/dir/?api=1&destination=${cafe.coordinates.lat},${cafe.coordinates.lng}&travelmode=driving`;
        window.open(url, '_blank');
    };

    return (
        <div className="absolute bottom-[calc(env(safe-area-inset-bottom)+90px)] left-4 right-4 md:bottom-10 md:left-10 md:right-auto md:w-[420px] z-[6000] animate-in slide-in-from-bottom-8 fade-in duration-500">
             <div className="bg-white dark:bg-[#1E293B] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden relative ring-1 ring-black/5">
                  <div className="p-5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onClose(); }} 
                        className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors z-10"
                      >
                          <X size={20}/>
                      </button>

                      <div className="flex gap-4 items-start mb-5 pr-8 cursor-pointer" onClick={onClick}>
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shrink-0 bg-gray-100 dark:bg-slate-800">
                              <LazyImage src={getOptimizedImageUrl(cafe.image, 300)} className="w-full h-full object-cover" alt={cafe.name} />
                          </div>
                          <div className="flex-1 min-w-0 pt-1">
                              <h3 className="font-display font-black text-xl text-gray-900 dark:text-white truncate leading-tight mb-1">{cafe.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1 mb-2 font-medium">{cafe.address}</p>
                              
                              <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-1 text-[10px] font-black text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-lg">
                                      <Star size={10} fill="currentColor"/> <span>{formatRating(cafe.rating)}</span>
                                  </div>
                                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${status.isOpen ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                      {status.isOpen ? 'Buka' : 'Tutup'}
                                  </span>
                              </div>
                          </div>
                      </div>

                      {isTooFar ? (
                          <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-2xl font-bold">
                                  <AlertTriangle size={16} /> <span>Lokasi terlalu jauh untuk kalkulasi rute (&gt;60km).</span>
                              </div>
                              <Button onClick={handleStartNavigation} className="h-14 rounded-2xl shadow-xl shadow-blue-500/20 bg-blue-600" icon={Navigation}>Buka Maps</Button>
                          </div>
                      ) : isValidGPS(userLocation) ? (
                          <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                              <div className="flex-1">
                                  {isCalculating ? (
                                      <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse font-black uppercase tracking-widest">
                                          <Loader2 size={16} className="animate-spin text-orange-500"/> Kalkulasi...
                                      </div>
                                  ) : realRouteData ? (
                                      <div className="flex flex-col">
                                          <div className="flex items-center gap-2 text-green-600">
                                              <Zap size={20} className="fill-current" />
                                              <span className="text-2xl font-black font-display tracking-tighter">{realRouteData.duration}</span>
                                          </div>
                                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">
                                               <span className="text-blue-500">Rute Jalan</span> • <span>{realRouteData.distance} km</span>
                                          </div>
                                      </div>
                                  ) : (
                                      <p className="text-xs font-bold text-gray-400">Siap Navigasi</p>
                                  )}
                              </div>
                              <button onClick={handleStartNavigation} className="flex items-center gap-3 px-8 py-4 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 hover:scale-105 text-white font-black text-sm shadow-xl shadow-blue-500/30 active:scale-95 transition-all">
                                  <Navigation size={18} fill="currentColor" /> MULAI
                              </button>
                          </div>
                      ) : (
                          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl font-medium">
                                  <Clock size={18} className="text-orange-500" /> <span>Gunakan GPS untuk melihat estimasi waktu tempuh (Darat).</span>
                              </div>
                              <button onClick={handleStartNavigation} className="w-full flex items-center justify-center gap-2 px-6 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-white font-black text-sm transition-all active:scale-95">
                                  <Navigation size={18} /> Buka Google Maps
                              </button>
                          </div>
                      )}
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
  const [isTooFar, setIsTooFar] = useState(false);
  
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
          setIsTooFar(true);
          setRouteCoordinates([]);
          setRealRouteData(null);
          return;
      }

      setIsTooFar(false);
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
              const durationMin = Math.round(route.duration / 60);

              setRouteCoordinates(coords);
              setRealRouteData({
                  distance: distKm,
                  duration: durationMin < 60 ? `${durationMin} mnt` : `${Math.floor(durationMin/60)} jam ${durationMin%60} mnt`
              });
          } else {
              throw new Error("Route not found");
          }
      } catch (error) {
          console.error("Routing error:", error);
          setRouteCoordinates([[userLoc.lat, userLoc.lng], [cafe.coordinates.lat, cafe.coordinates.lng]]);
          const d = straightDist.toFixed(1);
          setRealRouteData({ distance: d, duration: `~${estimateTime(straightDist)} mnt` });
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

  // SMART GPS WATCHER: Updates coordinates real-time, throttles reverse geocode for city names
  const startRealtimeTracking = useCallback(() => {
      if (!navigator.geolocation) return;
      
      if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
      }

      setIsLocating(true);
      
      watchIdRef.current = navigator.geolocation.watchPosition(
          async (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              
              if (isVisible) {
                  // Cek apakah jarak pergerakan cukup signifikan (>500m) untuk update nama kota
                  // Ini mencegah spam ke API geocoding saat user bergerak pelan
                  const distFromLastGeocode = lastGeocodeCoordsRef.current 
                    ? calculateDistance(lat, lng, lastGeocodeCoordsRef.current.lat, lastGeocodeCoordsRef.current.lng)
                    : 999;

                  if (distFromLastGeocode > 0.5) {
                      try {
                          const areaName = await reverseGeocode(lat, lng);
                          onLocationUpdate({ lat, lng, name: areaName, isGPS: true });
                          lastGeocodeCoordsRef.current = { lat, lng };
                      } catch (e) {
                          // Fallback jika API limit
                          onLocationUpdate({ lat, lng, name: "Lokasi Terdeteksi", isGPS: true });
                      }
                  } else {
                      // Jika hanya bergerak sedikit, update koordinat saja tanpa ubah nama label (biar awet API)
                      onLocationUpdate({ lat, lng, name: String(SafeStorage.getItem('nongkrongr_user_city') || 'Lokasi Saya'), isGPS: true });
                  }
                  
                  setTriggerLocate(prev => prev + 1);
              }
              setIsLocating(false);
          },
          (error) => {
              console.warn("GPS Watch Error:", error);
              setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
  }, [isVisible, onLocationUpdate]);

  useEffect(() => {
      return () => {
          if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
          }
      };
  }, []);

  const handleCafeSelect = (cafe: Cafe) => {
      setSelectedCafe(cafe);
      if (isValidGPS(userLocation)) {
          calculateRealRoute(userLocation!, cafe);
      } else {
          setRealRouteData(null);
          setRouteCoordinates([]);
          setIsTooFar(false);
      }
  };

  const handleLocateMe = () => {
      startRealtimeTracking();
      if (isValidGPS(userLocation)) {
          setTriggerLocate(prev => prev + 1);
      }
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
    }, 800),
  [selectedCafe]);

  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 z-10 animate-in fade-in duration-500">
        <SEO title="Peta Interaktif" description="Jelajahi lokasi kafe terbaik dengan rute jalan akurat." />
        
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

        {/* Floating Search Status Indicator */}
        {isLoadingMapData && !selectedCafe && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[500] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-4">
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
                isTooFar={isTooFar}
             />
        )}

        <div className={`absolute right-4 z-[400] transition-all duration-500 ease-in-out ${selectedCafe ? 'bottom-[calc(env(safe-area-inset-bottom)+300px)] md:bottom-28' : 'bottom-[calc(env(safe-area-inset-bottom)+100px)] md:bottom-32'}`}>
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