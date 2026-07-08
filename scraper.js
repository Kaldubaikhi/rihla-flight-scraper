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
 * @returns {Promise<Array<{airline:string, price:number, currency:string, duration:string, stops:number, layovers:Array<{duration:string, place:string}>, raw:string}>>}
 */
export async function searchFlights({ from, to, departDate, returnDate, debug = false }) {
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

    // When asked (or whenever we parsed nothing), capture what the page
    // actually was so we can tell a real block/consent wall apart from a
    // stale selector without redeploying repeatedly.
    if (debug || flights.length === 0) {
      const diagnostics = await collectDiagnostics(page);
      return debug ? { flights, diagnostics } : flights;
    }

    return flights;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Snapshot of the loaded page for diagnosis. Distinguishes:
 *  - a consent interstitial ("Before you continue")
 *  - an anti-bot / "unusual traffic" wall
 *  - a real results page whose selectors have changed
 */
async function collectDiagnostics(page) {
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
        'div[role="listitem"]': count('div[role="listitem"]'),
        '[role="listitem"]': count('[role="listitem"]'),
        '[role="list"]': count('[role="list"]'),
        'li': count('li'),
        '[aria-label*="SAR"]': count('[aria-label*="SAR"]'),
        '[aria-label*="hr"]': count('[aria-label*="hr"]'),
      },
      // Real aria-label text from result-shaped elements, so the exact
      // wording can be seen if parsing still yields nothing.
      sampleLabels: Array.from(document.querySelectorAll('[aria-label]'))
        .map((el) => el.getAttribute('aria-label') || '')
        .filter((l) => /\d+\s*hr/i.test(l))
        .slice(0, 3),
    };
  });
  return { ...base, ...dom };
}

async function extractFlights(page) {
  return page.evaluate(() => {
    // Google Flights no longer uses div[role="listitem"]. Each result is an
    // <li>, and the human-readable summary lives in an aria-label on an
    // element inside it, phrased roughly like:
    //   "From 548 Saudi riyals round trip total. Nonstop flight with Saudia.
    //    Leaves King Khalid International Airport at 8:50 AM and arrives at
    //    Dubai International Airport at 10:55 AM. Total duration 2 hr 5 min.
    //    Select flight"
    // Note the price reads "548 Saudi riyals", not "SAR 548" — the currency
    // word, not the ISO code. The same label is often mirrored onto nested
    // elements, so we dedupe.
    const priceRe = /([\d,]+)\s*(?:Saudi riyals|riyals|US dollars|dollars)/i;
    const altPriceRe = /(?:SAR|USD|\$)\s?([\d,]+)/i;

    const seen = new Set();

    return Array.from(document.querySelectorAll("[aria-label]"))
      .map((el) => el.getAttribute("aria-label") || "")
      .filter((label) => /\d+\s*hr/i.test(label) && (priceRe.test(label) || altPriceRe.test(label)))
      .map((label) => {
        const priceMatch = label.match(priceRe) || label.match(altPriceRe);
        if (!priceMatch) return null;

        const key = label.slice(0, 140);
        if (seen.has(key)) return null;
        seen.add(key);

        const durationMatch = label.match(/(\d+)\s*hr(?:\s*(\d+)\s*min)?/i);
        const airlineMatch = label.match(/flight with ([^.]+?)\./i);
        const stopsMatch = label.match(/(\d+)\s*stop/i);

        const hours = durationMatch ? parseInt(durationMatch[1], 10) : null;
        const mins = durationMatch && durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;

        // Layover details, when Google includes them in the label. Two common
        // phrasings:
        //   "2 hr 30 min layover at Hamad International Airport, Doha"
        //   "Layover (1 of 1) is 2 hr 30 min at Hamad International Airport in Doha"
        const layovers = [];
        const pushLayover = (dur, place) => {
          const clean = { duration: dur.replace(/\s+/g, " ").trim(), place: place.replace(/\s+/g, " ").trim() };
          if (clean.place && !layovers.some((l) => l.place === clean.place && l.duration === clean.duration)) layovers.push(clean);
        };
        for (const m of label.matchAll(/(\d+\s*hr(?:\s*\d+\s*min)?|\d+\s*min)\s+layover\s+(?:at|in)\s+([^.,]+(?:,\s*[^.,]+)?)/gi)) pushLayover(m[1], m[2]);
        for (const m of label.matchAll(/layover[^.]*?\bis\s+(\d+\s*hr(?:\s*\d+\s*min)?|\d+\s*min)\s+at\s+([^.,]+(?:\s+in\s+[^.,]+)?)/gi)) pushLayover(m[1], m[2]);

        return {
          airline: airlineMatch ? airlineMatch[1].trim() : "Unknown",
          price: parseInt(priceMatch[1].replace(/,/g, ""), 10),
          currency: /riyal|SAR/i.test(label) ? "SAR" : /dollar|USD|\$/i.test(label) ? "USD" : "unknown",
          duration: hours != null ? `${hours}h${mins ? " " + mins + "m" : ""}` : null,
          stops: /nonstop/i.test(label) ? 0 : stopsMatch ? parseInt(stopsMatch[1], 10) : null,
          layovers,
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
