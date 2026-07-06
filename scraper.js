/**
 * scraper.js
 * ---------------------------------------------------------------------------
 * Headless-browser flight search for a proposal builder. No booking. No
 * storage — every call opens a fresh browser context, reads the page,
 * closes it, and returns plain JSON.
 *
 * IMPORTANT — read before you rely on this:
 * 1. This automates a real website's front end. That site's Terms of
 *    Service almost certainly restrict automated access. Treat this as a
 *    personal/prototype tool, not something you publish at scale, until
 *    you've made your own call on that risk.
 * 2. The selectors below are written from the general, well-documented
 *    pattern Google Flights uses (results rendered as a list of items,
 *    each carrying a screen-reader `aria-label` that contains the price,
 *    airline, duration and stop count as plain text). Google changes its
 *    front end often. If this returns nothing, open the page in a real
 *    browser, right-click a result -> Inspect, and update the selectors
 *    in `extractFlights()` to match what you actually see.
 * 3. Expect occasional CAPTCHAs / blocks, especially from cloud-hosted
 *    IPs. A residential/rotating proxy (see README) makes this far more
 *    reliable for anything beyond your own testing.
 * ---------------------------------------------------------------------------
 */

import { chromium } from "playwright";

/**
 * @param {Object} params
 * @param {string} params.from        IATA code or city name, e.g. "RUH"
 * @param {string} params.to          IATA code or city name, e.g. "DXB"
 * @param {string} params.departDate  "YYYY-MM-DD"
 * @param {string} [params.returnDate] "YYYY-MM-DD" (omit for one-way)
 * @returns {Promise<Array<{airline:string, price:number, currency:string, duration:string, stops:number, raw:string}>>}
 */
export async function searchFlights({ from, to, departDate, returnDate }) {
  const query = returnDate
    ? `Flights from ${from} to ${to} on ${departDate} through ${returnDate}`
    : `Flights from ${from} to ${to} on ${departDate}`;

  const url = `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}&hl=en&curr=SAR`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Results load in asynchronously after the shell renders — wait for at
    // least one result-shaped element before reading the DOM.
    await page.waitForSelector('div[role="listitem"]', { timeout: 20000 }).catch(() => null);

    const flights = await extractFlights(page);
    return flights;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function extractFlights(page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('div[role="listitem"]'));

    return items
      .map((el) => {
        const label = el.getAttribute("aria-label") || el.innerText || "";
        if (!label || label.length < 20) return null;

        // aria-labels on Google Flights read roughly like:
        // "Emirates. Nonstop flight. Departs 8:40 AM, arrives 11:15 AM.
        //  Duration 3 hr 35 min. SAR 1,254."
        const priceMatch = label.match(/(?:SAR|USD|\$)\s?([\d,]+)/i);
        const durationMatch = label.match(/(\d+)\s*hr\s*(\d+)?\s*min?/i);
        const stopsMatch = label.match(/Nonstop|1 stop|2 stops|(\d+) stops/i);
        const airlineMatch = label.split(".")[0];

        if (!priceMatch) return null;

        const hours = durationMatch ? parseInt(durationMatch[1], 10) : null;
        const mins = durationMatch && durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;

        return {
          airline: airlineMatch?.trim() || "Unknown",
          price: parseInt(priceMatch[1].replace(/,/g, ""), 10),
          currency: /SAR/i.test(label) ? "SAR" : /USD|\$/i.test(label) ? "USD" : "unknown",
          duration: hours != null ? `${hours}h${mins ? " " + mins + "m" : ""}` : null,
          stops: /nonstop/i.test(label) ? 0 : stopsMatch ? parseInt(stopsMatch[1] || "1", 10) : null,
          raw: label,
        };
      })
      .filter(Boolean);
  });
}

// Quick manual test: `npm test` (see package.json)
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = await searchFlights({
    from: "RUH",
    to: "DXB",
    departDate: "2026-09-10",
    returnDate: "2026-09-16",
  });
  console.log(JSON.stringify(results, null, 2));
  console.log(`\nFound ${results.length} flight result(s).`);
}
