import { Component, type ErrorInfo, type ReactNode } from 'react';

type EventCardBoundaryProps = {
  children: ReactNode;
  eventId: string;
};

type EventCardBoundaryState = {
  hasError: boolean;
};

function EventCardSkeleton() {
  return (
    <article className="event-card event-card-skeleton" aria-live="polite">
      <div className="event-card-image-wrap skeleton-block" aria-hidden="true" />

      <div className="event-card-header">
        <div className="tag-row" aria-hidden="true">
          <span className="tag skeleton-pill" />
          <span className="tag skeleton-pill skeleton-pill-wide" />
        </div>
        <span className="icon-circle-button skeleton-icon" aria-hidden="true" />
      </div>

      <div className="event-card-body">
        <div className="skeleton-copy" aria-hidden="true">
          <span className="skeleton-line skeleton-line-short" />
          <span className="skeleton-line skeleton-line-title" />
          <span className="skeleton-line skeleton-line-medium" />
        </div>

        <div className="event-meta event-meta-skeleton" aria-hidden="true">
          <div>
            <span className="skeleton-line skeleton-line-label" />
            <span className="skeleton-line skeleton-line-medium" />
          </div>
          <div>
            <span className="skeleton-line skeleton-line-label" />
            <span className="skeleton-line skeleton-line-long" />
          </div>
          <div>
            <span className="skeleton-line skeleton-line-label" />
            <span className="skeleton-line skeleton-line-short" />
          </div>
        </div>
      </div>

      <p className="skeleton-message">This event card could not be displayed.</p>
    </article>
  );
}

export class EventCardBoundary extends Component<EventCardBoundaryProps, EventCardBoundaryState> {
  state: EventCardBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Event card failed to render: ${this.props.eventId}`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <EventCardSkeleton />;
    }

    return this.props.children;
  }
}
