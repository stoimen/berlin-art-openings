import { startTransition, useEffect, useRef, useState } from 'react';
import { loadEvents } from './api/events';
import { EmptyState } from './components/EmptyState';
import { ErrorState } from './components/ErrorState';
import { EventList } from './components/EventList';
import { Filters } from './components/Filters';
import { Layout } from './components/Layout';
import { LocationPermission } from './components/LocationPermission';
import { FAVORITES_STORAGE_KEY } from './constants';
import { useEventFilters } from './hooks/useEventFilters';
import { useGeolocation } from './hooks/useGeolocation';
import { I18nProvider, useI18n } from './i18n-context';
import { translateLoadErrorMessage } from './i18n';
import { syncEventStructuredData, syncStaticMetaTags } from './seo';
import type { ArtEvent } from './types';

function readDeepLinkedEventId() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const hashValue = window.location.hash.slice(1).trim();
  if (!hashValue) {
    return undefined;
  }

  try {
    return decodeURIComponent(hashValue);
  } catch {
    return hashValue;
  }
}

function clearDeepLinkedEventId() {
  if (typeof window === 'undefined' || !window.location.hash) {
    return;
  }

  const url = new URL(window.location.href);
  url.hash = '';
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
}

function readFavoriteIds() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = rawValue ? (JSON.parse(rawValue) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch {
    return [];
  }
}

function AppContent() {
  const { locale, copy } = useI18n();
  const [events, setEvents] = useState<ArtEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [refreshTick, setRefreshTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readFavoriteIds);
  const [deepLinkedEventId, setDeepLinkedEventId] = useState<string | undefined>(readDeepLinkedEventId);
  const scrolledDeepLinkRef = useRef<string | undefined>(undefined);

  const { status, latitude, longitude, errorMessage: locationError, requestLocation } = useGeolocation();
  const location = { status, latitude, longitude };

  const { filters, setFilters, resetFilters, displayedEvents, hasFiltersApplied } = useEventFilters(
    events,
    favoriteIds,
    location,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setErrorMessage(undefined);

      try {
        const result = await loadEvents({
          signal: controller.signal,
          bustCache: refreshTick > 0,
        });
        setEvents(result.events);
        setLastUpdated(result.lastUpdated);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : 'Unknown error while loading events.',
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => controller.abort();
  }, [refreshTick]);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    function handleHashChange() {
      scrolledDeepLinkRef.current = undefined;
      setDeepLinkedEventId(readDeepLinkedEventId());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    syncStaticMetaTags();
  }, []);

  useEffect(() => syncEventStructuredData(events), [events]);

  useEffect(() => {
    if (!deepLinkedEventId) {
      return;
    }

    const deepLinkedEvent = events.find((event) => event.id === deepLinkedEventId);
    if (!deepLinkedEvent || deepLinkedEvent.eventType === 'opening') {
      return;
    }

    setFilters((current) => (current.openingsOnly ? { ...current, openingsOnly: false } : current));
  }, [deepLinkedEventId, events, setFilters]);

  useEffect(() => {
    if (!deepLinkedEventId) {
      scrolledDeepLinkRef.current = undefined;
      return;
    }

    if (scrolledDeepLinkRef.current === deepLinkedEventId) {
      return;
    }

    if (!displayedEvents.some((event) => event.id === deepLinkedEventId)) {
      return;
    }

    const targetElement = document.getElementById(deepLinkedEventId);
    if (!targetElement) {
      return;
    }

    scrolledDeepLinkRef.current = deepLinkedEventId;

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

    window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({ block: 'start', behavior });
      if (targetElement instanceof HTMLElement) {
        targetElement.focus({ preventScroll: true });
      }
    });
  }, [deepLinkedEventId, displayedEvents]);

  function handleRefresh() {
    scrolledDeepLinkRef.current = undefined;
    setDeepLinkedEventId(undefined);
    clearDeepLinkedEventId();

    startTransition(() => {
      setRefreshTick((current) => current + 1);
    });
  }

  function handleToggleFavorite(eventId: string) {
    setFavoriteIds((current) =>
      current.includes(eventId) ? current.filter((favoriteId) => favoriteId !== eventId) : [...current, eventId],
    );
  }

  const nearbyCount = displayedEvents.filter((event) => event.distanceKm !== undefined).length;
  const locationEnabled = status === 'granted' && latitude !== undefined && longitude !== undefined;

  return (
    <Layout
      totalEvents={events.length}
      nearbyCount={nearbyCount}
      favoriteCount={favoriteIds.length}
      locationEnabled={locationEnabled}
      locationStatus={status}
      lastUpdated={lastUpdated}
      isRefreshing={loading && events.length > 0}
      onRefresh={handleRefresh}
      onRequestLocation={requestLocation}
    >
      <LocationPermission status={status} errorMessage={locationError} onRequest={requestLocation} />

      <Filters value={filters} hasLocation={status === 'granted'} onChange={setFilters} onReset={resetFilters} />

      {loading && events.length === 0 ? (
        <section className="state-panel" aria-live="polite">
          <h2>{copy.loadingState.title}</h2>
          <p>
            {copy.loadingState.description} <code>/data/events.json</code>.
          </p>
        </section>
      ) : null}

      {errorMessage ? <ErrorState message={translateLoadErrorMessage(errorMessage, locale)} onRetry={handleRefresh} /> : null}

      {!errorMessage && !loading && displayedEvents.length === 0 ? (
        <EmptyState hasFilters={hasFiltersApplied} savedOnly={filters.savedOnly} favoriteCount={favoriteIds.length} />
      ) : null}

      {!errorMessage && displayedEvents.length > 0 ? (
        <EventList events={displayedEvents} locationEnabled={locationEnabled} onToggleFavorite={handleToggleFavorite} />
      ) : null}
    </Layout>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
