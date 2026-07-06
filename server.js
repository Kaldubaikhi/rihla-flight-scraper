/**
 * server.js
 * ---------------------------------------------------------------------------
 * Minimal API in front of the scraper. Nothing is persisted — each request
 * runs a fresh headless-browser search and returns the result. Add the
 * simple in-memory cache below once you're ready (commented, at the bottom)
 * so identical searches within a few minutes don't re-trigger a full
 * browser load.
 * ---------------------------------------------------------------------------
 */

import express from "express";
import cors from "cors";
import { searchFlights } from "./scraper.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/flights", async (req, res) => {
  const { from, to, departDate, returnDate } = req.query;

  if (!from || !to || !departDate) {
    return res.status(400).json({ error: "from, to and departDate are required query params" });
  }

  try {
    const flights = await searchFlights({ from, to, departDate, returnDate });
    if (flights.length === 0) {
      return res.status(200).json({ flights: [], warning: "No results parsed — the source page may have changed or blocked this request." });
    }
    res.json({ flights });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not fetch live flight data right now.", detail: String(err.message || err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Flight search API running on http://localhost:${PORT}`));

/* ---------------------------------------------------------------------------
 * OPTIONAL: simple in-memory cache to avoid hammering the source site when
 * multiple people search the same route/date within a short window.
 *
 * const cache = new Map(); // key -> { data, expires }
 * const TTL_MS = 5 * 60 * 1000;
 *
 * function cacheKey(q) { return `${q.from}-${q.to}-${q.departDate}-${q.returnDate || ""}`; }
 *
 * // inside the route, before calling searchFlights:
 * const key = cacheKey(req.query);
 * const hit = cache.get(key);
 * if (hit && hit.expires > Date.now()) return res.json({ flights: hit.data, cached: true });
 * // ...after a successful fetch:
 * cache.set(key, { data: flights, expires: Date.now() + TTL_MS });
 * ------------------------------------------------------------------------ */
