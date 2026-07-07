# Rihla frontend in-repo, wired to live flights — design

Date: 2026-07-07
Repo: `rihla-flight-scraper` (currently API-only: Express + Playwright, deployed on Railway via Dockerfile)

## Goal

Bring the Rihla proposal-builder React app (single-file artifact) into this repo as a
real, buildable frontend, and wire its `FlightStep` to the live `/api/flights`
endpoint instead of the computed mock `flights` array. Everything ships from one
Railway service at one URL.

Constraint: **no local Node/npm** on the dev machine. The app cannot be built or
previewed locally — verification happens by deploying to Railway and loading the
live URL.

## Architecture & deployment

One Railway service serves both the SPA and the API.

- Add a Vite + React build. Source lives in `src/`.
- `server.js` keeps `GET /api/flights` and additionally serves the built `dist/`
  as static files, with an SPA fallback so client routes resolve to `index.html`.
- `Dockerfile` gains a build step: `npm install` → `npm run build` → `npm start`.
  Base image stays `mcr.microsoft.com/playwright:v1.46.0-jammy` (Playwright browsers
  must match the pinned `playwright@1.46.0`).
- The SPA calls `/api/flights` **same-origin** — no CORS, no second host.
- Remove the boilerplate `.github/workflows/webpack.yml` (we use Vite, not webpack).

### Styling: Tailwind Play CDN

The artifact's layout depends on standard Tailwind utility classes (`flex`, `grid`,
`grid-cols-2`, `overflow-x-auto`, `sm:inline`, …); colors and custom sizes are already
inline styles. Because there is no local Node to debug a PostCSS/Tailwind pipeline,
Tailwind is loaded via its Play CDN `<script>` in `index.html`. This is acceptable for
a prototype; hardening to a compiled Tailwind build is a future step.

## Files after this change

- `index.html` — Vite entry; loads Tailwind CDN, Google Fonts.
- `src/main.jsx` — React root render.
- `src/App.jsx` — the artifact, lightly modified (see FlightStep + data below).
- `vite.config.js` — React plugin; `build.outDir = dist`.
- `package.json` — add `react`, `react-dom`, `lucide-react`, `vite`,
  `@vitejs/plugin-react`; add `"build": "vite build"`; keep `start`, `test`.
- `server.js` — serve `dist/` + SPA fallback, keep `/api/flights`.
- `Dockerfile` — add build step.
- `.github/workflows/webpack.yml` — removed.

Unchanged: `scraper.js` (already fixed — pinned playwright, current Google Flights
selectors). Steps other than Flight (Prefs, Trip, Discover, Stay, Days, Export), the
compass, PDF export, and budgeting are untouched.

## FlightStep: live wiring

`FlightStep` becomes data-fetching instead of receiving a precomputed `flights` prop.

Trigger: fetch when the Flight step is active and a destination is chosen; refetch
when `destId`, `trip.from`, `trip.start`, or `trip.end` change.

Request:
```
/api/flights?from={home.iata}&to={dest.iata}&departDate={trip.start}&returnDate={trip.end}
```

### Response → card adapter

API item shape: `{ airline, price, currency, duration: "1h 55m", stops, raw }`.
Card shape used by the UI: `{ id, airline, stops, duration: <number hrs>, price, depart, arrive, returnDepart }`.

Mapping:
- `id` — synthesized (`airline + index`).
- `airline`, `stops` — passed through.
- `duration` — parse `"1h 55m"` → `1.9` (hours, one decimal) for the existing
  `.toFixed(1)` display.
- `price` — API price is the round-trip total; display it as `/adult, round trip`
  (matching the existing card label). The `flightTotal = price × (adults + kids×0.75)`
  math in `App` is unchanged.
- `depart` / `arrive` — parsed from the `raw` aria-label text (it contains
  "Leaves … at 8:50 AM … arrives … at 11:45 AM") when present; if not parseable,
  the outbound-time rows are hidden rather than showing invented values.
- `returnDepart` — not available from a one-way parse of the label; the return-flight
  detail row is hidden when unknown.

Preferred-airline filtering (from settings) is applied to the mapped live list, same
as it was on the mock.

### States

- **Loading**: spinner + "Checking live prices…" (the scrape takes ~20s).
- **Success**: render mapped live flights, with a small "Live" badge.
- **Empty or error**: fall back to the existing computed mock `flights`, and show a
  small amber note: "Live prices unavailable — showing estimates." This keeps the
  proposal flow working regardless of scraper reliability (Google can return empty
  or block cloud IPs).

The mock generator currently living in `App` (the `flights` useMemo) moves into a
small helper so both `App`'s fallback and `FlightStep` can use it.

## IATA codes (for review)

Add an `iata` field to each entry. lat/lon stay (compass + haversine still use them).

HOME_CITIES:

| id | city | iata |
|----|------|------|
| riyadh | Riyadh | RUH |
| jeddah | Jeddah | JED |
| dammam | Dammam | DMM |
| doha | Doha | DOH |
| dubai | Dubai | DXB |
| kuwait | Kuwait City | KWI |
| manama | Manama | BAH |
| amman | Amman | AMM |
| cairo | Cairo | CAI |
| istanbul | Istanbul | IST |

DESTINATIONS:

| id | place | iata |
|----|-------|------|
| maldives | Maldives (Malé) | MLE |
| bali | Bali (Denpasar) | DPS |
| santorini | Santorini | JTR |
| patagonia | Patagonia (El Calafate) | FTE |
| nepal | Kathmandu | KTM |
| costarica | Costa Rica (San José) | SJO |
| orlando | Orlando | MCO |
| dubaidest | Dubai | DXB |
| tokyo | Tokyo (Haneda) | HND |
| milan | Milan (Malpensa) | MXP |
| newyork | New York (JFK) | JFK |
| rome | Rome (Fiumicino) | FCO |
| cairodest | Cairo | CAI |
| athens | Athens | ATH |

Patagonia is a region, not a city — FTE (El Calafate) is a reasonable gateway; adjust
if you prefer another.

## Testing / verification

No local runtime, so verification is on Railway after each push:

1. Root URL loads the SPA; step navigation works.
2. Discover → pick a destination → Flight step shows the loading state, then either
   live results (with the "Live" badge) or the mock fallback (with the amber note).
3. `/api/flights` still returns JSON directly (unchanged).
4. PDF export still works.

## Out of scope

- Live data for hotels/activities (remain mock — no API for them).
- In-memory cache and rate limiting on `/api/flights` (noted in README as future).
- Compiled Tailwind build; swapping the scraper for a real flights API (Amadeus/Duffel).
