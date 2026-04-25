import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import type { ArtEvent, EventSource } from '../src/types';

type SourceImporter = {
  source: EventSource;
  listUrl: string;
  run: () => Promise<ArtEvent[]>;
};

const directoryName = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(directoryName, '..');
const eventsPath = path.join(projectRoot, 'public', 'data', 'events.json');

const userAgent =
  process.env.IMPORT_USER_AGENT ??
  'BerlinArtOpeningsImporter/0.1 (+https://github.com/replace-this/berlin-art-openings)';

function normalizeText(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeDateTime(value?: string) {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizeDate(value?: string) {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

function parseCalendarDate(value?: string) {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const monthIndexesByName: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function parseIndexBerlinGroupDate(value?: string, now = new Date()) {
  const text = normalizeText(value);
  if (!text) {
    return undefined;
  }

  const match = text.match(/^(?:[A-Za-z]+,\s+)?([A-Za-z]+)\s+(\d{1,2})$/);
  if (!match) {
    return undefined;
  }

  const monthIndex = monthIndexesByName[match[1].toLowerCase()];
  const day = Number(match[2]);
  if (monthIndex === undefined || Number.isNaN(day)) {
    return undefined;
  }

  const currentDay = new Date(now);
  currentDay.setHours(0, 0, 0, 0);

  const candidate = new Date(currentDay.getFullYear(), monthIndex, day);
  const oneHundredTwentyDays = 120 * 24 * 60 * 60 * 1000;

  if (candidate.getTime() < currentDay.getTime() - oneHundredTwentyDays) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }

  return candidate;
}

function parseClockValue(rawValue: string, meridiem: string) {
  const [hoursText, minutesText = '0'] = rawValue.split(':');
  const inputHours = Number(hoursText);
  const minutes = Number(minutesText);

  if (Number.isNaN(inputHours) || Number.isNaN(minutes)) {
    return undefined;
  }

  let hours = inputHours % 12;
  if (meridiem.toLowerCase() === 'pm') {
    hours += 12;
  }

  return { hours, minutes };
}

function buildLocalDateTime(baseDate: Date, hours: number, minutes: number) {
  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function buildIndexBerlinDateTime(baseDate: Date, rawValue: string, meridiem: string) {
  const clock = parseClockValue(rawValue, meridiem);
  if (!clock) {
    return undefined;
  }

  return buildLocalDateTime(baseDate, clock.hours, clock.minutes);
}

function parseIndexBerlinTimeWindow(baseDate: Date, rawValue?: string) {
  const text = normalizeText(rawValue)?.replace(/[–—]/g, '-').replace(/\s+/g, '');
  if (!text) {
    return {};
  }

  const rangeMatch = text.match(/^(\d{1,2}(?::\d{2})?)(am|pm)?-(\d{1,2}(?::\d{2})?)(am|pm)?$/i);
  if (rangeMatch) {
    const startMeridiem = rangeMatch[2] ?? rangeMatch[4];
    const endMeridiem = rangeMatch[4] ?? rangeMatch[2];

    if (!startMeridiem || !endMeridiem) {
      return {};
    }

    return {
      openingStart: buildIndexBerlinDateTime(baseDate, rangeMatch[1], startMeridiem),
      openingEnd: buildIndexBerlinDateTime(baseDate, rangeMatch[3], endMeridiem),
    };
  }

  const singleMatch = text.match(/^(\d{1,2}(?::\d{2})?)(am|pm)$/i);
  if (singleMatch) {
    return {
      openingStart: buildIndexBerlinDateTime(baseDate, singleMatch[1], singleMatch[2]),
    };
  }

  return {};
}

function inferEventType(...values: Array<string | undefined>) {
  const haystack = values.filter(Boolean).join(' ').toLowerCase();

  if (haystack.includes('opening') || haystack.includes('vernissage')) {
    return 'opening' as const;
  }

  if (haystack.includes('talk') || haystack.includes('lecture')) {
    return 'talk' as const;
  }

  if (haystack.includes('performance')) {
    return 'performance' as const;
  }

  if (haystack.includes('screening') || haystack.includes('film')) {
    return 'screening' as const;
  }

  if (haystack.includes('exhibition') || haystack.includes('show')) {
    return 'exhibition' as const;
  }

  return 'other' as const;
}

function buildId(source: EventSource, title: string, venue: string, date?: string) {
  const rawKey = [source, title, venue, date ?? 'tba'].join('::');
  const digest = createHash('sha1').update(rawKey).digest('hex').slice(0, 10);
  return `${source}-${slugify(title)}-${digest}`;
}

function hasScheduleInfo(event: ArtEvent) {
  return Boolean(event.openingStart || event.openingEnd || event.exhibitionStart || event.exhibitionEnd);
}

function hasLocationInfo(event: ArtEvent) {
  return Boolean(
    event.address ||
      typeof event.latitude === 'number' ||
      typeof event.longitude === 'number' ||
      normalizeText(event.venue) !== 'Berlin venue',
  );
}

function isPublishableImportedEvent(event: ArtEvent) {
  // Drop fallback scraper artifacts that have no schedule, no location, and only the generic placeholder venue.
  return hasScheduleInfo(event) || hasLocationInfo(event);
}

function sanitizeImportedEvents(events: ArtEvent[]) {
  const removedBySource = new Map<EventSource, number>();
  const sanitized: ArtEvent[] = [];

  for (const event of events) {
    if (isPublishableImportedEvent(event)) {
      sanitized.push(event);
      continue;
    }

    removedBySource.set(event.source, (removedBySource.get(event.source) ?? 0) + 1);
  }

  for (const [source, removedCount] of removedBySource.entries()) {
    console.warn(`[${source}] filtered ${removedCount} low-quality records`);
  }

  return sanitized;
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': userAgent,
      'accept-language': 'en-US,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed for ${url} (${response.status})`);
  }

  return response.text();
}

function extractJsonLdEvents(html: string, source: EventSource, sourceUrl: string) {
  const $ = load(html);
  const rawBlocks = $('script[type="application/ld+json"]')
    .toArray()
    .map((element) => $(element).text())
    .filter(Boolean);

  const events: ArtEvent[] = [];

  function visitNode(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(visitNode);
      return;
    }

    if (!node || typeof node !== 'object') {
      return;
    }

    const record = node as Record<string, unknown>;
    const typeName = Array.isArray(record['@type']) ? String(record['@type'][0]) : String(record['@type'] ?? '');

    if (typeName.toLowerCase().includes('event')) {
      const title = normalizeText(String(record.name ?? ''));
      if (!title) {
        return;
      }

      const locationRecord =
        record.location && typeof record.location === 'object'
          ? (record.location as Record<string, unknown>)
          : undefined;

      const venue = normalizeText(String(locationRecord?.name ?? record.organizer ?? 'Berlin venue')) ?? 'Berlin venue';
      const addressRecord =
        locationRecord?.address && typeof locationRecord.address === 'object'
          ? (locationRecord.address as Record<string, unknown>)
          : undefined;
      const address = normalizeText(
        [addressRecord?.streetAddress, addressRecord?.postalCode, addressRecord?.addressLocality]
          .filter(Boolean)
          .join(', '),
      );

      const openingStart = normalizeDateTime(String(record.startDate ?? ''));
      const openingEnd = normalizeDateTime(String(record.endDate ?? ''));
      const description = normalizeText(String(record.description ?? ''));

      events.push({
        id: buildId(source, title, venue, openingStart),
        title,
        venue,
        address,
        openingStart,
        openingEnd,
        exhibitionStart: openingStart?.slice(0, 10),
        exhibitionEnd: openingEnd?.slice(0, 10),
        eventType: inferEventType(title, description),
        source,
        sourceUrl:
          normalizeText(String(record.url ?? '')) ??
          sourceUrl,
        description,
        imageUrl: normalizeText(String(record.image ?? '')),
        tags: undefined,
        lastUpdated: new Date().toISOString(),
      });
    }

    for (const value of Object.values(record)) {
      visitNode(value);
    }
  }

  for (const rawBlock of rawBlocks) {
    try {
      visitNode(JSON.parse(rawBlock));
    } catch {
      continue;
    }
  }

  return events;
}

function extractGenericCards(html: string, source: EventSource, listUrl: string) {
  const $ = load(html);

  // TODO: Replace these heuristics with source-specific selectors once the live markup is audited.
  // The current parser intentionally stays conservative so the script remains resilient across layout changes.
  const cards =
    $('.event-item, .calendar-item, article, li, .tribe-events-calendar-list__event-row')
      .toArray()
      .slice(0, 48);

  return cards
    .map<ArtEvent | undefined>((card) => {
      const root = $(card);
      const title = normalizeText(root.find('h1, h2, h3, [itemprop="name"], .title').first().text()) ??
        normalizeText(root.find('a').first().text());
      const link = root.find('a[href]').first().attr('href');
      const venue =
        normalizeText(root.find('.venue, .location, [itemprop="location"], [itemprop="organizer"]').first().text()) ??
        'Berlin venue';
      const address = normalizeText(root.find('.address, [itemprop="streetAddress"]').first().text());
      const timeValue = root.find('time').first().attr('datetime') ?? root.find('time').first().text();
      const description = normalizeText(root.find('p').first().text());

      if (!title || !link) {
        return undefined;
      }

      const openingStart = normalizeDateTime(timeValue);
      const event: ArtEvent = {
        id: buildId(source, title, venue, openingStart),
        title,
        venue,
        address,
        openingStart,
        exhibitionStart: openingStart?.slice(0, 10) ?? normalizeDate(timeValue),
        eventType: inferEventType(title, description),
        source,
        sourceUrl: new URL(link, listUrl).toString(),
        description,
        imageUrl: normalizeText(root.find('img').first().attr('src')),
        tags: undefined,
        lastUpdated: new Date().toISOString(),
      };

      return event;
    })
    .filter((event): event is ArtEvent => event !== undefined);
}

function extractIndexBerlinEvents(html: string, listUrl: string, now = new Date()) {
  const $ = load(html);
  const events: ArtEvent[] = [];

  for (const group of $('.events.js-search-group').toArray()) {
    const groupRoot = $(group);
    const groupDate = parseIndexBerlinGroupDate(groupRoot.find('.events__group-title').first().text(), now);

    if (!groupDate) {
      continue;
    }

    for (const card of groupRoot.find('article.event.js-search-item').toArray()) {
      const root = $(card);
      const title = normalizeText(root.find('.event__title').first().text());
      const sourcePath =
        normalizeText(root.attr('data-href')) ??
        normalizeText(root.find('a.event__title[href], a.event__authors[href]').first().attr('href'));

      if (!title || !sourcePath) {
        continue;
      }

      const artist = normalizeText(root.find('.event__authors').first().text());
      const venue =
        normalizeText(
          root
            .find('.event__location > span')
            .not('.event__location-bullet, .event__location-address')
            .first()
            .text(),
        ) ?? 'Berlin venue';
      const address = normalizeText(root.find('.event__location-address').first().text());
      const eventLabel = normalizeText(root.find('.event__date span span').first().text());
      const fullDateText = normalizeText(root.find('.event__date').first().text());
      const timeText =
        fullDateText && eventLabel
          ? normalizeText(fullDateText.replace(new RegExp(`^${escapeRegExp(eventLabel)}`, 'i'), ''))
          : fullDateText;
      const { openingStart, openingEnd } = parseIndexBerlinTimeWindow(groupDate, timeText);
      const latitude = Number(root.attr('data-latitude'));
      const longitude = Number(root.attr('data-longitude'));
      const imagePath = normalizeText(root.find('img').first().attr('src'));

      events.push({
        id: buildId('indexberlin', title, venue, openingStart ?? formatLocalDateKey(groupDate)),
        title,
        artist,
        venue,
        address,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        openingStart,
        openingEnd,
        exhibitionStart: formatLocalDateKey(groupDate),
        exhibitionEnd: formatLocalDateKey(groupDate),
        eventType: inferEventType(eventLabel, title, artist),
        source: 'indexberlin',
        sourceUrl: new URL(sourcePath, listUrl).toString(),
        imageUrl: imagePath ? new URL(imagePath, listUrl).toString() : undefined,
        tags: undefined,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return events;
}

function parseArtrabbitDateRange(value?: string) {
  const text = normalizeText(value)?.replace(/[–—]/g, '-');
  if (!text) {
    return {};
  }

  const [startText, endText] = text.split('-').map((part) => normalizeText(part));
  const startDate = parseCalendarDate(startText);
  const endDate = parseCalendarDate(endText);

  return {
    startDate,
    exhibitionStart: startDate ? formatLocalDateKey(startDate) : undefined,
    exhibitionEnd: endDate ? formatLocalDateKey(endDate) : undefined,
  };
}

function parseArtrabbitOpeningDateTime(value: string | undefined, fallbackDate?: Date) {
  const text = normalizeText(value);
  if (!text) {
    return {};
  }

  const timeMatch = text.match(/(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    return {};
  }

  const explicitDateMatch = text.match(/^Opening:\s*([^,]+),\s*\d{1,2}:\d{2}$/i);
  const explicitDate = explicitDateMatch?.[1];
  const baseDate =
    explicitDate && !/today/i.test(explicitDate)
      ? parseCalendarDate(explicitDate) ?? fallbackDate
      : fallbackDate;

  if (!baseDate) {
    return {};
  }

  return {
    openingStart: buildLocalDateTime(baseDate, Number(timeMatch[1]), Number(timeMatch[2])),
  };
}

function extractArtrabbitBerlinEvents(html: string, listUrl: string) {
  const $ = load(html);

  return $('article.m_listing-item[data-ident]')
    .toArray()
    .map<ArtEvent | undefined>((card) => {
      const root = $(card);
      const locationParts = root.find('.b_instructional-text.mod--large').toArray();
      const venue = normalizeText($(locationParts[0]).text()) ?? 'Berlin venue';
      const location = normalizeText($(locationParts[1]).text());

      if (!location?.toLowerCase().includes('berlin')) {
        return undefined;
      }

      const title = normalizeText(root.find('.b_small-heading.mod--primary').first().text());
      const sourcePath = normalizeText(root.find('a.m_listing-link[href]').first().attr('href'));
      if (!title || !sourcePath) {
        return undefined;
      }

      const dateRange = parseArtrabbitDateRange(root.find('.b_small-heading.mod--colour').first().text());
      const openingText = root.find('.b_small-heading.b_highlight').first().text();
      const openingDateTime = parseArtrabbitOpeningDateTime(openingText, dateRange.startDate);
      const latitude = Number(root.attr('data-lat'));
      const longitude = Number(root.attr('data-lon'));
      const imagePath = normalizeText(root.find('img').first().attr('src'));
      const category = normalizeText(root.find('.b_categorical-heading').first().text());

      return {
        id: buildId('artrabbit', title, venue, openingDateTime.openingStart ?? dateRange.exhibitionStart),
        title,
        venue,
        address: location,
        latitude: Number.isFinite(latitude) ? latitude : undefined,
        longitude: Number.isFinite(longitude) ? longitude : undefined,
        openingStart: openingDateTime.openingStart,
        exhibitionStart: dateRange.exhibitionStart,
        exhibitionEnd: dateRange.exhibitionEnd,
        eventType: inferEventType(category, openingText, title),
        source: 'artrabbit',
        sourceUrl: new URL(sourcePath, listUrl).toString(),
        imageUrl: imagePath ? new URL(imagePath, listUrl).toString() : undefined,
        tags: undefined,
        lastUpdated: new Date().toISOString(),
      };
    })
    .filter((event): event is ArtEvent => event !== undefined);
}

function dedupeEvents(events: ArtEvent[]) {
  const unique = new Map<string, ArtEvent>();

  for (const event of events) {
    const key = [slugify(event.title), slugify(event.venue), event.openingStart?.slice(0, 10) ?? event.exhibitionStart].join(
      '::',
    );

    if (!unique.has(key)) {
      unique.set(key, event);
    }
  }

  return [...unique.values()].sort((left, right) => {
    const leftDate = left.openingStart ?? left.exhibitionStart ?? left.lastUpdated;
    const rightDate = right.openingStart ?? right.exhibitionStart ?? right.lastUpdated;
    return leftDate.localeCompare(rightDate) || left.title.localeCompare(right.title);
  });
}

async function readExistingEvents() {
  try {
    const fileContents = await fs.readFile(eventsPath, 'utf8');
    const parsed = JSON.parse(fileContents) as unknown;
    return Array.isArray(parsed) ? (parsed as ArtEvent[]) : [];
  } catch {
    return [];
  }
}

function createHeuristicImporter(source: EventSource, listUrl: string): SourceImporter {
  return {
    source,
    listUrl,
    async run() {
      const html = await fetchHtml(listUrl);

      if (source === 'indexberlin') {
        const indexBerlinEvents = extractIndexBerlinEvents(html, listUrl);
        if (indexBerlinEvents.length > 0) {
          return indexBerlinEvents;
        }
      }

      if (source === 'artrabbit') {
        const artrabbitEvents = extractArtrabbitBerlinEvents(html, listUrl);
        if (artrabbitEvents.length > 0) {
          return artrabbitEvents;
        }
      }

      const jsonLdEvents = extractJsonLdEvents(html, source, listUrl);
      if (jsonLdEvents.length > 0) {
        return jsonLdEvents;
      }

      return extractGenericCards(html, source, listUrl);
    },
  };
}

const importers: SourceImporter[] = [
  createHeuristicImporter('indexberlin', 'https://www.indexberlin.com/events/list/'),
  createHeuristicImporter('artatberlin', 'https://www.artatberlin.com/en/calendar-for-vernissagen-exhibitions-events/'),
  createHeuristicImporter('berlinartlink', 'https://www.berlinartlink.com/this-weeks-events/'),
  createHeuristicImporter('artrabbit', 'https://www.artrabbit.com/events?city=Berlin'),
  createHeuristicImporter('berlin_de', 'https://www.berlin.de/en/exhibitions/'),
  createHeuristicImporter('visitberlin', 'https://www.visitberlin.de/en/events-contemporary-art-berlin'),
  createHeuristicImporter('kunstkalender', 'https://kunstkalender.berlin/en/calendar'),
];

async function main() {
  const existingEvents = await readExistingEvents();
  const manualEvents = existingEvents.filter((event) => event.source === 'manual');
  const importedEvents: ArtEvent[] = [];

  for (const importer of importers) {
    try {
      const events = await importer.run();
      importedEvents.push(...events);
      console.log(`[${importer.source}] imported ${events.length} events`);
    } catch (error) {
      console.error(`[${importer.source}] import failed`, error);
    }
  }

  if (importedEvents.length === 0) {
    console.warn('No sources produced events. Existing public/data/events.json was left unchanged.');
    return;
  }

  const sanitizedImportedEvents = sanitizeImportedEvents(importedEvents);
  const output = dedupeEvents([...manualEvents, ...sanitizedImportedEvents]);
  await fs.writeFile(eventsPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${output.length} events to ${path.relative(projectRoot, eventsPath)}`);
}

void main();
