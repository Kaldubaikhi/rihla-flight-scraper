/**
 * scraper-hotels.js
 * ---------------------------------------------------------------------------
 * Headless-browser hotel search for the proposal builder, mirroring
 * scraper.js. No booking, no storage — a fresh browser context per call.
 *
 * HONEST WARNING: Google Hotels is meaningfully harder and flakier to scrape
 * than Google Flights — heavier bot protection and less stable markup. Expect
 * this to fall back to estimates more often. The frontend (HotelStep) already
 * degrades to a computed mock when this returns nothing. Use `?debug=1` on
 * /api/hotels to see whether an empty result is a block/consent wall or a
 * stale selector, then update `extractHotels()` accordingly.
 * ---------------------------------------------------------------------------
 */

import { chromium } from "playwright";

/**
 * @param {Object} params
 * @param {string} params.city      Destination city name, e.g. "Rome"
 * @param {string} [params.checkIn]  "YYYY-MM-DD"
 * @param {string} [params.checkOut] "YYYY-MM-DD"
 * @param {number} [params.adults]
 * @returns {Promise<Array<{name:string, price:number, currency:string, rating:number|null, stars:number|null, raw:string}>>}
 */
export async function searchHotels({ city, checkIn, checkOut, adults = 2, debug = false }) {
  const parts = [`hotels in ${city}`];
  if (checkIn && checkOut) parts.push(`from ${checkIn} to ${checkOut}`);
  if (adults) parts.push(`for ${adults} adults`);
  const url = `https://www.google.com/travel/search?q=${encodeURIComponent(parts.join(" "))}&hl=en&curr=SAR`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page
      .waitForSelector('[role="listitem"], a[href*="/travel/hotels/"]', { timeout: 20000 })
      .catch(() => null);

    const hotels = await extractHotels(page);

    if (debug || hotels.length === 0) {
      const diagnostics = await collectHotelDiagnostics(page);
      return debug ? { hotels, diagnostics } : hotels;
    }

    return hotels;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function extractHotels(page) {
  return page.evaluate(() => {
    // Google Hotels prices come back in USD on cloud IPs (the curr=SAR hint is
    // ignored). The Saudi riyal is pegged to the dollar at 3.75, so converting
    // is exact and stable. Prefer a native SAR figure if one is ever present.
    const SAR_PER_USD = 3.75;
    const parsePrice = (t) => {
      let m = t.match(/([\d,]+)\s*(?:Saudi riyals|riyals)/i) || t.match(/SAR\s?([\d,]+)/i);
      if (m) return parseInt(m[1].replace(/,/g, ""), 10);
      m = t.match(/\$\s?([\d,]+)/);
      if (m) return Math.round(parseInt(m[1].replace(/,/g, ""), 10) * SAR_PER_USD);
      return null;
    };

    // Card text reads like "Tiber Suite $100 4.5 (78)" or the aria-label
    // "LH Domus Caesari, $150" — the name is whatever precedes the price token.
    const splitBeforePrice = /\s*[,·]?\s*(?:\$|SAR\b|\d[\d,]*\s*(?:Saudi riyals|riyals))/i;
    const junkName = /^(sort by|all filters|price|guest rating|hotel class|amenities|deals|explore|filters|map|results)/i;

    // The hotel cards aren't a stable selector, but each card's text has a
    // recognisable signature: a "$"/riyal price AND a rating ("4.3/5", "(2.2K)")
    // or a star class ("4-star"). Scan for the smallest elements matching that.
    const hasPrice = (t) => /\$\s?\d/.test(t) || /riyal/i.test(t);
    const hasRatingSignal = (t) => /(\d\.\d)\s*\/\s*5|\(\d[\d.,KM]*\)|\d[-\s]?star/i.test(t);

    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll("div, a, li")) {
      const raw = el.textContent || "";
      if (!hasPrice(raw)) continue; // cheap pre-filter (textContent, no layout)
      const text = raw.replace(/\s+/g, " ").trim();
      if (text.length < 8 || text.length > 200) continue; // single-card sized
      if (!hasRatingSignal(text)) continue;

      const price = parsePrice(text);
      if (price == null) continue;

      let name = text.split(splitBeforePrice)[0].replace(/[,·]\s*$/, "").trim();
      if (!name || name.length < 2 || name.length > 70 || junkName.test(name)) continue;

      const key = name.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);

      const ratingMatch = text.match(/(\d\.\d)\s*\/\s*5/) || text.match(/(\d\.\d)\s*\(\d/);
      const starMatch = text.match(/(\d)[-\s]?star/i);

      out.push({
        name: name.slice(0, 80),
        price,
        currency: "SAR",
        rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
        stars: starMatch ? parseInt(starMatch[1], 10) : null,
        raw: text.slice(0, 220),
      });
      if (out.length >= 12) break;
    }

    return out;
  });
}

async function collectHotelDiagnostics(page) {
  const base = { finalUrl: page.url(), title: await page.title().catch(() => null) };
  const dom = await page.evaluate(() => {
    const text = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const has = (re) => re.test(text);
    const count = (sel) => document.querySelectorAll(sel).length;
    return {
      textSnippet: text.slice(0, 600),
      markers: {
        consent: has(/before you continue|accept all|reject all|consent/i),
        unusualTraffic: has(/unusual traffic|not a robot|are you a human|captcha/i),
        sorryPage: /\/sorry\//.test(location.pathname),
      },
      selectorCounts: {
        'a[href*="/travel/hotels/"]': count('a[href*="/travel/hotels/"]'),
        '[role="listitem"]': count('[role="listitem"]'),
        '[aria-label*="riyal"]': count('[aria-label*="riyal"]'),
        '[aria-label*="SAR"]': count('[aria-label*="SAR"]'),
      },
      sampleLabels: Array.from(document.querySelectorAll('[aria-label]'))
        .map((el) => el.getAttribute('aria-label') || '')
        .filter((l) => /riyal|SAR/i.test(l))
        .slice(0, 4),
      // What the content-signature extractor actually matches, for verification.
      cardPreview: (() => {
        const arr = [];
        for (const el of document.querySelectorAll("div, a, li")) {
          const raw = el.textContent || "";
          if (!/\$\s?\d/.test(raw) && !/riyal/i.test(raw)) continue;
          const t = raw.replace(/\s+/g, " ").trim();
          if (t.length < 8 || t.length > 200) continue;
          if (!/(\d\.\d)\s*\/\s*5|\(\d[\d.,KM]*\)|\d[-\s]?star/i.test(t)) continue;
          arr.push(t.slice(0, 120));
          if (arr.length >= 5) break;
        }
        return arr;
      })(),
    };
  });
  return { ...base, ...dom };
}

// Quick manual test: `node scraper-hotels.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await searchHotels({ city: "Rome", checkIn: "2026-09-10", checkOut: "2026-09-16", adults: 2 });
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nFound ${results.length} hotel result(s).`);
}
