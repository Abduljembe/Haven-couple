import { HorizonLocation } from '../types';

/**
 * Maps WMO Weather codes from Open-Meteo to our Horizon weather conditions
 */
function mapWmoCodeToCondition(
  code: number,
  isDay: number = 1
): 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'clear_night' | 'sunset' {
  if (code === 0 || code === 1) {
    return isDay === 1 ? 'sunny' : 'clear_night';
  }
  if (code === 2 || code === 3) {
    return 'cloudy';
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) {
    return 'rainy';
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return 'snowy';
  }
  return isDay === 1 ? 'sunny' : 'clear_night';
}

/**
 * Reverse geocodes coordinates to a human-readable city and country.
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<string> {
  try {
    // 1. Try OpenStreetMap Nominatim reverse geocoder
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`,
      {
        headers: {
          'Accept-Language': 'en',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.municipality ||
        addr.suburb ||
        addr.county;
      const country = addr.country || '';
      const state = addr.state ? `, ${addr.state}` : '';

      if (city && country) {
        return `${city}${state}, ${country}`;
      } else if (data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        return parts.slice(0, 3).join(', ');
      }
    }
  } catch (err) {
    console.warn('[Geolocation] Reverse geocoding fallback:', err);
  }

  try {
    // 2. Fallback to BigDataCloud client reverse geocoding API
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
      const country = bdcData.countryName;
      if (city && country) {
        return `${city}, ${country}`;
      }
    }
  } catch (err) {
    console.warn('[Geolocation] BigDataCloud fallback error:', err);
  }

  return `Coordinates (${latitude.toFixed(3)}°, ${longitude.toFixed(3)}°)`;
}

/**
 * Fetches real current meteorological weather and temperature from Open-Meteo.
 */
export async function fetchLiveWeather(
  latitude: number,
  longitude: number
): Promise<{
  tempC: number;
  tempF: number;
  weatherCondition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'clear_night' | 'sunset';
}> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`
    );
    if (res.ok) {
      const data = await res.json();
      const tempC = Math.round(data.current?.temperature_2m ?? 20);
      const tempF = Math.round((tempC * 9) / 5 + 32);
      const weatherCode = data.current?.weather_code ?? 0;
      const isDay = data.current?.is_day ?? 1;
      const condition = mapWmoCodeToCondition(weatherCode, isDay);
      return { tempC, tempF, weatherCondition: condition };
    }
  } catch (err) {
    console.warn('[Geolocation] Live weather fetch failed:', err);
  }

  return {
    tempC: 21,
    tempF: 70,
    weatherCondition: 'sunny',
  };
}

/**
 * Gets real location directly from the user's computer/browser GPS.
 */
export async function detectRealDeviceLocation(): Promise<HorizonLocation> {
  const browserTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // 1. Try Browser Geolocation API
  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const { latitude, longitude } = position.coords;
      const [cityName, weather] = await Promise.all([
        reverseGeocodeCoordinates(latitude, longitude),
        fetchLiveWeather(latitude, longitude),
      ]);

      return {
        city: cityName,
        timezone: browserTimezone,
        latitude,
        longitude,
        tempC: weather.tempC,
        tempF: weather.tempF,
        weatherCondition: weather.weatherCondition,
        updatedAt: Date.now(),
      };
    } catch (geoError) {
      console.info('[Geolocation] Browser GPS prompt rejected or timed out. Falling back to IP detection...', geoError);
    }
  }

  // 2. IP-based location fallback if GPS is denied or unavailable
  try {
    const ipRes = await fetch('https://ipapi.co/json/');
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      const latitude = ipData.latitude || 40.7128;
      const longitude = ipData.longitude || -74.006;
      const city = `${ipData.city || 'My Location'}, ${ipData.country_name || ''}`.trim();
      const timezone = ipData.timezone || browserTimezone;
      const weather = await fetchLiveWeather(latitude, longitude);

      return {
        city: city.endsWith(',') ? city.slice(0, -1) : city,
        timezone,
        latitude,
        longitude,
        tempC: weather.tempC,
        tempF: weather.tempF,
        weatherCondition: weather.weatherCondition,
        updatedAt: Date.now(),
      };
    }
  } catch (ipError) {
    console.warn('[Geolocation] IP fallback failed:', ipError);
  }

  // 3. Absolute fallback based on timezone
  return {
    city: `Local Computer (${browserTimezone.split('/').pop()?.replace('_', ' ') || 'Device'})`,
    timezone: browserTimezone,
    latitude: 40.7128,
    longitude: -74.006,
    tempC: 22,
    tempF: 72,
    weatherCondition: 'sunny',
    updatedAt: Date.now(),
  };
}
