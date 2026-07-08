# Rihla frontend + live flights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Rihla proposal-builder React artifact into the `rihla-flight-scraper` repo as a Vite + React SPA served by Express alongside `/api/flights`, and wire `FlightStep` to live flight data with a mock fallback.

**Architecture:** One Railway service. Vite builds the SPA to `dist/`; `server.js` serves `dist/` statically (+ SPA fallback) and keeps the existing `/api/flights` route. `FlightStep` fetches `/api/flights` same-origin, maps the results into the card shape, and falls back to the existing computed mock when the scrape is empty or errors.

**Tech Stack:** React 18, Vite 5, lucide-react, Express, Playwright (unchanged), Tailwind Play CDN.

**Environment constraint:** No local Node/npm. Nothing can be built or run locally. Verification for every task is deferred to the final deploy task (Task 9), which pushes to `main` and checks the live Railway URL. Intermediate tasks are "create/modify file with exact contents, then commit."

Spec: `docs/superpowers/specs/2026-07-07-rihla-frontend-live-flights-design.md`
Source artifact: `~/Downloads/rihla.jsx`

---

## File structure after this plan

- `index.html` — Vite HTML entry; Tailwind CDN.
- `vite.config.js` — React plugin, `outDir: dist`.
- `src/main.jsx` — React root.
- `src/App.jsx` — the artifact + modifications (IATA data, extracted mock helper, live `FlightStep`).
- `package.json` — React/Vite/lucide deps + `build` script.
- `server.js` — serve `dist/` + SPA fallback + existing API.
- `Dockerfile` — add `npm run build`.
- `.dockerignore` — exclude `node_modules`, `dist`, `.git`.
- `.github/workflows/webpack.yml` — **deleted**.

---

## Task 1: Vite + React project config

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`

- [ ] **Step 1: Replace `package.json` with:**

```json
{
  "name": "rihla-flight-scraper",
  "version": "0.1.0",
  "private": true,
  "description": "Headless-browser flight search used to build live trip proposals (no booking, no data storage).",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "start": "node server.js",
    "test": "node scraper.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "playwright": "1.46.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.1"
  }
}
```

- [ ] **Step 2: Create `vite.config.js`:**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
});
```

- [ ] **Step 3: Create `index.html`:**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Rihla — plan your escape</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `src/main.jsx`:**

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.js index.html src/main.jsx
git commit -m "Add Vite + React project config"
```

---

## Task 2: Bring the artifact in as `src/App.jsx`

**Files:**
- Create: `src/App.jsx`

- [ ] **Step 1: Copy the artifact verbatim**

Copy the entire contents of `~/Downloads/rihla.jsx` into `src/App.jsx` unchanged. It already `export default function App()` and imports from `react` and `lucide-react`. Modifications happen in later tasks.

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "Add Rihla proposal-builder app (unmodified artifact)"
```

---

## Task 3: Add `useEffect` import and IATA codes to the data

**Files:**
- Modify: `src/App.jsx` (import line; `HOME_CITIES`; `DESTINATIONS`)

- [ ] **Step 1: Add `useEffect` to the React import**

Change the first import line from:

```jsx
import React, { useState, useMemo, useRef } from "react";
```

to:

```jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
```

- [ ] **Step 2: Replace the `HOME_CITIES` array with (adds `iata`):**

```jsx
const HOME_CITIES = [
  { id: "riyadh", name: "Riyadh", iata: "RUH", lat: 24.71, lon: 46.68 },
  { id: "jeddah", name: "Jeddah", iata: "JED", lat: 21.54, lon: 39.17 },
  { id: "dammam", name: "Dammam", iata: "DMM", lat: 26.42, lon: 50.1 },
  { id: "doha", name: "Doha", iata: "DOH", lat: 25.29, lon: 51.53 },
  { id: "dubai", name: "Dubai", iata: "DXB", lat: 25.2, lon: 55.27 },
  { id: "kuwait", name: "Kuwait City", iata: "KWI", lat: 29.38, lon: 47.98 },
  { id: "manama", name: "Manama", iata: "BAH", lat: 26.23, lon: 50.59 },
  { id: "amman", name: "Amman", iata: "AMM", lat: 31.95, lon: 35.93 },
  { id: "cairo", name: "Cairo", iata: "CAI", lat: 30.04, lon: 31.24 },
  { id: "istanbul", name: "Istanbul", iata: "IST", lat: 41.01, lon: 28.98 },
];
```

- [ ] **Step 3: Replace the `DESTINATIONS` array with (adds `iata`; all other fields unchanged):**

```jsx
const DESTINATIONS = [
  { id: "maldives", name: "Maldives", iata: "MLE", region: "Indian Ocean", types: ["relax"], moods: ["Calm", "Romantic"], lat: 4.17, lon: 73.51, base: 2325, blurb: "Overwater villas, lagoon silence." },
  { id: "bali", name: "Bali", iata: "DPS", region: "Indonesia", types: ["relax", "culture"], moods: ["Calm", "Curious"], lat: -8.65, lon: 115.22, base: 1800, blurb: "Rice terraces and temple mornings." },
  { id: "santorini", name: "Santorini", iata: "JTR", region: "Greece", types: ["relax", "culture"], moods: ["Romantic", "Calm"], lat: 36.39, lon: 25.46, base: 1538, blurb: "Whitewashed cliffs, caldera sunsets." },
  { id: "patagonia", name: "Patagonia", iata: "FTE", region: "Argentina/Chile", types: ["adventure"], moods: ["Energetic", "Curious"], lat: -50.34, lon: -72.28, base: 3338, blurb: "Glaciers, wind, and long trails." },
  { id: "nepal", name: "Kathmandu", iata: "KTM", region: "Nepal", types: ["adventure", "culture"], moods: ["Energetic", "Curious"], lat: 27.72, lon: 85.32, base: 1725, blurb: "Himalayan peaks and prayer flags." },
  { id: "costarica", name: "Costa Rica", iata: "SJO", region: "Central America", types: ["adventure", "family"], moods: ["Energetic", "Festive"], lat: 9.93, lon: -84.08, base: 2700, blurb: "Rainforest zip-lines, volcano air." },
  { id: "orlando", name: "Orlando", iata: "MCO", region: "USA", types: ["family"], moods: ["Festive", "Energetic"], lat: 28.54, lon: -81.38, base: 2288, blurb: "Theme parks built for wide eyes." },
  { id: "dubaidest", name: "Dubai", iata: "DXB", region: "UAE", types: ["family", "shopping"], moods: ["Festive", "Curious"], lat: 25.2, lon: 55.27, base: 1425, blurb: "Skylines, souks, desert dunes." },
  { id: "tokyo", name: "Tokyo", iata: "HND", region: "Japan", types: ["family", "culture", "shopping"], moods: ["Curious", "Festive"], lat: 35.68, lon: 139.69, base: 2625, blurb: "Neon streets, quiet shrines." },
  { id: "milan", name: "Milan", iata: "MXP", region: "Italy", types: ["shopping", "culture"], moods: ["Curious", "Festive"], lat: 45.46, lon: 9.19, base: 1650, blurb: "Runways, arcades, espresso bars." },
  { id: "newyork", name: "New York", iata: "JFK", region: "USA", types: ["shopping", "culture"], moods: ["Energetic", "Festive"], lat: 40.71, lon: -74.01, base: 2438, blurb: "Avenues that never fully sleep." },
  { id: "rome", name: "Rome", iata: "FCO", region: "Italy", types: ["culture"], moods: ["Curious", "Romantic"], lat: 41.9, lon: 12.5, base: 1613, blurb: "Ruins folded into daily life." },
  { id: "cairodest", name: "Cairo", iata: "CAI", region: "Egypt", types: ["culture"], moods: ["Curious"], lat: 30.04, lon: 31.24, base: 1313, blurb: "Pyramids at the edge of the city." },
  { id: "athens", name: "Athens", iata: "ATH", region: "Greece", types: ["culture"], moods: ["Curious", "Calm"], lat: 37.98, lon: 23.73, base: 1500, blurb: "Marble hills, harbor light." },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "Add useEffect import and IATA codes to cities/destinations"
```

---

## Task 4: Extract mock generator + add live-data helpers

Move the flight-list generation out of `App`'s `useMemo` into a module-level function so both the fallback path and `FlightStep` can call it, and add helpers that map live API results into the card shape.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Delete the `flights` useMemo from `App`**

Remove this block (currently ~lines 176–189) entirely:

```jsx
  const flights = useMemo(() => {
    if (!dest) return [];
    const stopsOpts = [0, 0, 1, 1, 2];
    const hours = haversineHours(home, dest);
    const list = AIRLINES.map((al, i) => {
      const mult = 0.85 + ((i * 37) % 60) / 100;
      const stops = stopsOpts[i % stopsOpts.length];
      const depart = `${(8 + (i % 6)).toString().padStart(2, "0")}:${i % 2 ? "15" : "40"}`;
      const duration = Math.round((hours + stops * 1.6) * 10) / 10;
      return { id: al + destId, airline: al, stops, duration, price: Math.round(dest.base * mult), depart, arrive: addMinutes(depart, duration * 60), returnDepart: addMinutes(depart, 12 * 60 + 20) };
    });
    const filtered = settings.airlines.length ? list.filter((f) => settings.airlines.includes(f.airline)) : list;
    return filtered.sort((a, b) => a.price - b.price);
  }, [dest, settings.airlines, destId, home]);
```

- [ ] **Step 2: Add these module-level functions** immediately after the `bearingDeg` function (near the other helpers, before the `style helpers` comment):

```jsx
/* ---------- flight data: mock generator + live-result adapter ---------- */
function buildMockFlights({ dest, home, destId, settings }) {
  if (!dest) return [];
  const stopsOpts = [0, 0, 1, 1, 2];
  const hours = haversineHours(home, dest);
  const list = AIRLINES.map((al, i) => {
    const mult = 0.85 + ((i * 37) % 60) / 100;
    const stops = stopsOpts[i % stopsOpts.length];
    const depart = `${(8 + (i % 6)).toString().padStart(2, "0")}:${i % 2 ? "15" : "40"}`;
    const duration = Math.round((hours + stops * 1.6) * 10) / 10;
    return { id: al + destId, airline: al, stops, duration, price: Math.round(dest.base * mult), depart, arrive: addMinutes(depart, duration * 60), returnDepart: addMinutes(depart, 12 * 60 + 20) };
  });
  const filtered = settings.airlines.length ? list.filter((f) => settings.airlines.includes(f.airline)) : list;
  return filtered.sort((a, b) => a.price - b.price);
}

function parseDurationHours(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (!m) return null;
  return Math.round((parseInt(m[1], 10) + (m[2] ? parseInt(m[2], 10) : 0) / 60) * 10) / 10;
}

function parseTimesFromRaw(raw) {
  if (!raw) return {};
  const m = String(raw).match(/at\s+(\d{1,2}:\d{2}\s?[AP]M)\b[\s\S]*?arrives[\s\S]*?at\s+(\d{1,2}:\d{2}\s?[AP]M)\b/i);
  return m ? { depart: m[1].replace(/\s+/g, " "), arrive: m[2].replace(/\s+/g, " ") } : {};
}

function mapLiveFlights(apiFlights, { settings }) {
  const mapped = (apiFlights || []).map((f, i) => {
    const { depart, arrive } = parseTimesFromRaw(f.raw);
    return {
      id: (f.airline || "flight") + "-" + i,
      airline: f.airline || "Unknown",
      stops: typeof f.stops === "number" ? f.stops : null,
      duration: parseDurationHours(f.duration),
      price: f.price,
      depart: depart || null,
      arrive: arrive || null,
      returnDepart: null,
      live: true,
    };
  });
  // Preferred-airline filter is a soft preference: live airline names (e.g.
  // "flyadeal") often don't match the settings list, so only apply the filter
  // when it still leaves at least one flight — otherwise show all live results.
  if (settings.airlines.length) {
    const f = mapped.filter((x) => settings.airlines.includes(x.airline));
    if (f.length) return f.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
  }
  return mapped.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "Extract mock flight generator, add live-result adapter helpers"
```

---

## Task 5: Rewrite `FlightStep` to fetch live data with fallback

**Files:**
- Modify: `src/App.jsx` (the `FlightStep` render call in `App`, and the `FlightStep` component)

- [ ] **Step 1: Update the `FlightStep` render line in `App`**

Change:

```jsx
        {step === 3 && <FlightStep dest={dest} flights={flights} flight={flight} setFlight={setFlight} />}
```

to:

```jsx
        {step === 3 && <FlightStep dest={dest} home={home} trip={trip} settings={settings} flight={flight} setFlight={setFlight} />}
```

- [ ] **Step 2: Replace the entire `FlightStep` function with:**

```jsx
function FlightStep({ dest, home, trip, settings, flight, setFlight }) {
  const [expanded, setExpanded] = useState(null);
  const [flights, setFlights] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | live | estimated

  useEffect(() => {
    if (!dest || !home) return;
    let cancelled = false;
    setStatus("loading");
    setFlights([]);
    const url =
      `/api/flights?from=${encodeURIComponent(home.iata)}&to=${encodeURIComponent(dest.iata)}` +
      `&departDate=${encodeURIComponent(trip.start)}` +
      (trip.end ? `&returnDate=${encodeURIComponent(trip.end)}` : "");
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const live = mapLiveFlights(data && data.flights, { settings });
        if (live.length) {
          setFlights(live);
          setStatus("live");
        } else {
          setFlights(buildMockFlights({ dest, home, destId: dest.id, settings }));
          setStatus("estimated");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setFlights(buildMockFlights({ dest, home, destId: dest.id, settings }));
        setStatus("estimated");
      });
    return () => {
      cancelled = true;
    };
  }, [dest, home, trip.start, trip.end, settings]);

  if (!dest) return <p>Pick a destination first.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontSize: 24 }}>Flights to {dest.name}</h2>
      <div className="flex items-center gap-2" style={{ marginTop: -8 }}>
        <p style={{ fontSize: 14, opacity: 0.7 }}>
          {status === "loading"
            ? "Checking live prices…"
            : "Filtered to your preferred airlines. Tap a card for full details."}
        </p>
        {status === "live" && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: C.primary, color: C.paper }}>Live</span>
        )}
      </div>

      {status === "estimated" && (
        <div style={{ fontSize: 12, padding: "8px 12px", borderRadius: 6, background: "#FBF1DE", border: `1px solid ${C.land}`, color: C.ink }}>
          Live prices unavailable right now — showing estimates.
        </div>
      )}

      {status === "loading" && (
        <p style={{ fontSize: 14, opacity: 0.6 }}>Searching live flights — this can take up to ~20 seconds.</p>
      )}

      <div className="flex flex-col gap-2">
        {flights.map((f) => {
          const isOpen = expanded === f.id;
          const isSelected = flight?.id === f.id;
          const durText = f.duration != null ? f.duration.toFixed(1) + "h" : "—";
          return (
            <Stub key={f.id} style={selectedRing(isSelected, C.primary)}>
              {isSelected && <SelectedBadge />}
              <div style={{ padding: "12px 20px" }}>
                <div className="flex items-center justify-between gap-2" style={{ cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <div>
                    <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: 14 }}><Plane size={14} color={C.primary} />{f.airline}</div>
                    <div className="mono" style={{ fontSize: 12, opacity: 0.6 }}>{f.depart ? f.depart + " · " : ""}{durText} · {f.stops === 0 ? "nonstop" : f.stops != null ? f.stops + " stop" + (f.stops > 1 ? "s" : "") : "—"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ textAlign: "right" }}><div className="mono" style={{ fontWeight: 600 }}>{fmt(f.price)}</div><div style={{ fontSize: 10, opacity: 0.5 }}>/adult, round trip</div></div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.line}`, fontSize: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Outbound</div><div className="mono">{f.depart ? `${f.depart}${f.arrive ? " → " + f.arrive : ""}` : "See airline"}</div></div>
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Stops</div><div>{f.stops === 0 ? "Nonstop" : f.stops != null ? `${f.stops} stop(s)` : "—"}</div></div>
                    </div>
                    {f.returnDepart && (
                      <div className="grid grid-cols-2 gap-2">
                        <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Return flight</div><div className="mono">{f.returnDepart} → {addMinutes(f.returnDepart, (f.duration || 0) * 60)}</div></div>
                        <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Duration</div><div>{durText} each way</div></div>
                      </div>
                    )}
                    <button onClick={() => setFlight(f)} className="flex items-center gap-1.5" style={{ marginTop: 4, fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 999, background: isSelected ? C.secondary : C.primary, color: C.paper, border: "none", alignSelf: "flex-start" }}>
                      <Check size={13} /> {isSelected ? "Selected — change" : "Select this flight"}
                    </button>
                  </div>
                )}
              </div>
            </Stub>
          );
        })}
        {status !== "loading" && flights.length === 0 && <p style={{ fontSize: 14, opacity: 0.6 }}>No flights found for this route — try different dates or adjust preferences in Settings.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "Wire FlightStep to live /api/flights with mock fallback"
```

---

## Task 6: Serve the built SPA from Express

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add imports at the top of `server.js`** (after the existing imports):

```js
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
```

- [ ] **Step 2: Serve static assets** — add immediately after `app.use(express.json());`:

```js
app.use(express.static(distDir));
```

- [ ] **Step 3: Add an SPA fallback** — add immediately before the `const PORT = ...` line (this must come AFTER the `/api/flights` route so the API is matched first):

```js
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});
```

- [ ] **Step 4: Commit**

```bash
git add server.js
git commit -m "Serve built SPA (dist/) with API-first routing and SPA fallback"
```

---

## Task 7: Docker build step + dockerignore

**Files:**
- Modify: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Replace `Dockerfile` with:**

```dockerfile
FROM mcr.microsoft.com/playwright:v1.46.0-jammy
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV PORT=3001
EXPOSE 3001
CMD ["npm", "start"]
```

- [ ] **Step 2: Create `.dockerignore`:**

```
node_modules
dist
.git
.DS_Store
docs
```

- [ ] **Step 3: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "Build the SPA during Docker image build"
```

---

## Task 8: Remove the webpack boilerplate workflow

**Files:**
- Delete: `.github/workflows/webpack.yml`

- [ ] **Step 1: Delete the file**

```bash
git rm .github/workflows/webpack.yml
```

- [ ] **Step 2: Commit**

```bash
git commit -m "Remove unused webpack CI boilerplate (using Vite)"
```

---

## Task 9: Deploy and verify on Railway

This is where everything is verified — there is no local runtime.

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Wait for the Railway build**, then confirm the SPA is served at the root:

```bash
curl -s -m 30 https://rihla-flight-scraper-production.up.railway.app/ | grep -o '<div id="root">'
```

Expected: `<div id="root">` (the Vite HTML shell). Retry every ~25s until the new build is live (a build takes ~2–4 min; the Playwright base image + npm build is on the slower side).

- [ ] **Step 3: Confirm the API still returns JSON directly:**

```bash
curl -s -m 90 "https://rihla-flight-scraper-production.up.railway.app/api/flights?from=RUH&to=DXB&departDate=2026-09-10&returnDate=2026-09-16" | head -c 200
```

Expected: JSON starting with `{"flights":[` (real results) or `{"flights":[],"warning"` (empty — fallback will then trigger in the UI).

- [ ] **Step 4: Manual browser check** (ask the user, since there is no headless browser locally). Open the root URL and verify:
  1. The stepper renders; nav between steps works.
  2. Trip step: default RUH → pick a destination in Discover.
  3. Flight step shows "Checking live prices…", then either live cards with a "Live" badge, or mock cards with the amber "showing estimates" note.
  4. Selecting a flight carries into the Export step's budget.
  5. PDF export still downloads.

- [ ] **Step 5: If the build fails or the page is blank**, read the Railway build/deploy logs (ask the user to paste them — no local access), fix the specific error, commit, and re-push. Common suspects: a missing dependency in `package.json`, or Vite not finding `index.html` at the repo root.

---

## Self-review notes

- **Spec coverage:** architecture/deploy (Tasks 1,6,7), Tailwind CDN (Task 1), FlightStep live wiring + adapter + states (Tasks 4,5), IATA codes (Task 3), webpack removal (Task 8), verification (Task 9). All spec sections covered.
- **Type consistency:** card objects use `{ id, airline, stops, duration:number|null, price, depart:string|null, arrive:string|null, returnDepart:null, live? }` in both `buildMockFlights` (returnDepart set) and `mapLiveFlights` (returnDepart null); `FlightStep` guards `duration`, `stops`, `depart`, `arrive`, and `returnDepart` for null. `home.iata`/`dest.iata` added in Task 3 are consumed in Task 5.
- **No local tests:** intentional — the environment has no Node. Verification is Task 9 (deploy + curl + browser).
