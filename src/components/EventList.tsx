import type { DisplayEvent } from '../types';
import { groupEventsByDate } from '../utils/date';
import { EventCard } from './EventCard';

type EventListProps = {
  events: DisplayEvent[];
  onToggleFavorite: (eventId: string) => void;
};

export function EventList({ events, onToggleFavorite }: EventListProps) {
  const groups = groupEventsByDate(events);

  return (
    <div className="event-groups">
      {groups.map((group) => (
        <section key={group.key} className="event-group" aria-labelledby={`group-${group.key}`}>
          <div className="group-heading">
            <p className="eyebrow">Date</p>
            <h2 id={`group-${group.key}`}>{group.label}</h2>
          </div>
          <div className="event-stack">
            {group.events.map((event) => (
              <EventCard key={event.id} event={event} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
