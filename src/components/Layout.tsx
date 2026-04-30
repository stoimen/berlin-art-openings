import type { ReactNode } from 'react';
import type { LocationPermissionStatus } from '../types';
import { formatDateTime } from '../utils/date';

type LayoutProps = {
  children: ReactNode;
  totalEvents: number;
  nearbyCount: number;
  favoriteCount: number;
  locationEnabled: boolean;
  locationStatus: LocationPermissionStatus;
  lastUpdated?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onRequestLocation: () => void;
};

function getLocationActionLabel(status: LocationPermissionStatus) {
  switch (status) {
    case 'granted':
      return 'Refresh location';
    case 'loading':
      return 'Locating';
    default:
      return 'Use my location';
  }
}

export function Layout({
  children,
  totalEvents,
  nearbyCount,
  favoriteCount,
  locationEnabled,
  locationStatus,
  lastUpdated,
  isRefreshing,
  onRefresh,
  onRequestLocation,
}: LayoutProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <p className="eyebrow">Berlin Art Calendar</p>
          <h1>Berlin Art</h1>
          <p className="lead">
            Upcoming exhibition openings, talks, screenings, and museum nights. Share your location to prioritize
            nearby galleries.
          </p>
        </div>

        <div className="hero-panel" aria-label="App summary">
          <div className="hero-stat hero-stat-nearby">
            <p className="hero-label">Near me</p>
            <strong>{locationEnabled ? `${nearbyCount} events with distance` : 'Enable location'}</strong>
          </div>
          <div className="hero-stat hero-stat-upcoming">
            <p className="hero-label">Upcoming</p>
            <strong>{totalEvents} events loaded</strong>
          </div>
          <div className="hero-stat hero-stat-saved">
            <p className="hero-label">Saved</p>
            <strong>{favoriteCount} shortlisted</strong>
          </div>
          <button
            type="button"
            className={`icon-circle-button mobile-location-button${locationEnabled ? ' active' : ''}`}
            onClick={onRequestLocation}
            disabled={locationStatus === 'loading'}
            aria-label={getLocationActionLabel(locationStatus)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2c.55 0 1 .45 1 1v1.07A8.01 8.01 0 0 1 19.93 11H21a1 1 0 1 1 0 2h-1.07A8.01 8.01 0 0 1 13 19.93V21a1 1 0 1 1-2 0v-1.07A8.01 8.01 0 0 1 4.07 13H3a1 1 0 1 1 0-2h1.07A8.01 8.01 0 0 1 11 4.07V3c0-.55.45-1 1-1Zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
            </svg>
          </button>
          <button
            type="button"
            className="refresh-button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? 'Refreshing events' : 'Refresh events'}
          >
            <svg className="refresh-button-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z" />
            </svg>
            <span className="refresh-button-label">{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
          <p className="update-stamp hero-update-stamp">
            {lastUpdated ? `Last updated ${formatDateTime(lastUpdated)}` : 'Last updated timestamp unavailable'}
          </p>
        </div>
      </header>

      <main>{children}</main>

      <footer className="app-footer">
        <p>Built as a static React + Vite PWA for GitHub Pages with optional local import scripts.</p>
      </footer>
    </div>
  );
}
