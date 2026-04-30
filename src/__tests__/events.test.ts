import { describe, expect, it } from 'vitest';
import { normalizeEvent, normalizeAndDeduplicateEvents } from '../api/events';
import type { ArtEvent } from '../types';

function validRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'abc123',
    title: 'Great Exhibition',
    venue: 'Modern Gallery',
    source: 'indexberlin',
    sourceUrl: 'https://example.com',
    eventType: 'opening',
    lastUpdated: '2026-04-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeEvent', () => {
  it('returns undefined for non-object input', () => {
    expect(normalizeEvent(null)).toBeUndefined();
    expect(normalizeEvent('string')).toBeUndefined();
    expect(normalizeEvent(42)).toBeUndefined();
  });

  it('returns undefined when required fields are missing', () => {
    expect(normalizeEvent({})).toBeUndefined();
    expect(normalizeEvent(validRaw({ title: undefined }))).toBeUndefined();
    expect(normalizeEvent(validRaw({ venue: undefined }))).toBeUndefined();
    expect(normalizeEvent(validRaw({ sourceUrl: undefined }))).toBeUndefined();
  });

  it('returns undefined for an unknown source', () => {
    expect(normalizeEvent(validRaw({ source: 'unknownsource' }))).toBeUndefined();
  });

  it('normalizes a valid event', () => {
    const result = normalizeEvent(validRaw());
    expect(result).toBeDefined();
    expect(result?.title).toBe('Great Exhibition');
    expect(result?.venue).toBe('Modern Gallery');
    expect(result?.source).toBe('indexberlin');
  });

  it('trims whitespace from text fields', () => {
    const result = normalizeEvent(validRaw({ title: '  Padded Title  ', venue: '  Padded Venue  ' }));
    expect(result?.title).toBe('Padded Title');
    expect(result?.venue).toBe('Padded Venue');
  });

  it('falls back to "other" for an unknown eventType', () => {
    const result = normalizeEvent(validRaw({ eventType: 'unknown-type' }));
    expect(result?.eventType).toBe('other');
  });

  it('always includes the eventType in tags', () => {
    const result = normalizeEvent(validRaw({ eventType: 'talk' }));
    expect(result?.tags).toContain('Talk');
  });

  it('merges extra tags with the eventType tag', () => {
    const result = normalizeEvent(validRaw({ tags: ['Painting', 'Photography'] }));
    expect(result?.tags).toContain('Opening');
    expect(result?.tags).toContain('Painting');
    expect(result?.tags).toContain('Photography');
  });

  it('generates a fallback id when id is missing', () => {
    const result = normalizeEvent(validRaw({ id: undefined }));
    expect(result?.id).toBeTruthy();
    expect(typeof result?.id).toBe('string');
  });

  it('normalizes numeric latitude and longitude', () => {
    const result = normalizeEvent(validRaw({ latitude: '52.52', longitude: '13.405' }));
    expect(result?.latitude).toBe(52.52);
    expect(result?.longitude).toBe(13.405);
  });

  it('rejects non-finite numeric values', () => {
    const result = normalizeEvent(validRaw({ latitude: 'not-a-number' }));
    expect(result?.latitude).toBeUndefined();
  });
});

describe('normalizeAndDeduplicateEvents', () => {
  function rawEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return validRaw(overrides);
  }

  it('returns an empty array for empty input', () => {
    expect(normalizeAndDeduplicateEvents([])).toEqual([]);
  });

  it('skips invalid events', () => {
    const result = normalizeAndDeduplicateEvents([null, 'bad', rawEvent()]);
    expect(result).toHaveLength(1);
  });

  it('deduplicates events with the same title, venue, and date', () => {
    const a = rawEvent({ id: 'id-a', source: 'indexberlin', openingStart: '2026-05-10T18:00:00Z' });
    const b = rawEvent({ id: 'id-b', source: 'artatberlin', openingStart: '2026-05-10T18:00:00Z' });
    const result = normalizeAndDeduplicateEvents([a, b]);
    expect(result).toHaveLength(1);
  });

  it('prefers the more reliable source when deduplicating', () => {
    const reliable = rawEvent({ id: 'reliable', source: 'indexberlin', openingStart: '2026-05-10T18:00:00Z', description: 'Detailed description' });
    const less = rawEvent({ id: 'less', source: 'artrabbit', openingStart: '2026-05-10T18:00:00Z' });
    const result = normalizeAndDeduplicateEvents([less, reliable]);
    expect(result[0].source).toBe('indexberlin');
  });

  it('merges tags from duplicate events', () => {
    const a = rawEvent({ source: 'indexberlin', openingStart: '2026-05-10T18:00:00Z', tags: ['Painting'] });
    const b = rawEvent({ source: 'artatberlin', openingStart: '2026-05-10T18:00:00Z', tags: ['Photography'] });
    const result = normalizeAndDeduplicateEvents([a, b]);
    expect(result[0].tags).toContain('Painting');
    expect(result[0].tags).toContain('Photography');
  });

  it('keeps distinct events separate', () => {
    const a = rawEvent({ id: 'a', title: 'Show A', openingStart: '2026-05-10T18:00:00Z' });
    const b = rawEvent({ id: 'b', title: 'Show B', openingStart: '2026-05-11T18:00:00Z' });
    expect(normalizeAndDeduplicateEvents([a, b])).toHaveLength(2);
  });

  it('sorts output chronologically', () => {
    const later = rawEvent({ id: 'later', title: 'Show Z', openingStart: '2026-06-01T18:00:00Z' });
    const earlier = rawEvent({ id: 'earlier', title: 'Show A', openingStart: '2026-05-01T18:00:00Z' });
    const result = normalizeAndDeduplicateEvents([later, earlier]) as ArtEvent[];
    expect(result[0].openingStart?.startsWith('2026-05')).toBe(true);
  });
});
