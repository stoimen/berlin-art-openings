import { useState } from 'react';
import type { ReactNode } from 'react';
import { formatDateTime } from '../utils/date';

type LayoutProps = {
  children: ReactNode;
  totalEvents: number;
  nearbyCount: number;
  favoriteCount: number;
  locationEnabled: boolean;
  lastUpdated?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function Layout({
  children,
  totalEvents,
  nearbyCount,
  favoriteCount,
  locationEnabled,
  lastUpdated,
  isRefreshing,
  onRefresh,
}: LayoutProps) {
  const [headerOpen, setHeaderOpen] = useState(false);

  return (
    <div className="app-shell">
      <header className={`app-header${headerOpen ? ' app-header--open' : ''}`}>
        <div className="brand-block">
          <div className="brand-title-row">
            <h1>Berlin Art</h1>
            <button
              type="button"
              className="header-toggle"
              aria-expanded={headerOpen}
              aria-label={headerOpen ? 'Collapse header' : 'Expand header'}
              onClick={() => setHeaderOpen((o) => !o)}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          <div className="brand-details">
            <div className="brand-details-inner">
              <p className="eyebrow">Berlin Art Calendar</p>
              <p className="lead">
                Upcoming exhibition openings, talks, screenings, and museum nights. Share your location to prioritize
                nearby galleries.
              </p>
            </div>
          </div>
        </div>

        <div className="hero-panel-wrap">
          <div className="hero-panel" aria-label="App summary">
            <div>
              <p className="hero-label">Near me</p>
              <strong>{locationEnabled ? `${nearbyCount} events with distance` : 'Enable location'}</strong>
            </div>
            <div>
              <p className="hero-label">Upcoming</p>
              <strong>{totalEvents} events loaded</strong>
            </div>
            <div>
              <p className="hero-label">Saved</p>
              <strong>{favoriteCount} shortlisted</strong>
            </div>
            <button type="button" className="refresh-button" onClick={onRefresh} disabled={isRefreshing}>
              {isRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <p className="update-stamp">
              {lastUpdated ? `Last updated ${formatDateTime(lastUpdated)}` : 'Last updated timestamp unavailable'}
            </p>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="app-footer">
        <p>Built as a static React + Vite PWA for GitHub Pages with optional local import scripts.</p>
      </footer>
    </div>
  );
}
