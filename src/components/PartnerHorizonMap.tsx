import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps';
import {
  Heart,
  Plane,
  Car,
  Clock,
  Compass,
  MapPin,
  Locate,
  Maximize2,
  Navigation,
  Globe,
  Layers,
  Sparkles,
  Search,
  Check,
  Zap,
  Info,
  ArrowRight
} from 'lucide-react';
import { HorizonLocation, UserProfile } from '../types';
import { detectRealDeviceLocation } from '../utils/geolocation';
import { OfflineWorldRadar } from './OfflineWorldRadar';

// Google Maps global declaration
declare const google: any;

interface PartnerHorizonMapProps {
  currentUserName: string;
  currentUserAvatar: string;
  partner?: UserProfile;
  partnerName: string;
  partnerAvatar?: string;
  myLocation: HorizonLocation;
  partnerLocation: HorizonLocation;
  onUpdateMyLocation: (loc: Partial<HorizonLocation>) => void;
}

// Preset popular long-distance cities with accurate coordinates & timezones
export const POPULAR_CITIES: Array<{
  city: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'clear_night' | 'sunset';
  tempC: number;
  tempF: number;
}> = [
  { city: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, timezone: 'America/New_York', weather: 'sunny', tempC: 22, tempF: 72 },
  { city: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', weather: 'sunny', tempC: 25, tempF: 77 },
  { city: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles', weather: 'cloudy', tempC: 18, tempF: 64 },
  { city: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago', weather: 'cloudy', tempC: 19, tempF: 66 },
  { city: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York', weather: 'sunny', tempC: 29, tempF: 84 },
  { city: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', weather: 'rainy', tempC: 16, tempF: 61 },
  { city: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', weather: 'sunset', tempC: 21, tempF: 70 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo', weather: 'clear_night', tempC: 20, tempF: 68 },
  { city: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978, timezone: 'Asia/Seoul', weather: 'sunny', tempC: 21, tempF: 70 },
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney', weather: 'sunny', tempC: 23, tempF: 73 },
  { city: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto', weather: 'cloudy', tempC: 17, tempF: 63 },
  { city: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver', weather: 'rainy', tempC: 15, tempF: 59 },
  { city: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin', weather: 'cloudy', tempC: 18, tempF: 64 },
  { city: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome', weather: 'sunny', tempC: 26, tempF: 79 },
  { city: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai', weather: 'sunny', tempC: 34, tempF: 93 },
  { city: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore', weather: 'cloudy', tempC: 30, tempF: 86 },
  { city: 'Honolulu', country: 'USA (Hawaii)', lat: 21.3069, lng: -157.8583, timezone: 'Pacific/Honolulu', weather: 'sunny', tempC: 28, tempF: 82 },
  { city: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041, timezone: 'Europe/Amsterdam', weather: 'cloudy', tempC: 17, tempF: 63 },
  { city: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686, timezone: 'Europe/Stockholm', weather: 'cloudy', tempC: 14, tempF: 57 },
  { city: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038, timezone: 'Europe/Madrid', weather: 'sunny', tempC: 27, tempF: 81 },
];

// Helper to calculate exact Haversine Distance
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { miles: number; km: number } {
  const R_miles = 3958.8;
  const R_km = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return {
    miles: Math.round(R_miles * c),
    km: Math.round(R_km * c),
  };
}

// Calculate realistic travel durations (Flight, Driving, Walking)
export function calculateTravelEstimates(miles: number) {
  // 1. Flight Estimate: Average commercial airliner ~550 mph + 45 min airport/takeoff buffer
  const flightHoursTotal = miles < 50 ? miles / 200 : miles / 550 + 0.75;
  const flightHours = Math.floor(flightHoursTotal);
  const flightMinutes = Math.round((flightHoursTotal - flightHours) * 60);
  const flightString =
    flightHours > 0
      ? `${flightHours} hr${flightHours > 1 ? 's' : ''} ${flightMinutes} min`
      : `${flightMinutes} mins`;

  // 2. Driving Estimate (approx 60 mph average with 1.25 road winding factor)
  const isOverwater = miles > 3000;
  const drivingMiles = Math.round(miles * 1.22);
  const drivingHoursTotal = drivingMiles / 60;
  const drivingDays = Math.floor(drivingHoursTotal / 24);
  const drivingHours = Math.floor(drivingHoursTotal % 24);
  const drivingString = isOverwater
    ? 'Across ocean (Flight only)'
    : drivingDays > 0
    ? `${drivingDays}d ${drivingHours}h non-stop driving`
    : `${drivingHours} hrs driving`;

  // 3. Walking / Direct Step Count
  const stepsCount = Math.round(miles * 2000);

  return {
    flightString,
    drivingString,
    isOverwater,
    stepsCount,
  };
}

// Component to handle bounds fitting and map controls inside Google Map
const MapController: React.FC<{
  myPos: { lat: number; lng: number };
  partnerPos: { lat: number; lng: number };
  triggerFit: number;
}> = ({ myPos, partnerPos, triggerFit }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    try {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(myPos);
      bounds.extend(partnerPos);
      map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    } catch {
      // Ignore if google maps global isn't ready
    }
  }, [map, myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng, triggerFit]);

  return null;
};

// Polyline component for Google Maps
const GeodesicHeartLine: React.FC<{
  myPos: { lat: number; lng: number };
  partnerPos: { lat: number; lng: number };
}> = ({ myPos, partnerPos }) => {
  const map = useMap();
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path: [myPos, partnerPos],
        geodesic: true,
        strokeColor: '#f43f5e',
        strokeOpacity: 0.85,
        strokeWeight: 3.5,
        map: map,
      });
    } else {
      polylineRef.current.setPath([myPos, partnerPos]);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng]);

  return null;
};

// Custom Map Overlay to render rich interactive React markers without requiring mapId or triggering ApiProjectMapError
const CustomMapOverlay: React.FC<{
  position: { lat: number; lng: number };
  children: React.ReactNode;
}> = ({ position, children }) => {
  const map = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map || typeof google === 'undefined' || !google.maps?.OverlayView) return;

    let overlayInstance: any = null;

    class HorizonOverlay extends (google.maps.OverlayView as { new(): any }) {
      div: HTMLDivElement;

      constructor() {
        super();
        this.div = document.createElement('div');
        this.div.style.position = 'absolute';
        this.div.style.transform = 'translate(-50%, -100%)';
        this.div.style.cursor = 'pointer';
        this.div.style.zIndex = '50';
      }

      onAdd() {
        const panes = (this as any).getPanes?.();
        panes?.overlayMouseTarget?.appendChild(this.div);
        setContainer(this.div);
      }

      draw() {
        const projection = (this as any).getProjection?.();
        if (!projection || !this.div) return;
        const latLng = new google.maps.LatLng(position.lat, position.lng);
        const point = projection.fromLatLngToDivPixel(latLng);
        if (point) {
          this.div.style.left = `${point.x}px`;
          this.div.style.top = `${point.y}px`;
        }
      }

      onRemove() {
        if (this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
        }
        setContainer(null);
      }
    }

    overlayInstance = new HorizonOverlay();
    overlayInstance.setMap(map);

    return () => {
      if (overlayInstance) {
        overlayInstance.setMap(null);
      }
    };
  }, [map, position.lat, position.lng]);

  if (!container) return null;
  return createPortal(children, container);
};

export const PartnerHorizonMap: React.FC<PartnerHorizonMapProps> = ({
  currentUserName,
  currentUserAvatar,
  partner,
  partnerName,
  partnerAvatar,
  myLocation,
  partnerLocation,
  onUpdateMyLocation,
}) => {
  const rawApiKey = (((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string) || '').trim();
  const customMapId = (((import.meta as any).env?.VITE_GOOGLE_MAPS_MAP_ID as string) || '').trim();
  const [mapLoadError, setMapLoadError] = useState(false);
  const [viewMode, setViewMode] = useState<'google' | 'radar'>('google');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'terrain' | 'hybrid'>('satellite');
  const [fitCounter, setFitCounter] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState('');
  const [locationErrorMsg, setLocationErrorMsg] = useState('');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Gracefully detect Google Maps API authentication / project configuration failures
  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Google Maps authentication warning. Providing offline World Radar fallback.');
      setMapLoadError(true);
    };

    (window as any).gm_authFailure = handleAuthFailure;

    const errorHandler = (event: ErrorEvent) => {
      if (
        event?.message?.includes('ApiProjectMapError') ||
        event?.message?.includes('Google Maps') ||
        event?.filename?.includes('maps.googleapis.com')
      ) {
        handleAuthFailure();
      }
    };
    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  const myPos = useMemo(
    () => ({ lat: myLocation.latitude, lng: myLocation.longitude }),
    [myLocation.latitude, myLocation.longitude]
  );
  const partnerPos = useMemo(
    () => ({ lat: partnerLocation.latitude, lng: partnerLocation.longitude }),
    [partnerLocation.latitude, partnerLocation.longitude]
  );

  const center = useMemo(() => {
    return {
      lat: (myPos.lat + partnerPos.lat) / 2,
      lng: (myPos.lng + partnerPos.lng) / 2,
    };
  }, [myPos, partnerPos]);

  const { miles, km } = useMemo(
    () => calculateHaversineDistance(myPos.lat, myPos.lng, partnerPos.lat, partnerPos.lng),
    [myPos, partnerPos]
  );

  const travelEstimates = useMemo(() => calculateTravelEstimates(miles), [miles]);

  // Handle Real Device Geolocation
  const handleGetMyExactLocation = async () => {
    setIsLocating(true);
    setLocationSuccessMsg('');
    setLocationErrorMsg('');

    try {
      const realLoc = await detectRealDeviceLocation();
      onUpdateMyLocation(realLoc);
      setIsLocating(false);
      setLocationSuccessMsg(`📍 Real location updated: ${realLoc.city}`);
      setFitCounter((c) => c + 1);
      setTimeout(() => setLocationSuccessMsg(''), 5000);
    } catch (err) {
      setIsLocating(false);
      console.warn('Geolocation detection error:', err);
      setLocationErrorMsg('Could not access device GPS. Please allow location permissions in your browser.');
      setTimeout(() => setLocationErrorMsg(''), 6000);
    }
  };

  const handleSelectCity = (preset: (typeof POPULAR_CITIES)[0]) => {
    onUpdateMyLocation({
      city: `${preset.city}, ${preset.country}`,
      latitude: preset.lat,
      longitude: preset.lng,
      timezone: preset.timezone,
      weatherCondition: preset.weather,
      tempC: preset.tempC,
      tempF: preset.tempF,
      updatedAt: Date.now(),
    });
    setShowCityPicker(false);
    setFitCounter((c) => c + 1);
  };

  const filteredCities = POPULAR_CITIES.filter(
    (c) =>
      c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full space-y-4">
      {/* Real-time Distance & Travel Time Stat Header */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-rose-700 font-semibold">
            <Compass className="w-3.5 h-3.5 text-rose-500" />
            <span>Exact Distance</span>
          </div>
          <div className="mt-1">
            <span className="text-lg sm:text-xl font-extrabold text-slate-900">
              {miles.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 ml-1 font-medium">mi ({km.toLocaleString()} km)</span>
          </div>
        </div>

        <div className="p-3 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl border border-sky-200/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-sky-700 font-semibold">
            <Plane className="w-3.5 h-3.5 text-sky-500" />
            <span>Flight Duration</span>
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-bold text-slate-900">
              {travelEstimates.flightString}
            </span>
          </div>
        </div>

        <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700 font-semibold">
            <Car className="w-3.5 h-3.5 text-indigo-500" />
            <span>Road Travel</span>
          </div>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-1">
              {travelEstimates.drivingString}
            </span>
          </div>
        </div>

        <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>Distance In Heart</span>
          </div>
          <div className="mt-1">
            <span className="text-sm sm:text-base font-extrabold text-rose-600">
              0 miles
            </span>
            <span className="text-[10px] text-slate-500 block font-medium">Always together</span>
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleGetMyExactLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Detect your exact GPS coordinates with high precision"
          >
            <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Detecting GPS...' : 'Use My GPS Location'}</span>
          </button>

          <button
            onClick={() => setShowCityPicker(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-rose-500" />
            <span>Change My City</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFitCounter((c) => c + 1)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            title="Fit both you and partner into view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit Both</span>
          </button>

          <button
            onClick={() => setMapType(mapType === 'satellite' ? 'hybrid' : mapType === 'hybrid' ? 'roadmap' : 'satellite')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
            title="Toggle Map Style (Satellite / Hybrid / Roadmap)"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span className="capitalize">{mapType}</span>
          </button>

          {mapLoadError && (
            <button
              onClick={() => setViewMode(viewMode === 'google' ? 'radar' : 'google')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'radar'
                  ? 'bg-sky-50 border-sky-200 text-sky-700'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Toggle between Satellite Map and Offline Radar"
            >
              <Globe className="w-3.5 h-3.5 text-sky-500" />
              <span>{viewMode === 'google' ? 'World Radar' : 'Satellite Map'}</span>
            </button>
          )}
        </div>
      </div>

      {locationSuccessMsg && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{locationSuccessMsg}</span>
        </div>
      )}

      {locationErrorMsg && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2 animate-fade-in">
          <Info className="w-4 h-4 text-amber-600" />
          <span>{locationErrorMsg}</span>
        </div>
      )}

      {/* Interactive Map Container */}
      <div className="relative w-full h-[360px] sm:h-[420px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner bg-slate-900">
        {viewMode === 'radar' ? (
          <OfflineWorldRadar
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            partner={partner}
            partnerName={partnerName}
            partnerAvatar={partnerAvatar}
            myLocation={myLocation}
            partnerLocation={partnerLocation}
            miles={miles}
            km={km}
            flightString={travelEstimates.flightString}
            hasApiError={mapLoadError}
          />
        ) : (
          <APIProvider apiKey={rawApiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={2}
              mapTypeId={mapType}
              {...(customMapId ? { mapId: customMapId } : {})}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              gestureHandling="greedy"
              disableDefaultUI={false}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Controller to automatically calculate bounds and zoom */}
              <MapController myPos={myPos} partnerPos={partnerPos} triggerFit={fitCounter} />

              {/* Geodesic Arc Connecting You and Partner */}
              <GeodesicHeartLine myPos={myPos} partnerPos={partnerPos} />

              {/* Your Location Marker */}
              <CustomMapOverlay position={myPos}>
                <div className="flex flex-col items-center group cursor-pointer select-none">
                  <div className="px-2.5 py-1 rounded-full bg-sky-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1 mb-1 whitespace-nowrap border-2 border-white">
                    <span>You ({currentUserName})</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full border-3 border-sky-500 bg-white shadow-xl flex items-center justify-center text-xl overflow-hidden">
                      {currentUserAvatar && (currentUserAvatar.startsWith('data:') || currentUserAvatar.startsWith('http') || currentUserAvatar.startsWith('blob:')) ? (
                        <img src={currentUserAvatar} alt={currentUserName} className="w-full h-full object-cover" />
                      ) : (
                        currentUserAvatar || '💖'
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-sky-600 text-white shadow-xs">
                      <Navigation className="w-2.5 h-2.5" />
                    </div>
                  </div>
                  <div className="w-1.5 h-3 bg-sky-600 rounded-b-full"></div>
                </div>
              </CustomMapOverlay>

              {/* Partner's Location Marker */}
              <CustomMapOverlay position={partnerPos}>
                <div className="flex flex-col items-center group cursor-pointer select-none">
                  <div className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-lg flex items-center gap-1 mb-1 whitespace-nowrap border-2 border-white">
                    <span>{partner ? partner.name : partnerName}</span>
                    <Heart className="w-3 h-3 text-white fill-white animate-bounce" />
                  </div>
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full border-3 border-rose-500 bg-white shadow-xl flex items-center justify-center text-xl overflow-hidden">
                      {(partnerAvatar || partner?.avatar) && ((partnerAvatar || partner?.avatar || '').startsWith('data:') || (partnerAvatar || partner?.avatar || '').startsWith('http') || (partnerAvatar || partner?.avatar || '').startsWith('blob:')) ? (
                        <img src={partnerAvatar || partner?.avatar} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        partnerAvatar || partner?.avatar || '✨'
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-xs">
                      <Heart className="w-2.5 h-2.5 fill-white text-white" />
                    </div>
                  </div>
                  <div className="w-1.5 h-3 bg-rose-600 rounded-b-full"></div>
                </div>
              </CustomMapOverlay>
            </Map>
          </APIProvider>
        )}

        {/* Floating Flight Indicator / Trajectory Card */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-lg flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <span>{myLocation.city.split(',')[0]}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{partnerLocation.city.split(',')[0]}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                {miles.toLocaleString()} mi • Flight ~{travelEstimates.flightString}
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="text-[10px] font-semibold text-rose-600 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100">
              Live Horizon
            </span>
          </div>
        </div>
      </div>

      {/* City Picker Modal */}
      {showCityPicker && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-5 border border-slate-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Your City</h3>
                <p className="text-xs text-slate-500">Choose your base location to update map & distances</p>
              </div>
              <button
                onClick={() => setShowCityPicker(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search city or country..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            {/* Preset City Grid */}
            <div className="mt-3 overflow-y-auto flex-1 space-y-1.5 pr-1">
              {filteredCities.map((item) => {
                const isSelected = myLocation.city.includes(item.city);
                return (
                  <button
                    key={`${item.city}-${item.country}`}
                    onClick={() => handleSelectCity(item)}
                    className={`w-full p-2.5 rounded-2xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-sky-50 border border-sky-200 text-sky-900'
                        : 'bg-slate-50/70 hover:bg-slate-100 border border-slate-200/60 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">{item.city}</div>
                      <div className="text-[10px] text-slate-500">{item.country} • {item.timezone}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-700">{item.tempF}°F</span>
                      {isSelected && <Check className="w-4 h-4 text-sky-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
