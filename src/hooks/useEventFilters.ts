import { useDeferredValue, useState } from 'react';
import type { ArtEvent, DisplayEvent, FilterState, LocationPermissionStatus } from '../types';
import { sourceReliability } from '../api/events';
import { haversineDistanceKm } from '../utils/distance';
import { getEventAnchorDate, isUpcomingEvent, matchesTimeframe } from '../utils/date';

type LocationSnapshot = {
  status: LocationPermissionStatus;
  latitude?: number;
  longitude?: number;
};

export const defaultFilters: FilterState = {
  timeframe: 'all',
  openingsOnly: true,
  savedOnly: false,
  search: '',
  source: 'all',
  maxDistanceKm: 'all',
};

function hasCoordinates(event: ArtEvent): event is ArtEvent & { latitude: number; longitude: number } {
  return typeof event.latitude === 'number' && typeof event.longitude === 'number';
}

function compareByDate(left: DisplayEvent, right: DisplayEvent) {
  return (
    getEventAnchorDate(left).getTime() - getEventAnchorDate(right).getTime() ||
    sourceReliability[left.source] - sourceReliability[right.source] ||
    left.title.localeCompare(right.title)
  );
}

function compareByNearbyScore(left: DisplayEvent, right: DisplayEvent) {
  const leftDistance = left.distanceKm ?? Number.POSITIVE_INFINITY;
  const rightDistance = right.distanceKm ?? Number.POSITIVE_INFINITY;

  return (
    getEventAnchorDate(left).getTime() - getEventAnchorDate(right).getTime() ||
    leftDistance - rightDistance ||
    sourceReliability[left.source] - sourceReliability[right.source] ||
    left.title.localeCompare(right.title)
  );
}

export function useEventFilters(events: ArtEvent[], favoriteIds: string[], location: LocationSnapshot) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const deferredSearch = useDeferredValue(filters.search.trim().toLowerCase());

  const locationGranted =
    location.status === 'granted' && location.latitude !== undefined && location.longitude !== undefined;

  const displayedEvents = events
    .filter((event) => isUpcomingEvent(event))
    .map<DisplayEvent>((event) => ({
      ...event,
      distanceKm:
        location.status === 'granted' &&
        location.latitude !== undefined &&
        location.longitude !== undefined &&
        hasCoordinates(event)
          ? haversineDistanceKm(location.latitude, location.longitude, event.latitude, event.longitude)
          : undefined,
      isFavorite: favoriteIds.includes(event.id),
    }))
    .filter((event) => {
      if (filters.openingsOnly && event.eventType !== 'opening') return false;
      if (filters.savedOnly && !event.isFavorite) return false;
      if (!matchesTimeframe(event, filters.timeframe)) return false;
      if (filters.source !== 'all' && event.source !== filters.source) return false;
      if (filters.maxDistanceKm !== 'all' && (event.distanceKm === undefined || event.distanceKm > filters.maxDistanceKm)) {
        return false;
      }
      if (!deferredSearch) return true;

      const searchableText = [event.title, event.artist, event.venue, event.address, event.description, ...(event.tags ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(deferredSearch);
    })
    .sort(locationGranted ? compareByNearbyScore : compareByDate);

  const hasFiltersApplied =
    filters.timeframe !== 'all' ||
    filters.openingsOnly ||
    filters.savedOnly ||
    filters.search.trim().length > 0 ||
    filters.source !== 'all' ||
    filters.maxDistanceKm !== 'all';

  function resetFilters() {
    setFilters(defaultFilters);
  }

  return { filters, setFilters, resetFilters, displayedEvents, hasFiltersApplied };
}
