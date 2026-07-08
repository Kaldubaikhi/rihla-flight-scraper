import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { searchFlights } from "./scraper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(distDir));

app.get("/api/flights", async (req, res) => {
  const { from, to, departDate, returnDate, debug } = req.query;

  if (!from || !to || !departDate) {
    return res.status(400).json({ error: "from, to and departDate are required query params" });
  }

  try {
    if (debug) {
      const result = await searchFlights({ from, to, departDate, returnDate, debug: true });
      return res.status(200).json(result);
    }

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

// SPA fallback — must come after the /api routes so the API is matched first.
app.get("*", (req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Flight search API running on http://localhost:${PORT}`));
