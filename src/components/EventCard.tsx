import type { DisplayEvent } from '../types';
import { sourceLabels } from '../api/events';
import { formatDistance } from '../utils/distance';
import { formatDateRange, formatOpeningWindow } from '../utils/date';
import { downloadEventIcs } from '../utils/ics';

type EventCardProps = {
  event: DisplayEvent;
  onToggleFavorite: (eventId: string) => void;
};

function buildMapsUrl(event: DisplayEvent) {
  const locationQuery = event.address ? `${event.venue}, ${event.address}` : event.venue;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
}

export function EventCard({ event, onToggleFavorite }: EventCardProps) {
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
            <dd>{formatDistance(event.distanceKm)}</dd>
          </div>
        </dl>

        {event.description ? <p className="event-description">{event.description}</p> : null}
      </div>

      <div className="event-actions">
        <button type="button" className="ghost-button" onClick={() => downloadEventIcs(event)}>
          Add to calendar
        </button>
        <a className="ghost-button" href={buildMapsUrl(event)} target="_blank" rel="noreferrer">
          Open in Google Maps
        </a>
        <a className="ghost-button" href={event.sourceUrl} target="_blank" rel="noreferrer">
          View source
        </a>
      </div>
    </article>
  );
}
