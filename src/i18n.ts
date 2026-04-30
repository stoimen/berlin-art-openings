import type { ArtEvent, LocationPermissionStatus } from './types';

export type Locale = 'en' | 'de';

export const LOCALE_STORAGE_KEY = 'berlin-art-openings-locale';

const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
};

export function getLocaleName(locale: Locale) {
  return localeNames[locale];
}

export function getIntlLocale(locale: Locale) {
  return locale === 'de' ? 'de-DE' : 'en-GB';
}

export function detectPreferredLocale() {
  if (typeof window === 'undefined') {
    return 'en' as Locale;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (storedLocale === 'en' || storedLocale === 'de') {
    return storedLocale;
  }

  return window.navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function extractStatusCode(message: string) {
  const match = message.match(/\((\d{3})\)$/);
  return match?.[1];
}

export function translateLoadErrorMessage(message: string, locale: Locale) {
  if (message === 'Unknown error while loading events.') {
    return locale === 'de' ? 'Unbekannter Fehler beim Laden der Termine.' : message;
  }

  if (!message.startsWith('Failed to load events.json')) {
    return message;
  }

  const statusCode = extractStatusCode(message);

  if (locale === 'de') {
    return statusCode
      ? `events.json konnte nicht geladen werden (${statusCode})`
      : 'events.json konnte nicht geladen werden';
  }

  return statusCode ? `Failed to load events.json (${statusCode})` : 'Failed to load events.json';
}

const translatedEventTypes: Record<Locale, Record<ArtEvent['eventType'], string>> = {
  en: {
    opening: 'Opening',
    exhibition: 'Exhibition',
    talk: 'Talk',
    performance: 'Performance',
    screening: 'Screening',
    other: 'Other',
  },
  de: {
    opening: 'Eröffnung',
    exhibition: 'Ausstellung',
    talk: 'Gespräch',
    performance: 'Performance',
    screening: 'Screening',
    other: 'Sonstiges',
  },
};

export function translateEventType(eventType: ArtEvent['eventType'], locale: Locale) {
  return translatedEventTypes[locale][eventType];
}

export function translateTagLabel(tag: string, locale: Locale) {
  const normalizedTag = tag.trim().toLowerCase();

  switch (normalizedTag) {
    case 'opening':
      return translateEventType('opening', locale);
    case 'exhibition':
      return translateEventType('exhibition', locale);
    case 'talk':
      return translateEventType('talk', locale);
    case 'performance':
      return translateEventType('performance', locale);
    case 'screening':
      return translateEventType('screening', locale);
    case 'other':
      return translateEventType('other', locale);
    default:
      return tag;
  }
}

type TranslationSet = {
  htmlLang: string;
  documentTitle: string;
  languageToggleLabel: string;
  appEyebrow: string;
  introLead: string;
  hero: {
    ariaLabel: string;
    nearMe: string;
    upcoming: string;
    saved: string;
    enableLocation: string;
    eventsWithDistance: (count: number) => string;
    eventsLoaded: (count: number) => string;
    shortlisted: (count: number) => string;
    refresh: string;
    refreshing: string;
    refreshEvents: string;
    refreshingEvents: string;
    lastUpdated: (value: string) => string;
    lastUpdatedUnavailable: string;
  };
  footer: string;
  filters: {
    eyebrow: string;
    title: string;
    reset: string;
    dates: string;
    search: string;
    searchPlaceholder: string;
    source: string;
    allSources: string;
    maxDistance: string;
    anyDistance: string;
    openingsOnly: string;
    savedOnly: string;
  };
  location: {
    eyebrow: string;
    title: string;
    enableLocation: string;
    granted: string;
    loading: string;
    denied: string;
    errorFallback: string;
    unsupported: string;
    prompt: string;
    refresh: string;
    locating: string;
    useMyLocation: string;
    actionLabel: (status: LocationPermissionStatus) => string;
  };
  emptyState: {
    title: string;
    savedWithFilters: string;
    savedEmpty: string;
    filtersOnly: string;
    datasetEmpty: string;
  };
  errorState: {
    title: string;
    retry: string;
  };
  loadingState: {
    title: string;
    description: string;
  };
  eventList: {
    groupEyebrow: string;
  };
  eventCard: {
    tagsAriaLabel: string;
    nearYou: string;
    removeFavorite: string;
    saveFavorite: string;
    shareCopied: string;
    shareError: string;
    share: string;
    venue: string;
    address: string;
    opening: string;
    exhibition: string;
    distance: string;
    addToCalendar: string;
    openInMaps: string;
    openVenueInMaps: (venue: string) => string;
    openSourcePageInNewTab: string;
    openSourcePage: string;
    fallback: string;
    shareTextWithArtist: (title: string, artist: string) => string;
    shareTextWithVenue: (title: string, venue: string) => string;
  };
  timeframe: {
    all: string;
    week: string;
    weekdayLabels: readonly string[];
  };
  dates: {
    timeTba: string;
    datesTba: string;
    openingTimeTba: string;
    dateTba: string;
    rangeSeparator: string;
  };
  distance: {
    shareLocation: string;
    coordinatesUnavailable: string;
    distanceUnavailable: string;
    metersAway: (value: number) => string;
    kilometersAway: (value: string) => string;
  };
};

export const translations: Record<Locale, TranslationSet> = {
  en: {
    htmlLang: 'en',
    documentTitle: 'Berlin Art Openings',
    languageToggleLabel: 'Language',
    appEyebrow: 'Berlin Art Calendar',
    introLead:
      'Upcoming exhibition openings, talks, screenings, and museum nights. Share your location to prioritize nearby galleries.',
    hero: {
      ariaLabel: 'App summary',
      nearMe: 'Near me',
      upcoming: 'Upcoming',
      saved: 'Saved',
      enableLocation: 'Enable location',
      eventsWithDistance: (count) => `${count} events with distance`,
      eventsLoaded: (count) => `${count} events loaded`,
      shortlisted: (count) => `${count} shortlisted`,
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      refreshEvents: 'Refresh events',
      refreshingEvents: 'Refreshing events',
      lastUpdated: (value) => `Last updated ${value}`,
      lastUpdatedUnavailable: 'Last updated timestamp unavailable',
    },
    footer: 'Built as a static React + Vite PWA for GitHub Pages with optional local import scripts.',
    filters: {
      eyebrow: 'Filters',
      title: 'Focus the list',
      reset: 'Reset',
      dates: 'Dates',
      search: 'Search',
      searchPlaceholder: 'Artist, venue, neighborhood…',
      source: 'Source',
      allSources: 'All sources',
      maxDistance: 'Max distance',
      anyDistance: 'Any distance',
      openingsOnly: 'Openings only',
      savedOnly: 'Saved only',
    },
    location: {
      eyebrow: 'Location',
      title: 'Prioritize nearby galleries',
      enableLocation: 'Enable location',
      granted: 'Nearby ranking is active. Events with coordinates are sorted by date first, then by distance.',
      loading:
        'Checking your position. Your browser should show a location prompt if permission has not been decided yet.',
      denied:
        'Location access is off, so ranking falls back to date only. You can re-enable it in your browser settings.',
      errorFallback: 'Location lookup failed. You can keep using the app with date-based sorting.',
      unsupported: 'This browser does not expose geolocation. Nearby ranking is unavailable.',
      prompt: 'The app will ask for your location to emphasize nearby openings and enable distance filtering.',
      refresh: 'Refresh location',
      locating: 'Locating…',
      useMyLocation: 'Use my location',
      actionLabel: (status) => {
        switch (status) {
          case 'granted':
            return 'Refresh location';
          case 'loading':
            return 'Locating';
          default:
            return 'Use my location';
        }
      },
    },
    emptyState: {
      title: 'No matching events',
      savedWithFilters:
        'No saved events match the current filters. Try widening the date window, source selection, or distance filter.',
      savedEmpty: 'You have not saved any events yet. Use the bookmark button on an event card to build a shortlist.',
      filtersOnly: 'Try widening the date window, source selection, or distance filter.',
      datasetEmpty: 'The local dataset is empty right now. Refresh or update public/data/events.json.',
    },
    errorState: {
      title: 'Could not load events',
      retry: 'Retry',
    },
    loadingState: {
      title: 'Loading events',
      description: 'Reading the latest static dataset from',
    },
    eventList: {
      groupEyebrow: 'Date',
    },
    eventCard: {
      tagsAriaLabel: 'Event tags',
      nearYou: 'Near you',
      removeFavorite: 'Remove from favorites',
      saveFavorite: 'Save to favorites',
      shareCopied: 'Link copied',
      shareError: 'Could not share link',
      share: 'Share event',
      venue: 'Venue',
      address: 'Address',
      opening: 'Opening',
      exhibition: 'Exhibition',
      distance: 'Distance',
      addToCalendar: 'Add to calendar',
      openInMaps: 'Open in Google Maps',
      openVenueInMaps: (venue) => `Open ${venue} in Google Maps`,
      openSourcePageInNewTab: 'Open source page in a new tab',
      openSourcePage: 'Open source page',
      fallback: 'This event card could not be displayed.',
      shareTextWithArtist: (title, artist) => `${title} by ${artist}`,
      shareTextWithVenue: (title, venue) => `${title} at ${venue}`,
    },
    timeframe: {
      all: 'All',
      week: 'This week',
      weekdayLabels: ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'],
    },
    dates: {
      timeTba: 'Time TBA',
      datesTba: 'Dates TBA',
      openingTimeTba: 'Opening time TBA',
      dateTba: 'Date TBA',
      rangeSeparator: 'to',
    },
    distance: {
      shareLocation: 'Share location to calculate distance',
      coordinatesUnavailable: 'Venue coordinates unavailable',
      distanceUnavailable: 'Distance unavailable',
      metersAway: (value) => `${value} m away`,
      kilometersAway: (value) => `${value} km away`,
    },
  },
  de: {
    htmlLang: 'de',
    documentTitle: 'Berlin Art Eröffnungen',
    languageToggleLabel: 'Sprache',
    appEyebrow: 'Berliner Kunstkalender',
    introLead:
      'Kommende Ausstellungseröffnungen, Gespräche, Screenings und Museumsnächte. Teile deinen Standort, um nahe Galerien hervorzuheben.',
    hero: {
      ariaLabel: 'App-Überblick',
      nearMe: 'In der Nähe',
      upcoming: 'Demnächst',
      saved: 'Gespeichert',
      enableLocation: 'Standort aktivieren',
      eventsWithDistance: (count) => `${count} Termine mit Distanz`,
      eventsLoaded: (count) => `${count} Termine geladen`,
      shortlisted: (count) => `${count} gemerkt`,
      refresh: 'Aktualisieren',
      refreshing: 'Aktualisiere…',
      refreshEvents: 'Termine aktualisieren',
      refreshingEvents: 'Termine werden aktualisiert',
      lastUpdated: (value) => `Zuletzt aktualisiert ${value}`,
      lastUpdatedUnavailable: 'Zeitpunkt der letzten Aktualisierung nicht verfügbar',
    },
    footer: 'Gebaut als statische React- + Vite-PWA für GitHub Pages mit optionalen lokalen Importskripten.',
    filters: {
      eyebrow: 'Filter',
      title: 'Liste eingrenzen',
      reset: 'Zurücksetzen',
      dates: 'Daten',
      search: 'Suche',
      searchPlaceholder: 'Künstler:in, Ort, Kiez…',
      source: 'Quelle',
      allSources: 'Alle Quellen',
      maxDistance: 'Max. Distanz',
      anyDistance: 'Beliebige Distanz',
      openingsOnly: 'Nur Eröffnungen',
      savedOnly: 'Nur Gespeicherte',
    },
    location: {
      eyebrow: 'Standort',
      title: 'Nahe Galerien priorisieren',
      enableLocation: 'Standort aktivieren',
      granted:
        'Die Nähe-Sortierung ist aktiv. Termine mit Koordinaten werden zuerst nach Datum, dann nach Distanz sortiert.',
      loading:
        'Dein Standort wird geprüft. Falls noch keine Entscheidung vorliegt, sollte dein Browser einen Standortdialog anzeigen.',
      denied:
        'Der Standortzugriff ist deaktiviert, daher erfolgt die Sortierung nur nach Datum. Du kannst ihn in den Browser-Einstellungen wieder aktivieren.',
      errorFallback: 'Der Standort konnte nicht bestimmt werden. Du kannst die App weiterhin datumsbasiert nutzen.',
      unsupported: 'Dieser Browser unterstützt keine Geolokalisierung. Nähe-Sortierung ist nicht verfügbar.',
      prompt: 'Die App fragt nach deinem Standort, um nahe Eröffnungen hervorzuheben und Distanzfilter zu aktivieren.',
      refresh: 'Standort aktualisieren',
      locating: 'Standort wird gesucht…',
      useMyLocation: 'Meinen Standort nutzen',
      actionLabel: (status) => {
        switch (status) {
          case 'granted':
            return 'Standort aktualisieren';
          case 'loading':
            return 'Standort wird gesucht';
          default:
            return 'Meinen Standort nutzen';
        }
      },
    },
    emptyState: {
      title: 'Keine passenden Termine',
      savedWithFilters:
        'Keine gespeicherten Termine passen zu den aktuellen Filtern. Versuche ein größeres Datumsfenster, eine andere Quelle oder einen weiteren Distanzfilter.',
      savedEmpty:
        'Du hast noch keine Termine gespeichert. Nutze das Lesezeichen auf einer Termin-Karte, um dir eine Merkliste aufzubauen.',
      filtersOnly: 'Versuche ein größeres Datumsfenster, eine andere Quelle oder einen weiteren Distanzfilter.',
      datasetEmpty: 'Der lokale Datensatz ist im Moment leer. Aktualisiere die App oder public/data/events.json.',
    },
    errorState: {
      title: 'Termine konnten nicht geladen werden',
      retry: 'Erneut versuchen',
    },
    loadingState: {
      title: 'Termine werden geladen',
      description: 'Der neueste statische Datensatz wird gelesen aus',
    },
    eventList: {
      groupEyebrow: 'Datum',
    },
    eventCard: {
      tagsAriaLabel: 'Termin-Tags',
      nearYou: 'In der Nähe',
      removeFavorite: 'Aus Merkliste entfernen',
      saveFavorite: 'Zur Merkliste hinzufügen',
      shareCopied: 'Link kopiert',
      shareError: 'Link konnte nicht geteilt werden',
      share: 'Termin teilen',
      venue: 'Ort',
      address: 'Adresse',
      opening: 'Eröffnung',
      exhibition: 'Ausstellung',
      distance: 'Distanz',
      addToCalendar: 'Zum Kalender hinzufügen',
      openInMaps: 'In Google Maps öffnen',
      openVenueInMaps: (venue) => `${venue} in Google Maps öffnen`,
      openSourcePageInNewTab: 'Quellseite in neuem Tab öffnen',
      openSourcePage: 'Quellseite öffnen',
      fallback: 'Diese Termin-Karte konnte nicht angezeigt werden.',
      shareTextWithArtist: (title, artist) => `${title} von ${artist}`,
      shareTextWithVenue: (title, venue) => `${title} bei ${venue}`,
    },
    timeframe: {
      all: 'Alle',
      week: 'Diese Woche',
      weekdayLabels: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    },
    dates: {
      timeTba: 'Zeit folgt',
      datesTba: 'Termine folgen',
      openingTimeTba: 'Uhrzeit der Eröffnung folgt',
      dateTba: 'Datum folgt',
      rangeSeparator: 'bis',
    },
    distance: {
      shareLocation: 'Teile deinen Standort, um die Distanz zu berechnen',
      coordinatesUnavailable: 'Koordinaten des Orts nicht verfügbar',
      distanceUnavailable: 'Distanz nicht verfügbar',
      metersAway: (value) => `${value} m entfernt`,
      kilometersAway: (value) => `${value} km entfernt`,
    },
  },
};
