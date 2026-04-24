import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArtEvent } from '../src/types';

type VenueCache = Record<
  string,
  {
    latitude: number;
    longitude: number;
    address?: string;
    displayName: string;
    updatedAt: string;
  }
>;

const directoryName = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(directoryName, '..');
const eventsPath = path.join(projectRoot, 'public', 'data', 'events.json');
const venuesPath = path.join(projectRoot, 'public', 'data', 'venues.json');

const userAgent =
  process.env.GEOCODER_USER_AGENT ??
  'BerlinArtOpeningsGeocoder/0.1 (+https://github.com/replace-this/berlin-art-openings)';

function normalizeKey(address: string) {
  return address.trim().toLowerCase();
}

function coordinateCacheKey(latitude: number, longitude: number) {
  return `coords:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
}

function formatAddress(value: {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
}) {
  const streetName = value.road ?? value.pedestrian ?? value.footway;
  const street =
    streetName && value.house_number
      ? `${streetName} ${value.house_number}`
      : streetName;
  const locality = value.city ?? value.town ?? value.village ?? value.suburb;

  const address = [street, value.postcode, locality].filter(Boolean).join(', ');
  return address || undefined;
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readJsonFile<T>(filePath: string, fallbackValue: T) {
  try {
    const fileContents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContents) as T;
  } catch {
    return fallbackValue;
  }
}

async function geocodeAddress(address: string) {
  // Nominatim requires local, low-volume use and a clearly identifiable user agent.
  // Keep this script to small manual batches and do not parallelize requests.
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'de');
  url.searchParams.set('q', address);

  if (process.env.NOMINATIM_EMAIL) {
    url.searchParams.set('email', process.env.NOMINATIM_EMAIL);
  }

  const response = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed for "${address}" (${response.status})`);
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: {
      house_number?: string;
      road?: string;
      pedestrian?: string;
      footway?: string;
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      suburb?: string;
    };
  }>;

  if (results.length === 0) {
    return undefined;
  }

  const topResult = results[0];
  return {
    latitude: Number(topResult.lat),
    longitude: Number(topResult.lon),
    address: formatAddress(topResult.address ?? {}),
    displayName: topResult.display_name,
    updatedAt: new Date().toISOString(),
  };
}

async function reverseGeocodeCoordinates(latitude: number, longitude: number) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));

  if (process.env.NOMINATIM_EMAIL) {
    url.searchParams.set('email', process.env.NOMINATIM_EMAIL);
  }

  const response = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed for "${latitude},${longitude}" (${response.status})`);
  }

  const result = (await response.json()) as {
    display_name?: string;
    address?: {
      house_number?: string;
      road?: string;
      pedestrian?: string;
      footway?: string;
      postcode?: string;
      city?: string;
      town?: string;
      village?: string;
      suburb?: string;
    };
  };

  const displayName = result.display_name?.trim();
  const address = formatAddress(result.address ?? {});

  if (!displayName && !address) {
    return undefined;
  }

  return {
    latitude,
    longitude,
    address,
    displayName: displayName ?? address ?? `${latitude}, ${longitude}`,
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  const events = await readJsonFile<ArtEvent[]>(eventsPath, []);
  const cache = await readJsonFile<VenueCache>(venuesPath, {});

  let geocodedCount = 0;
  let reverseGeocodedCount = 0;

  for (const event of events) {
    const hasCoordinates = typeof event.latitude === 'number' && typeof event.longitude === 'number';

    if (hasCoordinates && !event.address) {
      if (event.latitude === undefined || event.longitude === undefined) {
        continue;
      }

      const latitude = event.latitude;
      const longitude = event.longitude;
      const cacheKey = coordinateCacheKey(latitude, longitude);
      const cachedVenue = cache[cacheKey];

      if (cachedVenue) {
        event.address = cachedVenue.address ?? cachedVenue.displayName;
        continue;
      }

      try {
        const result = await reverseGeocodeCoordinates(latitude, longitude);
        if (result) {
          cache[cacheKey] = result;
          event.address = result.address ?? result.displayName;
          reverseGeocodedCount += 1;
        }
      } catch (error) {
        console.error(`Failed to reverse geocode "${latitude},${longitude}"`, error);
      }

      await delay(1100);
      continue;
    }

    if (hasCoordinates || !event.address) {
      continue;
    }

    const cacheKey = normalizeKey(event.address);
    const cachedVenue = cache[cacheKey];

    if (cachedVenue) {
      event.latitude = cachedVenue.latitude;
      event.longitude = cachedVenue.longitude;
      event.address = event.address ?? cachedVenue.address ?? cachedVenue.displayName;
      continue;
    }

    try {
      const result = await geocodeAddress(`${event.address}, Berlin`);
      if (result) {
        cache[cacheKey] = result;
        event.latitude = result.latitude;
        event.longitude = result.longitude;
        geocodedCount += 1;
      }
    } catch (error) {
      console.error(`Failed to geocode "${event.address}"`, error);
    }

    await delay(1100);
  }

  await fs.writeFile(venuesPath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  await fs.writeFile(eventsPath, `${JSON.stringify(events, null, 2)}\n`, 'utf8');

  console.log(
    `Updated ${geocodedCount} venue coordinates, reverse geocoded ${reverseGeocodedCount} addresses, and rewrote public/data/events.json`,
  );
}

void main();
