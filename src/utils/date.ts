import { getIntlLocale, translations, type Locale } from '../i18n';
import type { ArtEvent, DisplayEvent, TimeframeFilter } from '../types';

const upcomingDayFilters = ['day-0', 'day-1', 'day-2', 'day-3', 'day-4'] as const;

function createDateTimeFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function createDateFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function createCompactDateFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
  });
}

function createTimeFormatter(locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateValue(value?: string, endOfDay = false) {
  if (!value) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export function getEventAnchorDate(event: ArtEvent) {
  return (
    parseDateValue(event.openingStart) ??
    parseDateValue(event.exhibitionStart) ??
    parseDateValue(event.openingEnd) ??
    parseDateValue(event.exhibitionEnd, true) ??
    parseDateValue(event.lastUpdated) ??
    new Date()
  );
}

export function getEventEndDate(event: ArtEvent) {
  return (
    parseDateValue(event.openingEnd) ??
    parseDateValue(event.exhibitionEnd, true) ??
    parseDateValue(event.openingStart) ??
    parseDateValue(event.exhibitionStart, true)
  );
}

export function formatDateTime(value?: string, locale: Locale = 'en') {
  const date = parseDateValue(value);
  return date ? createDateTimeFormatter(locale).format(date) : translations[locale].dates.timeTba;
}

export function formatDateRange(start?: string, end?: string, locale: Locale = 'en') {
  const startDate = parseDateValue(start);
  const endDate = parseDateValue(end, true);
  const compactDateFormatter = createCompactDateFormatter(locale);

  if (!startDate && !endDate) {
    return translations[locale].dates.datesTba;
  }

  if (startDate && endDate) {
    return `${compactDateFormatter.format(startDate)} ${translations[locale].dates.rangeSeparator} ${compactDateFormatter.format(endDate)}`;
  }

  return compactDateFormatter.format(startDate ?? endDate ?? new Date());
}

export function formatOpeningWindow(event: ArtEvent, locale: Locale = 'en') {
  if (!event.openingStart) {
    return translations[locale].dates.openingTimeTba;
  }

  if (!event.openingEnd) {
    return formatDateTime(event.openingStart, locale);
  }

  const openingStart = parseDateValue(event.openingStart);
  const openingEnd = parseDateValue(event.openingEnd);

  if (!openingStart || !openingEnd) {
    return formatDateTime(event.openingStart, locale);
  }

  return `${createDateTimeFormatter(locale).format(openingStart)} ${translations[locale].dates.rangeSeparator} ${createTimeFormatter(locale).format(openingEnd)}`;
}

export function formatGroupingLabel(dateKey: string, locale: Locale = 'en') {
  if (dateKey === 'undated') {
    return translations[locale].dates.dateTba;
  }

  const date = parseDateValue(dateKey);
  return date ? createDateFormatter(locale).format(date) : translations[locale].dates.dateTba;
}

export function getGroupingKey(event: ArtEvent) {
  const anchorDate = getEventAnchorDate(event);
  return formatLocalDateKey(anchorDate);
}

export function isUpcomingEvent(event: ArtEvent, now = new Date()) {
  const anchorDate = getEventAnchorDate(event);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return anchorDate.getTime() >= today.getTime();
}

function createDayBoundary(baseDate: Date, dayOffset: number) {
  const boundary = new Date(baseDate);
  boundary.setHours(0, 0, 0, 0);
  boundary.setDate(boundary.getDate() + dayOffset);
  return boundary;
}

export function getTimeframeOptions(locale: Locale = 'en', now = new Date()): Array<{ value: TimeframeFilter; label: string }> {
  return [
    { value: 'all', label: translations[locale].timeframe.all },
    ...upcomingDayFilters.map((value, dayOffset) => {
      const date = createDayBoundary(now, dayOffset);
      return {
        value,
        label: translations[locale].timeframe.weekdayLabels[date.getDay()],
      };
    }),
    { value: 'week', label: translations[locale].timeframe.week },
  ];
}

export function matchesTimeframe(event: ArtEvent, timeframe: TimeframeFilter, now = new Date()) {
  if (timeframe === 'all') {
    return true;
  }

  const anchorDate = getEventAnchorDate(event);
  const startToday = createDayBoundary(now, 0);
  const endOfWeek = createDayBoundary(now, 7);

  if (timeframe.startsWith('day-')) {
    const dayOffset = Number.parseInt(timeframe.slice(4), 10);
    if (Number.isNaN(dayOffset)) {
      return true;
    }

    const startDay = createDayBoundary(now, dayOffset);
    const endDay = createDayBoundary(now, dayOffset + 1);
    return anchorDate >= startDay && anchorDate < endDay;
  }

  switch (timeframe) {
    case 'week':
      return anchorDate >= startToday && anchorDate < endOfWeek;
    default:
      return true;
  }
}

export function groupEventsByDate(events: DisplayEvent[], locale: Locale = 'en') {
  const groups = new Map<string, DisplayEvent[]>();

  for (const event of events) {
    const key = getGroupingKey(event);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(event);
      continue;
    }

    groups.set(key, [event]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, groupedEvents]) => ({
      key,
      label: formatGroupingLabel(key, locale),
      events: groupedEvents,
    }));
}
