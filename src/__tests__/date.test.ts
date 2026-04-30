import { describe, expect, it } from 'vitest';
import {
  formatDateRange,
  getEventAnchorDate,
  getEventEndDate,
  groupEventsByDate,
  isUpcomingEvent,
  matchesTimeframe,
  parseDateValue,
} from '../utils/date';
import type { ArtEvent, DisplayEvent } from '../types';

function makeEvent(overrides: Partial<ArtEvent> = {}): ArtEvent {
  return {
    id: 'test-id',
    title: 'Test Exhibition',
    venue: 'Test Gallery',
    eventType: 'opening',
    source: 'indexberlin',
    sourceUrl: 'https://example.com',
    lastUpdated: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('parseDateValue', () => {
  it('returns undefined for undefined input', () => {
    expect(parseDateValue(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(parseDateValue('')).toBeUndefined();
  });

  it('parses a date-only string as start of day', () => {
    const result = parseDateValue('2026-05-10');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });

  it('parses a date-only string as end of day when endOfDay=true', () => {
    const result = parseDateValue('2026-05-10', true);
    expect(result?.getHours()).toBe(23);
    expect(result?.getSeconds()).toBe(59);
  });

  it('parses a full ISO datetime string', () => {
    const result = parseDateValue('2026-05-10T18:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe('2026-05-10T18:30:00.000Z');
  });

  it('returns undefined for an invalid date string', () => {
    expect(parseDateValue('not-a-date')).toBeUndefined();
  });
});

describe('getEventAnchorDate', () => {
  it('prefers openingStart over other dates', () => {
    const event = makeEvent({
      openingStart: '2026-05-10T18:00:00.000Z',
      exhibitionStart: '2026-05-01',
    });
    const anchor = getEventAnchorDate(event);
    expect(anchor.toISOString()).toBe('2026-05-10T18:00:00.000Z');
  });

  it('falls back to exhibitionStart when openingStart is missing', () => {
    const event = makeEvent({ exhibitionStart: '2026-06-01' });
    const anchor = getEventAnchorDate(event);
    expect(anchor.getFullYear()).toBe(2026);
    expect(anchor.getMonth()).toBe(5); // June is index 5
  });

  it('falls back to lastUpdated when no date fields are set', () => {
    const event = makeEvent({ lastUpdated: '2026-03-15T09:00:00.000Z' });
    const anchor = getEventAnchorDate(event);
    expect(anchor.toISOString()).toBe('2026-03-15T09:00:00.000Z');
  });
});

describe('getEventEndDate', () => {
  it('prefers openingEnd', () => {
    const event = makeEvent({
      openingEnd: '2026-05-10T21:00:00.000Z',
      exhibitionEnd: '2026-06-30',
    });
    expect(getEventEndDate(event)?.toISOString()).toBe('2026-05-10T21:00:00.000Z');
  });

  it('returns undefined when no end date is available', () => {
    expect(getEventEndDate(makeEvent())).toBeUndefined();
  });
});

describe('isUpcomingEvent', () => {
  it('returns true for an event starting today', () => {
    const now = new Date('2026-05-01T12:00:00Z');
    const event = makeEvent({ openingStart: '2026-05-01T20:00:00Z' });
    expect(isUpcomingEvent(event, now)).toBe(true);
  });

  it('returns true for a future event', () => {
    const now = new Date('2026-05-01T00:00:00Z');
    const event = makeEvent({ openingStart: '2026-05-15T18:00:00Z' });
    expect(isUpcomingEvent(event, now)).toBe(true);
  });

  it('returns false for a past event', () => {
    const now = new Date('2026-05-10T00:00:00Z');
    const event = makeEvent({ openingStart: '2026-05-09T18:00:00Z' });
    expect(isUpcomingEvent(event, now)).toBe(false);
  });
});

describe('matchesTimeframe', () => {
  const now = new Date('2026-05-07T12:00:00Z'); // Wednesday

  it('always returns true for "all"', () => {
    const event = makeEvent({ openingStart: '2020-01-01T00:00:00Z' });
    expect(matchesTimeframe(event, 'all', now)).toBe(true);
  });

  it('matches an event on day-0 (today)', () => {
    const event = makeEvent({ openingStart: '2026-05-07T18:00:00Z' });
    expect(matchesTimeframe(event, 'day-0', now)).toBe(true);
  });

  it('does not match a tomorrow event on day-0', () => {
    const event = makeEvent({ openingStart: '2026-05-08T18:00:00Z' });
    expect(matchesTimeframe(event, 'day-0', now)).toBe(false);
  });

  it('matches an event within the week', () => {
    const event = makeEvent({ openingStart: '2026-05-12T18:00:00Z' });
    expect(matchesTimeframe(event, 'week', now)).toBe(true);
  });

  it('does not match an event outside the week', () => {
    const event = makeEvent({ openingStart: '2026-05-15T18:00:00Z' });
    expect(matchesTimeframe(event, 'week', now)).toBe(false);
  });
});

describe('formatDateRange', () => {
  it('returns "Dates TBA" when both dates are missing', () => {
    expect(formatDateRange(undefined, undefined)).toBe('Dates TBA');
  });

  it('formats a single start date', () => {
    const result = formatDateRange('2026-05-10');
    expect(result).toContain('May');
    expect(result).toContain('10');
  });

  it('formats a range with start and end', () => {
    const result = formatDateRange('2026-05-10', '2026-06-20');
    expect(result).toContain('to');
  });
});

describe('groupEventsByDate', () => {
  function makeDisplayEvent(openingStart: string, id: string): DisplayEvent {
    return { ...makeEvent({ id, openingStart }), distanceKm: undefined, isFavorite: false };
  }

  it('groups events by their anchor date', () => {
    const events: DisplayEvent[] = [
      makeDisplayEvent('2026-05-10T18:00:00Z', 'a'),
      makeDisplayEvent('2026-05-10T20:00:00Z', 'b'),
      makeDisplayEvent('2026-05-11T18:00:00Z', 'c'),
    ];

    const groups = groupEventsByDate(events);
    expect(groups).toHaveLength(2);
    expect(groups[0].events).toHaveLength(2);
    expect(groups[1].events).toHaveLength(1);
  });

  it('sorts groups chronologically', () => {
    const events: DisplayEvent[] = [
      makeDisplayEvent('2026-05-12T18:00:00Z', 'later'),
      makeDisplayEvent('2026-05-10T18:00:00Z', 'earlier'),
    ];

    const groups = groupEventsByDate(events);
    expect(groups[0].events[0].id).toBe('earlier');
    expect(groups[1].events[0].id).toBe('later');
  });
});
