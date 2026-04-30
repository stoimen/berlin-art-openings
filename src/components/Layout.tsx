import type { ReactNode } from 'react';
import type { LocationPermissionStatus } from '../types';
import { formatDateTime } from '../utils/date';
import { useI18n } from '../i18n-context';

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
  const { locale, setLocale, copy, getLanguageName } = useI18n();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <div className="brand-head">
            <p className="eyebrow">{copy.appEyebrow}</p>
            <div className="language-toggle" role="group" aria-label={copy.languageToggleLabel}>
              <button
                type="button"
                className={locale === 'en' ? 'language-toggle-button active' : 'language-toggle-button'}
                onClick={() => setLocale('en')}
                aria-pressed={locale === 'en'}
                title={getLanguageName('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={locale === 'de' ? 'language-toggle-button active' : 'language-toggle-button'}
                onClick={() => setLocale('de')}
                aria-pressed={locale === 'de'}
                title={getLanguageName('de')}
              >
                DE
              </button>
            </div>
          </div>
          <h1>Berlin Art</h1>
          <p className="lead">{copy.introLead}</p>
        </div>

        <div className="hero-panel" aria-label={copy.hero.ariaLabel}>
          <div className="hero-stat hero-stat-nearby">
            <p className="hero-label">{copy.hero.nearMe}</p>
            <strong>{locationEnabled ? copy.hero.eventsWithDistance(nearbyCount) : copy.hero.enableLocation}</strong>
          </div>
          <div className="hero-stat hero-stat-upcoming">
            <p className="hero-label">{copy.hero.upcoming}</p>
            <strong>{copy.hero.eventsLoaded(totalEvents)}</strong>
          </div>
          <div className="hero-stat hero-stat-saved">
            <p className="hero-label">{copy.hero.saved}</p>
            <strong>{copy.hero.shortlisted(favoriteCount)}</strong>
          </div>
          <button
            type="button"
            className={`icon-circle-button mobile-location-button${locationEnabled ? ' active' : ''}`}
            onClick={onRequestLocation}
            disabled={locationStatus === 'loading'}
            aria-label={copy.location.actionLabel(locationStatus)}
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
            aria-label={isRefreshing ? copy.hero.refreshingEvents : copy.hero.refreshEvents}
          >
            <svg className="refresh-button-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z" />
            </svg>
            <span className="refresh-button-label">{isRefreshing ? copy.hero.refreshing : copy.hero.refresh}</span>
          </button>
          <p className="update-stamp hero-update-stamp">
            {lastUpdated ? copy.hero.lastUpdated(formatDateTime(lastUpdated, locale)) : copy.hero.lastUpdatedUnavailable}
          </p>
        </div>
      </header>

      <main>{children}</main>

      <footer className="app-footer">
        <p>{copy.footer}</p>
      </footer>
    </div>
  );
}
