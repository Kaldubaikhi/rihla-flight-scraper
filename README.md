# Rihla flight scraper (prototype)

A headless-browser flight search for a **proposal builder** — no booking, no
saved data. Every search opens a real (but automated) browser, reads the
current results off the page, and returns them as JSON.

## Setup

```bash
npm install
npx playwright install chromium   # downloads the browser Playwright drives
npm test                          # runs a sample search, prints JSON to console
npm start                         # starts the API on http://localhost:3001
```

Then try it in a browser or with curl:

```
http://localhost:3001/api/flights?from=RUH&to=DXB&departDate=2026-09-10&returnDate=2026-09-16
```

## Wiring it into the Rihla frontend

In the artifact's `FlightStep`, replace the mock `flights` array with a
`fetch` to this endpoint, e.g.:

```js
const res = await fetch(`https://your-server.com/api/flights?from=${home.iata}&to=${dest.iata}&departDate=${trip.start}&returnDate=${trip.end}`);
const { flights } = await res.json();
```

You'll want IATA codes on your `HOME_CITIES` and `DESTINATIONS` objects
(e.g. Riyadh -> `RUH`, Dubai -> `DXB`) instead of just lat/lon.

## Why results might come back empty

This is the normal failure mode for scraping, not a bug in the usual sense:

- The source site changed its markup — open the URL in a real browser,
  inspect a result, and update the selectors in `extractFlights()`.
- The request got flagged as a bot (cloud server IPs are the most likely
  to be blocked). A proxy service (Bright Data, ScraperAPI, Oxylabs) run
  through Playwright's `proxy` launch option is the standard fix.
- A CAPTCHA was shown instead of results. There's no clean programmatic
  way around this — it's the site telling you it doesn't want automated
  traffic from that IP.

## Deployment notes

- **Don't deploy this to Vercel/Netlify serverless functions** — headless
  Chromium needs more memory/runtime than those allow by default. Use
  Railway, Render, Fly.io, or a small VPS instead.
- Add the in-memory cache in `server.js` before you have real traffic —
  it's commented in at the bottom of the file, ready to enable.
- Rate-limit your own `/api/flights` endpoint (e.g. `express-rate-limit`)
  so one user can't accidentally trigger dozens of browser launches.

## The honest limitation

This automates a real website's *user interface*, not an API meant for
this. It will break when that site redesigns, it may get IP-blocked under
real traffic, and its legality depends on that site's Terms of Service —
worth your own judgment call before using this beyond personal testing.
When you're ready for something sturdier, the same `searchFlights()`
function signature can be swapped for a real call to Amadeus or Duffel
with no changes needed on the frontend.
