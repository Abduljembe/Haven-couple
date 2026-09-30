import React, { useState, useEffect } from 'react';
import {
  Globe2,
  ArrowLeft,
  X,
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  Sunset,
  Navigation,
  Heart,
  MapPin,
  Clock,
  Compass,
  Sparkles,
  Plane,
  Car,
  Map as MapIcon,
  Layers,
  Locate
} from 'lucide-react';
import { HorizonLocation, UserProfile } from '../types';
import { PartnerHorizonMap, POPULAR_CITIES, calculateHaversineDistance, calculateTravelEstimates } from './PartnerHorizonMap';
import { detectRealDeviceLocation } from '../utils/geolocation';

interface LongDistanceHorizonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserName: string;
  currentUserAvatar?: string;
  partner?: UserProfile;
  partnerName: string;
  partnerAvatar?: string;
  myLocation: HorizonLocation;
  partnerLocation: HorizonLocation;
  onUpdateMyLocation: (loc: Partial<HorizonLocation>) => void;
}

export const LongDistanceHorizonModal: React.FC<LongDistanceHorizonModalProps> = ({
  isOpen,
  onClose,
  currentUserName,
  currentUserAvatar = '💖',
  partner,
  partnerName,
  partnerAvatar = '✨',
  myLocation,
  partnerLocation,
  onUpdateMyLocation,
}) => {
  const [activeTab, setActiveTab] = useState<'map' | 'sky'>('map');
  const [myLocalTime, setMyLocalTime] = useState<string>('');
  const [partnerLocalTime, setPartnerLocalTime] = useState<string>('');
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [cityInput, setCityInput] = useState<string>(myLocation.city);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      try {
        setMyLocalTime(
          now.toLocaleTimeString('en-US', {
            timeZone: myLocation.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        setPartnerLocalTime(
          now.toLocaleTimeString('en-US', {
            timeZone: partnerLocation.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      } catch {
        setMyLocalTime(now.toLocaleTimeString());
        setPartnerLocalTime(now.toLocaleTimeString());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [myLocation.timezone, partnerLocation.timezone]);

  if (!isOpen) return null;

  const { miles, km } = calculateHaversineDistance(
    myLocation.latitude,
    myLocation.longitude,
    partnerLocation.latitude,
    partnerLocation.longitude
  );

  const travelEstimates = calculateTravelEstimates(miles);

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'sunny':
        return <Sun className="w-6 h-6 text-amber-500" />;
      case 'cloudy':
        return <Cloud className="w-6 h-6 text-slate-400" />;
      case 'rainy':
        return <CloudRain className="w-6 h-6 text-blue-400" />;
      case 'snowy':
        return <CloudSnow className="w-6 h-6 text-sky-300" />;
      case 'sunset':
        return <Sunset className="w-6 h-6 text-rose-400" />;
      default:
        return <Moon className="w-6 h-6 text-indigo-400" />;
    }
  };

  const handleSaveCity = () => {
    // Check if matches any preset city for lat/lng auto fill
    const matched = POPULAR_CITIES.find(
      (c) => c.city.toLowerCase() === cityInput.trim().toLowerCase()
    );
    if (matched) {
      onUpdateMyLocation({
        city: `${matched.city}, ${matched.country}`,
        latitude: matched.lat,
        longitude: matched.lng,
        timezone: matched.timezone,
        weatherCondition: matched.weather,
        tempC: matched.tempC,
        tempF: matched.tempF,
        updatedAt: Date.now(),
      });
    } else {
      onUpdateMyLocation({ city: cityInput, updatedAt: Date.now() });
    }
    setIsEditingLocation(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div
        id="long-distance-horizon-modal"
        className="w-full max-w-4xl bg-white rounded-none sm:rounded-3xl shadow-2xl overflow-hidden border-0 sm:border border-sky-100 flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3.5 bg-gradient-to-r from-sky-50 via-indigo-50 to-rose-50 border-b border-sky-100 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Haven-Style Mobile Back Button */}
            <button
              onClick={onClose}
              id="btn-horizon-mobile-back"
              className="p-1.5 -ml-1 text-sky-700 hover:bg-sky-100 rounded-xl transition flex items-center gap-1 text-xs font-bold shrink-0 sm:hidden"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span>Back</span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-sky-500/10 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
              <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                <span>Partner Sky & Horizon Map</span>
                <span className="hidden xs:inline-block text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold shrink-0">
                  Real GPS
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate">
                Live Google Maps, coordinates, distance & travel times
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 bg-white/80 rounded-2xl border border-sky-100 shadow-2xs">
              <button
                onClick={() => setActiveTab('map')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'map'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Live Map</span>
              </button>
              <button
                onClick={() => setActiveTab('sky')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'sky'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Weather & Skies</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'map' ? (
            /* Interactive Real Google Map View */
            <div className="space-y-4">
              <PartnerHorizonMap
                currentUserName={currentUserName}
                currentUserAvatar={currentUserAvatar}
                partner={partner}
                partnerName={partnerName}
                partnerAvatar={partnerAvatar}
                myLocation={myLocation}
                partnerLocation={partnerLocation}
                onUpdateMyLocation={onUpdateMyLocation}
              />
            </div>
          ) : (
            /* Ambient Sky & Weather Comparison View */
            <div className="space-y-6">
              {/* Distance Counter Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Heart className="w-32 h-32" />
                </div>
                <div className="relative z-10 space-y-1.5">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Calculated Geographic Distance</span>
                  </div>
                  <h3 className="text-3xl font-extrabold tracking-tight">
                    {miles.toLocaleString()} miles ({km.toLocaleString()} km) apart
                  </h3>
                  <p className="text-xs text-sky-100 font-medium flex items-center justify-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-300 fill-rose-300 animate-pulse" />
                    <span>0 miles in heart • Sharing the exact same sky</span>
                  </p>
                </div>
              </div>

              {/* Twin Skies Comparison (My Sky vs Partner's Sky) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* My Location Card */}
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-700">You ({currentUserName})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const realLoc = await detectRealDeviceLocation();
                            onUpdateMyLocation(realLoc);
                          } catch (e) {
                            console.warn('Location detection failed:', e);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200 transition-colors cursor-pointer"
                        title="Detect real computer GPS location"
                      >
                        <Locate className="w-3 h-3" />
                        <span>Detect GPS</span>
                      </button>
                      <button
                        onClick={() => setIsEditingLocation(!isEditingLocation)}
                        className="text-[11px] text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-medium"
                      >
                        {isEditingLocation ? 'Done' : 'Manual City'}
                      </button>
                    </div>
                  </div>

                  {isEditingLocation ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cityInput}
                        onChange={(e) => setCityInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800"
                        placeholder="Enter city (e.g. Paris, Tokyo, New York)..."
                      />
                      <button
                        onClick={handleSaveCity}
                        className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="text-xl font-bold text-slate-900">{myLocation.city}</div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Coordinates: {myLocation.latitude.toFixed(2)}°, {myLocation.longitude.toFixed(2)}°</span>
                    <span>•</span>
                    <span>Timezone: {myLocation.timezone}</span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center gap-3">
                      {getWeatherIcon(myLocation.weatherCondition)}
                      <div>
                        <div className="text-base font-bold text-slate-800">{myLocation.tempF}°F ({myLocation.tempC}°C)</div>
                        <div className="text-[10px] text-slate-400 capitalize">{myLocation.weatherCondition.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-slate-800">{myLocalTime || '12:00 PM'}</div>
                      <div className="text-[10px] text-slate-400">Local Time</div>
                    </div>
                  </div>
                </div>

                {/* Partner's Location Card */}
                <div className="p-5 rounded-3xl bg-rose-50/50 border border-rose-200/80 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-rose-600" />
                      <span className="text-xs font-bold text-rose-900">{partner ? partner.name : partnerName}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                      Live Horizon
                    </span>
                  </div>

                  <div className="text-xl font-bold text-slate-900">{partnerLocation.city}</div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>Coordinates: {partnerLocation.latitude.toFixed(2)}°, {partnerLocation.longitude.toFixed(2)}°</span>
                    <span>•</span>
                    <span>Timezone: {partnerLocation.timezone}</span>
                  </div>

                  <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs">
                    <div className="flex items-center gap-3">
                      {getWeatherIcon(partnerLocation.weatherCondition)}
                      <div>
                        <div className="text-base font-bold text-slate-800">{partnerLocation.tempF}°F ({partnerLocation.tempC}°C)</div>
                        <div className="text-[10px] text-slate-400 capitalize">{partnerLocation.weatherCondition.replace('_', ' ')}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-rose-700">{partnerLocalTime || '12:00 PM'}</div>
                      <div className="text-[10px] text-slate-400">Their Local Time</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Under The Same Sky Message */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center gap-3 text-xs text-amber-900">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  <strong>Under the Same Constellations:</strong> Look up at the night sky at the same moment—the moonlight touching you is touching your partner too.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

