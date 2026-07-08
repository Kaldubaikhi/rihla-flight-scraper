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
      .waitForSelector('a[href*="/travel/hotels/"], [aria-label*="riyal"], [aria-label*="SAR"]', { timeout: 20000 })
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
    const priceRe = /([\d,]+)\s*(?:Saudi riyals|riyals)/i;
    const altPriceRe = /SAR\s?([\d,]+)/i;

    const seen = new Set();
    const out = [];
    const cards = Array.from(document.querySelectorAll('a[href*="/travel/hotels/"], [role="listitem"]'));

    for (const el of cards) {
      const text = (el.getAttribute("aria-label") || el.innerText || "").replace(/\s+/g, " ").trim();
      if (!text || text.length < 8) continue;

      const priceMatch = text.match(priceRe) || text.match(altPriceRe);
      if (!priceMatch) continue;

      // Name: prefer a heading inside the card, else the text before the price.
      let name = "";
      const h = el.querySelector('h1,h2,h3,[role="heading"]');
      if (h && h.innerText) name = h.innerText.trim();
      if (!name) name = text.split(/[.·|]/)[0].trim();
      name = name.replace(priceRe, "").replace(altPriceRe, "").trim();
      if (!name || name.length < 2) continue;

      const ratingMatch = text.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|out of 5)/i) || text.match(/\b(\d\.\d)\b/);
      const starMatch = text.match(/(\d)[-\s]?star/i);

      const key = name.toLowerCase().slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        name: name.slice(0, 80),
        price: parseInt(priceMatch[1].replace(/,/g, ""), 10),
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
