import type { ArtEvent, DisplayEvent, TimeframeFilter } from '../types';

const weekdayChipLabels = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'] as const;
const upcomingDayFilters = ['day-0', 'day-1', 'day-2', 'day-3', 'day-4'] as const;

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const compactDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

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

export function formatDateTime(value?: string) {
  const date = parseDateValue(value);
  return date ? dateTimeFormatter.format(date) : 'Time TBA';
}

export function formatDateRange(start?: string, end?: string) {
  const startDate = parseDateValue(start);
  const endDate = parseDateValue(end, true);

  if (!startDate && !endDate) {
    return 'Dates TBA';
  }

  if (startDate && endDate) {
    return `${compactDateFormatter.format(startDate)} to ${compactDateFormatter.format(endDate)}`;
  }

  return compactDateFormatter.format(startDate ?? endDate ?? new Date());
}

export function formatOpeningWindow(event: ArtEvent) {
  if (!event.openingStart) {
    return 'Opening time TBA';
  }

  if (!event.openingEnd) {
    return formatDateTime(event.openingStart);
  }

  const openingStart = parseDateValue(event.openingStart);
  const openingEnd = parseDateValue(event.openingEnd);

  if (!openingStart || !openingEnd) {
    return formatDateTime(event.openingStart);
  }

  return `${dateTimeFormatter.format(openingStart)} to ${timeFormatter.format(openingEnd)}`;
}

export function formatGroupingLabel(dateKey: string) {
  if (dateKey === 'undated') {
    return 'Date TBA';
  }

  const date = parseDateValue(dateKey);
  return date ? dateFormatter.format(date) : 'Date TBA';
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

export function getTimeframeOptions(now = new Date()): Array<{ value: TimeframeFilter; label: string }> {
  return [
    { value: 'all', label: 'All' },
    ...upcomingDayFilters.map((value, dayOffset) => {
      const date = createDayBoundary(now, dayOffset);
      return {
        value,
        label: weekdayChipLabels[date.getDay()],
      };
    }),
    { value: 'week', label: 'This week' },
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

export function groupEventsByDate(events: DisplayEvent[]) {
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
      label: formatGroupingLabel(key),
      events: groupedEvents,
    }));
}
