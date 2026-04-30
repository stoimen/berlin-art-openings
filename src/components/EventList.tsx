import type { DisplayEvent } from '../types';
import { useI18n } from '../i18n-context';
import { groupEventsByDate } from '../utils/date';
import { EventCardBoundary } from './EventCardBoundary';
import { EventCard } from './EventCard';

type EventListProps = {
  events: DisplayEvent[];
  locationEnabled: boolean;
  onToggleFavorite: (eventId: string) => void;
};

export function EventList({ events, locationEnabled, onToggleFavorite }: EventListProps) {
  const { locale, copy } = useI18n();
  const groups = groupEventsByDate(events, locale);

  return (
    <div className="event-groups">
      {groups.map((group) => (
        <section key={group.key} className="event-group" aria-labelledby={`group-${group.key}`}>
          <div className="group-heading">
            <p className="eyebrow">{copy.eventList.groupEyebrow}</p>
            <h2 id={`group-${group.key}`}>{group.label}</h2>
          </div>
          <div className="event-stack">
            {group.events.map((event) => (
              <EventCardBoundary key={event.id} eventId={event.id}>
                <EventCard
                  event={event}
                  locationEnabled={locationEnabled}
                  onToggleFavorite={onToggleFavorite}
                />
              </EventCardBoundary>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
