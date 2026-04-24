import type { DisplayEvent } from '../types';
import { sourceLabels } from '../api/events';
import { formatDistance } from '../utils/distance';
import { formatDateRange, formatOpeningWindow } from '../utils/date';
import { downloadEventIcs } from '../utils/ics';

type EventCardProps = {
  event: DisplayEvent;
  locationEnabled: boolean;
  onToggleFavorite: (eventId: string) => void;
};

function buildMapsUrl(event: DisplayEvent) {
  const locationQuery = event.address ? `${event.venue}, ${event.address}` : event.venue;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
}

export function EventCard({ event, locationEnabled, onToggleFavorite }: EventCardProps) {
  const tagList = event.tags?.length ? event.tags : [event.eventType];

  return (
    <article className="event-card">
      <div className="event-card-header">
        <div className="tag-row" aria-label="Event tags">
          {tagList.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
          {event.distanceKm !== undefined && event.distanceKm <= 3 ? <span className="tag nearby">Near you</span> : null}
        </div>

        <button
          type="button"
          className={event.isFavorite ? 'favorite-button active' : 'favorite-button'}
          aria-pressed={event.isFavorite}
          onClick={() => onToggleFavorite(event.id)}
        >
          {event.isFavorite ? 'Saved' : 'Save'}
        </button>
      </div>

      <div className="event-card-body">
        <div>
          <p className="event-source">{sourceLabels[event.source]}</p>
          <h3>{event.title}</h3>
          {event.artist ? <p className="artist-line">{event.artist}</p> : null}
        </div>

        <dl className="event-meta">
          <div>
            <dt>Venue</dt>
            <dd>{event.venue}</dd>
          </div>
          <div>
            <dt>Address</dt>
            <dd>{event.address ?? 'Address TBA'}</dd>
          </div>
          <div>
            <dt>Opening</dt>
            <dd>{formatOpeningWindow(event)}</dd>
          </div>
          <div>
            <dt>Exhibition</dt>
            <dd>{formatDateRange(event.exhibitionStart, event.exhibitionEnd)}</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd>
              {formatDistance(event.distanceKm, {
                locationEnabled,
                hasCoordinates: typeof event.latitude === 'number' && typeof event.longitude === 'number',
              })}
            </dd>
          </div>
        </dl>

        {event.description ? <p className="event-description">{event.description}</p> : null}
      </div>

      <div className="event-actions">
        <button type="button" className="ghost-button" onClick={() => downloadEventIcs(event)}>
          Add to calendar
        </button>
        <a
          className="map-circle-button"
          href={buildMapsUrl(event)}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${event.venue} in Google Maps`}
          title="Open in Google Maps"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21C10.8 19.5 6 13.6 6 10a6 6 0 1 1 12 0c0 3.6-4.8 9.5-6 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </a>
        <a className="ghost-button" href={event.sourceUrl} target="_blank" rel="noreferrer">
          View source
        </a>
      </div>
    </article>
  );
}
