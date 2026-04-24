# Berlin Art Openings

Berlin Art Openings is a mobile-first React + TypeScript + Vite PWA for browsing exhibition openings in Berlin. It is designed to work as a static site on GitHub Pages while keeping the data layer ready for optional local import scripts.

## Features

- Grouped event list by date
- Nearby ranking with browser geolocation and Haversine distance
- Filters for `Today`, `Tomorrow`, `This week`, `Openings only`, `Source`, free text, and max distance
- Favorites stored in `localStorage`
- One-click `.ics` calendar download per event
- Google Maps links for venues
- Installable PWA with cached shell assets, cached `events.json`, and an offline fallback page
- GitHub Pages deployment workflow

## Stack

- React 19
- TypeScript
- Vite
- `vite-plugin-pwa`
- Plain CSS
- Optional Node.js scripts with built-in type stripping and `cheerio`

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal.

## NPM scripts

- `npm run dev` starts the local development server
- `npm run build` type-checks and creates the production build
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint
- `npm run import:events` runs the local importer and writes `public/data/events.json`
- `npm run geocode:venues` geocodes missing venue coordinates and updates `public/data/venues.json`

## Data model and loading

The app loads static JSON from:

- `public/data/events.json`
- `public/data/venues.json`

At runtime the browser only fetches the generated JSON file. There is no backend requirement, which keeps the app GitHub Pages compatible.

Two data modes are supported:

1. Static curated JSON mode for deployment.
2. Optional local import mode using Node.js scripts that fetch and normalize data before writing back to `public/data/events.json`.

The browser app validates and normalizes records, deduplicates by normalized title plus venue plus opening date, and handles missing coordinates gracefully.

## Updating event data

Manual curation:

1. Edit `public/data/events.json`.
2. Keep records aligned with `src/types.ts`.
3. Add coordinates directly when known, or run the geocoder script later.

Importer workflow:

```bash
npm run import:events
```

The importer is intentionally modular:

- one importer entry per source
- isolated failure handling so one bad source does not break the whole import
- TODO comments where source-specific parsing should be tightened

Current supported source list:

- INDEX Berlin
- ART@Berlin
- Berlin Art Link
- ArtRabbit Berlin
- berlin.de exhibitions
- visitBerlin contemporary art events
- Kunstkalender Berlin

## Geocoding venues

```bash
NOMINATIM_EMAIL=you@example.com npm run geocode:venues
```

The geocoder:

- reads events without coordinates
- checks `public/data/venues.json` first
- queries OpenStreetMap Nominatim only for uncached addresses
- rate limits requests to respect the public usage policy
- updates both `public/data/venues.json` and `public/data/events.json`

Use Nominatim sparingly and only for small, local import batches. For production-scale geocoding, switch to a compliant paid provider or a self-hosted service.

## GitHub Pages deployment

1. Push this repository to the `main` branch.
2. In GitHub, open `Settings` → `Pages`.
3. Set the source to `GitHub Actions`.
4. Push to `main` to deploy the current repo state.
5. Optionally run the workflow manually from the `Actions` tab to refresh event data and redeploy immediately.

The Pages workflow also runs automatically once a week on Monday, refreshes `public/data/events.json` and `public/data/venues.json`, commits those generated data files back to `main`, then redeploys the site.

If you use the geocoding step in GitHub Actions, add a `NOMINATIM_EMAIL` repository secret so requests include a contact email. If branch protection blocks direct pushes from `github-actions[bot]`, allow that bot to push to `main` or the scheduled refresh commit will fail.

The Vite base path is configured for GitHub Pages:

```ts
base: process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : "/"
```

The workflow file is at `.github/workflows/deploy.yml`.

## Static hosting limitations and CORS

GitHub Pages cannot run server-side scraping. Because of that:

- the browser app does not scrape third-party pages live
- the runtime relies on static JSON only
- import and geocoding scripts run locally before deployment

Direct browser scraping is intentionally avoided because CORS, bot protection, and HTML instability make it unreliable.

## Source reliability note

Nearby ranking uses:

1. opening soonest
2. distance from the user
3. source reliability

The default reliability weights can be adjusted in `src/api/events.ts`.

## Scraping and legal note

Scraping public event pages can be technically and legally fragile. Prefer official RSS feeds, APIs, iCal feeds, or manual curation where available. Treat `scripts/import-events.ts` as a local convenience tool rather than a guaranteed production ingestion pipeline.
