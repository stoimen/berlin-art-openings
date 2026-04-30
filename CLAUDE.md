# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # start Vite dev server
npm run build         # type-check + production build
npm run preview       # serve production build locally
npm run lint          # ESLint
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
npm run test          # Vitest in watch mode
npm run test:run      # Vitest single run
npm run test:coverage # coverage report
npm run analyze       # bundle visualizer (opens dist/bundle-stats.html)

# Data scripts (Node with --experimental-strip-types)
npm run import:events   # scrape sources → public/data/events.json
NOMINATIM_EMAIL=you@example.com npm run geocode:venues  # geocode → public/data/venues.json
```

Run a single test file:
```bash
npx vitest run src/__tests__/date.test.ts
```

## Architecture

This is a **static React 19 + Vite PWA** deployed to GitHub Pages. There is no backend — the browser only fetches pre-built JSON.

### Data flow

1. `public/data/events.json` and `public/data/venues.json` are the sole runtime data sources.
2. `src/api/events.ts` fetches `events.json`, runs `normalizeEvent()` on every record, then `normalizeAndDeduplicateEvents()` — deduplication key is `title + venue + openingStart/exhibitionStart`. Source reliability scores (`sourceReliability`) break ties; the more complete record wins.
3. `App.tsx` calls `loadEvents()` on mount (and on manual refresh via `refreshTick`). The event array flows into `useEventFilters()` which owns all filter state and computes `displayedEvents` inline on every render (no memoization — kept simple intentionally).

### Key modules

- **`src/types.ts`** — canonical `ArtEvent`, `DisplayEvent`, `FilterState`, and `EventSource` types. All other files import from here.
- **`src/constants.ts`** — shared magic numbers (`NEAR_YOU_THRESHOLD_KM`, timeouts, storage keys).
- **`src/api/events.ts`** — normalization helpers, deduplication, `loadEvents()`. Also exports `sourceLabels` and `sourceReliability` used by the filter hook and UI.
- **`src/hooks/useEventFilters.ts`** — single hook that owns `FilterState`, computes `DisplayEvent[]` (distance injection, all filtering, sorting), and exposes `setFilters`/`resetFilters`.
- **`src/hooks/useGeolocation.ts`** — wraps the Permissions API + `getCurrentPosition`. Auto-requests on `'prompt'`/`'granted'` status if coordinates haven't been fetched yet; exposes `requestLocation(mode)`.
- **`src/i18n.ts`** — full `TranslationSet` for `'en'` and `'de'`, plus `detectPreferredLocale()` (localStorage → `navigator.language`). All UI strings live here.
- **`src/i18n-context.tsx`** — `I18nProvider` / `useI18n()` wrapping the translation set.
- **`src/seo.ts`** — `syncStaticMetaTags()` patches `<head>` OG/canonical tags at runtime; `syncEventStructuredData()` injects/updates a `<script type="application/ld+json">` with schema.org `Event` list (capped at 24 items).
- **`src/utils/date.ts`** — `parseDateValue`, `getEventAnchorDate`, `matchesTimeframe`, `groupEventsByDate`, `Intl`-based formatters (new formatter instance per call — stateless).
- **`src/utils/distance.ts`** — Haversine formula + `formatDistanceForLocale`.
- **`src/utils/ics.ts`** — builds and triggers download of a `.ics` file for a single event.
- **`scripts/`** — Node.js import/geocoding scripts; run only locally or in CI on schedule. Use `--experimental-strip-types` so no separate TS compilation step is needed.

### PWA / caching

`vite-plugin-pwa` (Workbox) precaches all built assets. `events.json` and `venues.json` use a `NetworkFirst` strategy with a 4-second timeout and a 24-hour max-age. `offline.html` is the navigate fallback.

### GitHub Actions

`.github/workflows/deploy.yml` runs on `push` to `main`, weekly schedule (Monday 05:00 UTC), and `workflow_dispatch`. On scheduled/manual runs it executes `import:events` + `geocode:venues`, commits any changed data files back to `main`, then builds and deploys. On direct `push` it skips the data refresh step.

### Vite base path

`vite.config.ts` sets `base` to `/<repo-name>/` when `GITHUB_REPOSITORY` is set (GitHub Actions), otherwise `/`. This affects `import.meta.env.BASE_URL` used in `loadEvents()` to construct the fetch URL.
