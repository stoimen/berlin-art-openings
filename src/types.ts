export type EventSource =
  | 'indexberlin'
  | 'artatberlin'
  | 'berlinartlink'
  | 'artrabbit'
  | 'berlin_de'
  | 'visitberlin'
  | 'kunstkalender'
  | 'manual';

export type ArtEvent = {
  id: string;
  title: string;
  artist?: string;
  venue: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  openingStart?: string;
  openingEnd?: string;
  exhibitionStart?: string;
  exhibitionEnd?: string;
  eventType: 'opening' | 'exhibition' | 'talk' | 'performance' | 'screening' | 'other';
  source: EventSource;
  sourceUrl: string;
  description?: string;
  imageUrl?: string;
  tags?: string[];
  lastUpdated: string;
};

export type LocationPermissionStatus =
  | 'idle'
  | 'prompt'
  | 'loading'
  | 'granted'
  | 'denied'
  | 'error'
  | 'unsupported';

export type FilterState = {
  timeframe: TimeframeFilter;
  openingsOnly: boolean;
  savedOnly: boolean;
  search: string;
  source: 'all' | EventSource;
  maxDistanceKm: 'all' | number;
};

export type TimeframeFilter = 'all' | 'day-0' | 'day-1' | 'day-2' | 'day-3' | 'day-4' | 'week';

export type DisplayEvent = ArtEvent & {
  distanceKm?: number;
  isFavorite: boolean;
};
