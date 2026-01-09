// Rate-limited Nominatim (OpenStreetMap) geocoder
// Respects OSM usage policy: max 1 request per second

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

// Rate limiter state
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

// Cache for geocoding results (1 hour TTL)
const cache = new Map<string, { result: GeocodingResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// User-Agent header (required by Nominatim)
const USER_AGENT = "IKAG-Marketplace/1.0 (https://ikag.test)";

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

function getCacheKey(type: "geocode" | "reverse", query: string): string {
  return `${type}:${query.toLowerCase().trim()}`;
}

function getFromCache(key: string): GeocodingResult | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  if (cached) {
    cache.delete(key);
  }
  return null;
}

function setCache(key: string, result: GeocodingResult): void {
  cache.set(key, { result, timestamp: Date.now() });
  
  // Clean up old entries if cache gets too large
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache.entries()) {
      if (now - v.timestamp > CACHE_TTL) {
        cache.delete(k);
      }
    }
  }
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  const cacheKey = getCacheKey("geocode", address);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    await waitForRateLimit();

    const params = new URLSearchParams({
      q: address,
      format: "json",
      limit: "1",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = (await response.json()) as NominatimResult[];

    if (data.length === 0) {
      return null;
    }

    const result: GeocodingResult = {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      displayName: data[0].display_name,
      address: data[0].address
        ? {
            road: data[0].address.road,
            city:
              data[0].address.city ||
              data[0].address.town ||
              data[0].address.village,
            state: data[0].address.state,
            country: data[0].address.country,
            postcode: data[0].address.postcode,
          }
        : undefined,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to an address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> {
  const cacheKey = getCacheKey("reverse", `${latitude},${longitude}`);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    await waitForRateLimit();

    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: "json",
      addressdetails: "1",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }

    const data = (await response.json()) as NominatimResult;

    if (!data.lat || !data.lon) {
      return null;
    }

    const result: GeocodingResult = {
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon),
      displayName: data.display_name,
      address: data.address
        ? {
            road: data.address.road,
            city:
              data.address.city ||
              data.address.town ||
              data.address.village,
            state: data.address.state,
            country: data.address.country,
            postcode: data.address.postcode,
          }
        : undefined,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Debounced geocode function for input fields
 * Returns a function that will only execute after the specified delay
 */
export function createDebouncedGeocode(delayMs: number = 500) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (
    address: string,
    callback: (result: GeocodingResult | null) => void
  ): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(async () => {
      const result = await geocodeAddress(address);
      callback(result);
    }, delayMs);
  };
}

export type { GeocodingResult };
