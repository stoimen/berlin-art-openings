import { describe, expect, it } from 'vitest';
import { createEventIcs } from '../utils/ics';
import type { ArtEvent } from '../types';

function makeEvent(overrides: Partial<ArtEvent> = {}): ArtEvent {
  return {
    id: 'test-event-1',
    title: 'Test Opening',
    venue: 'Test Gallery',
    eventType: 'opening',
    source: 'indexberlin',
    sourceUrl: 'https://example.com/event',
    lastUpdated: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('createEventIcs', () => {
  it('returns undefined when no date information is available', () => {
    expect(createEventIcs(makeEvent())).toBeUndefined();
  });

  it('generates a valid VCALENDAR string for a timed opening', () => {
    const event = makeEvent({
      openingStart: '2026-05-10T18:00:00.000Z',
      openingEnd: '2026-05-10T21:00:00.000Z',
    });

    const ics = createEventIcs(event);
    expect(ics).toBeDefined();
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('includes the event title as SUMMARY', () => {
    const event = makeEvent({ openingStart: '2026-05-10T18:00:00.000Z', title: 'My Art Show' });
    expect(createEventIcs(event)).toContain('SUMMARY:My Art Show');
  });

  it('includes the source URL', () => {
    const event = makeEvent({ openingStart: '2026-05-10T18:00:00.000Z' });
    expect(createEventIcs(event)).toContain('URL:https://example.com/event');
  });

  it('generates an all-day event when only exhibition dates are present', () => {
    const event = makeEvent({ exhibitionStart: '2026-06-01', exhibitionEnd: '2026-07-31' });
    const ics = createEventIcs(event);
    expect(ics).toContain('DTSTART;VALUE=DATE:20260601');
    expect(ics).toContain('DTEND;VALUE=DATE:20260801');
  });

  it('defaults to 2 hours duration when openingEnd is missing', () => {
    const event = makeEvent({ openingStart: '2026-05-10T18:00:00.000Z' });
    const ics = createEventIcs(event);
    expect(ics).toContain('DTSTART:20260510T180000Z');
    expect(ics).toContain('DTEND:20260510T200000Z');
  });

  it('escapes special characters in title', () => {
    const event = makeEvent({
      openingStart: '2026-05-10T18:00:00.000Z',
      title: 'Show, with commas; and semicolons',
    });
    const ics = createEventIcs(event);
    expect(ics).toContain('SUMMARY:Show\\, with commas\\; and semicolons');
  });

  it('includes venue and address in LOCATION', () => {
    const event = makeEvent({
      openingStart: '2026-05-10T18:00:00.000Z',
      venue: 'Test Gallery',
      address: 'Musterstraße 1, Berlin',
    });
    const ics = createEventIcs(event);
    expect(ics).toContain('LOCATION:Test Gallery\\, Musterstraße 1\\, Berlin');
  });

  it('uses only venue when address is missing', () => {
    const event = makeEvent({ openingStart: '2026-05-10T18:00:00.000Z', venue: 'Test Gallery' });
    const ics = createEventIcs(event);
    expect(ics).toContain('LOCATION:Test Gallery');
  });

  it('uses CRLF line endings per RFC 2445', () => {
    const event = makeEvent({ openingStart: '2026-05-10T18:00:00.000Z' });
    const ics = createEventIcs(event)!;
    expect(ics).toContain('\r\n');
  });
});
