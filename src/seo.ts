import type { ArtEvent } from './types';
import { getEventAnchorDate, isUpcomingEvent } from './utils/date';

const DEFAULT_SITE_URL = 'https://stoimen.github.io/berlin-art-openings/';
const MAX_STRUCTURED_DATA_EVENTS = 24;

export const SITE_TITLE = 'Berlin Art Openings';
export const SITE_DESCRIPTION =
  'Berlin art openings, exhibitions, and nearby gallery listings with dates, venues, and shareable links.';
export const DEFAULT_SOCIAL_IMAGE_PATH = 'social-card.svg';

function sortByAnchorDate(left: ArtEvent, right: ArtEvent) {
  return getEventAnchorDate(left).getTime() - getEventAnchorDate(right).getTime() || left.title.localeCompare(right.title);
}

export function getSiteUrl() {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_URL;
  }

  return new URL(import.meta.env.BASE_URL, window.location.origin).toString();
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, getSiteUrl()).toString();
}

function buildEventUrl(eventId: string) {
  const url = new URL(getSiteUrl());
  url.hash = eventId;
  return url.toString();
}

function getStartDate(event: ArtEvent) {
  return event.openingStart ?? event.exhibitionStart;
}

function getEndDate(event: ArtEvent) {
  return event.openingEnd ?? event.exhibitionEnd;
}

function buildKeywords(event: ArtEvent) {
  return [...new Set([event.eventType, ...(event.tags ?? [])])].join(', ');
}

function buildEventStructuredData(event: ArtEvent) {
  const startDate = getStartDate(event);

  if (!startDate) {
    return undefined;
  }

  const location: Record<string, unknown> = {
    '@type': 'Place',
    name: event.venue,
  };

  if (event.address) {
    location.address = event.address;
  }

  if (typeof event.latitude === 'number' && typeof event.longitude === 'number') {
    location.geo = {
      '@type': 'GeoCoordinates',
      latitude: event.latitude,
      longitude: event.longitude,
    };
  }

  const structuredEvent: Record<string, unknown> = {
    '@type': 'Event',
    '@id': `${buildEventUrl(event.id)}#event`,
    name: event.title,
    startDate,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location,
    url: buildEventUrl(event.id),
    mainEntityOfPage: buildEventUrl(event.id),
    organizer: {
      '@type': 'Organization',
      name: event.venue,
    },
    keywords: buildKeywords(event),
  };

  const endDate = getEndDate(event);
  if (endDate) {
    structuredEvent.endDate = endDate;
  }

  if (event.description) {
    structuredEvent.description = event.description;
  }

  if (event.imageUrl) {
    structuredEvent.image = [event.imageUrl];
  }

  if (event.artist) {
    structuredEvent.performer = {
      '@type': 'Person',
      name: event.artist,
    };
  }

  return structuredEvent;
}

export function buildEventsStructuredData(events: ArtEvent[]) {
  const upcomingEvents = events
    .filter((event) => isUpcomingEvent(event))
    .sort(sortByAnchorDate)
    .slice(0, MAX_STRUCTURED_DATA_EVENTS)
    .map((event) => buildEventStructuredData(event))
    .filter((event): event is Record<string, unknown> => Boolean(event));

  if (upcomingEvents.length === 0) {
    return undefined;
  }

  const siteUrl = getSiteUrl();
  const socialImageUrl = buildAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH);

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}#website`,
        url: siteUrl,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${siteUrl}#webpage`,
        url: siteUrl,
        name: SITE_TITLE,
        description: SITE_DESCRIPTION,
        isPartOf: {
          '@id': `${siteUrl}#website`,
        },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: socialImageUrl,
        },
        mainEntity: {
          '@id': `${siteUrl}#event-list`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${siteUrl}#event-list`,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: upcomingEvents.length,
        itemListElement: upcomingEvents.map((event, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: event,
        })),
      },
      ...upcomingEvents,
    ],
  };
}

export function syncStaticMetaTags() {
  if (typeof document === 'undefined') {
    return;
  }

  const siteUrl = getSiteUrl();
  const socialImageUrl = buildAbsoluteUrl(DEFAULT_SOCIAL_IMAGE_PATH);

  const tagUpdates: Array<[selector: string, attribute: 'content' | 'href', value: string]> = [
    ['link[rel="canonical"]', 'href', siteUrl],
    ['meta[property="og:url"]', 'content', siteUrl],
    ['meta[property="og:image"]', 'content', socialImageUrl],
    ['meta[name="twitter:image"]', 'content', socialImageUrl],
  ];

  for (const [selector, attribute, value] of tagUpdates) {
    const element = document.head.querySelector(selector);
    if (element) {
      element.setAttribute(attribute, value);
    }
  }
}

export function syncEventStructuredData(events: ArtEvent[]) {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const scriptId = 'event-structured-data';
  const structuredData = buildEventsStructuredData(events);
  const existingScript = document.getElementById(scriptId);

  if (!structuredData) {
    existingScript?.remove();
    return () => undefined;
  }

  const scriptElement = existingScript ?? document.createElement('script');
  scriptElement.id = scriptId;
  scriptElement.setAttribute('type', 'application/ld+json');
  scriptElement.textContent = JSON.stringify(structuredData);

  if (!scriptElement.parentNode) {
    document.head.appendChild(scriptElement);
  }

  return () => {
    const currentScript = document.getElementById(scriptId);
    if (currentScript === scriptElement) {
      currentScript.remove();
    }
  };
}
