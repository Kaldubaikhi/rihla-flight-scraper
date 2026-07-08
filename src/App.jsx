import React, { useState, useMemo, useRef, useEffect } from "react";
import { Plane, Hotel, Compass, Wallet, Users, Sparkles, ArrowRight, ArrowLeft, X, Check, Printer, ChevronDown, ChevronUp, Sun, Mountain, ShoppingBag, Landmark, Baby, Plus } from "lucide-react";

/* ---------------- Design tokens ----------------
ink #1B2430  paper #FAF6ED  primary(indigo) #3E4C7C  secondary(rosewood) #8C3F4D  warn #B2495A
Display: Fraunces | Body: Inter | Data: IBM Plex Mono
IMPORTANT: this environment has no Tailwind JIT compiler, so bracket-value classes like
bg-[#111] or text-[10px] silently fail. Every color, border-color and custom font-size
below is therefore applied via inline style, never via a bracket className.
--------------------------------------------------*/
const C = { ink: "#1B2430", paper: "#FAF6ED", card: "#FFFDF8", primary: "#3E4C7C", primaryLight: "#B9C2E8", secondary: "#8C3F4D", warn: "#B2495A", line: "#E7DFC9", land: "#E3D9BE", ocean: "#F0EAD8" };

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');`;
const SYM = "﷼";
const fmt = (n) => Math.round(n).toLocaleString() + " " + SYM;

const TYPES = [
  { id: "relax", label: "Relax", icon: Sun },
  { id: "adventure", label: "Adventure", icon: Mountain },
  { id: "family", label: "Family", icon: Baby },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "culture", label: "History & Culture", icon: Landmark },
];
const MOODS = ["Calm", "Energetic", "Romantic", "Curious", "Festive"];
const AIRLINES = ["Emirates", "Qatar Airways", "Turkish Airlines", "Etihad", "British Airways", "Lufthansa", "Air France", "Singapore Airlines"];

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

const QUOTES = [
  "Pack light. Let the trip carry the rest.",
  "A new city teaches you what home already knew.",
  "The best souvenir is a version of yourself you like more.",
  "Distance is just time you haven't spent yet.",
  "Somewhere, a table is being set for you.",
];

const ACTIVITY_POOL = {
  relax: [["Sunrise beach walk", "🌅", 0], ["Spa & hammam", "💆", 340], ["Sunset boat cruise", "⛵", 260], ["Poolside afternoon", "🏖️", 0], ["Slow breakfast market", "🥐", 55]],
  adventure: [["Guided hike", "🥾", 170], ["Zipline canopy tour", "🌲", 300], ["White-water rafting", "🚣", 355], ["Sunrise summit trek", "🏔️", 225], ["Local trail run", "👟", 0]],
  family: [["Theme park day", "🎢", 450], ["Aquarium visit", "🐠", 130], ["Beach games", "🏐", 0], ["Cooking class for kids", "🍪", 150], ["Petting zoo / farm", "🐐", 95]],
  shopping: [["Old souk / market", "🛍️", 0], ["Designer district stroll", "👜", 0], ["Local artisan tour", "🧵", 110], ["Night market", "🥟", 75], ["Concept store hop", "🛒", 0]],
  culture: [["Guided old-town walk", "🏛️", 95], ["Museum morning", "🖼️", 80], ["Sunset at the ruins", "🏺", 40], ["Traditional dinner + music", "🎶", 205], ["Local history talk", "📜", 55]],
};

const uid = () => Math.random().toString(36).slice(2, 9);
function daysBetween(a, b) { if (!a || !b) return 0; return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000)); }
function dateRange(a, b) { const out = []; if (!a || !b) return out; let cur = new Date(a); const end = new Date(b); while (cur <= end) { out.push(new Date(cur).toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); } return out; }
function haversineHours(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return Math.max(1, Math.round(((km / 780) + 0.6) * 10) / 10);
}
function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m + mins;
  const dayOver = Math.floor(total / 1440);
  total = ((total % 1440) + 1440) % 1440;
  const H = Math.floor(total / 60).toString().padStart(2, "0");
  const M = Math.round(total % 60).toString().padStart(2, "0");
  return `${H}:${M}${dayOver ? " +1d" : ""}`;
}
const lonLatToXY = (lon, lat) => ({ x: ((lon + 180) / 360) * 100, y: ((90 - lat) / 180) * 100 });
function bearingDeg(a, b) {
  const toRad = (x) => (x * Math.PI) / 180, toDeg = (x) => (x * 180) / Math.PI;
  const phi1 = toRad(a.lat), phi2 = toRad(b.lat), dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/* ---------- style helpers (inline only — no color/size bracket classes) ---------- */
const cardStyle = (accent = C.line) => ({ position: "relative", background: C.card, border: `1px solid ${C.line}`, borderRadius: 8, boxShadow: "0 1px 2px rgba(27,36,48,0.06)" });
const selectedRing = (on, color = C.primary) => (on ? { boxShadow: `0 0 0 2px ${color}` } : {});
const pill = (active, activeColor = C.ink) => ({ padding: "7px 13px", borderRadius: 999, fontSize: 12, fontWeight: 500, border: `1px solid ${active ? activeColor : C.line}`, background: active ? activeColor : "#fff", color: active ? C.paper : C.ink, cursor: "pointer", whiteSpace: "nowrap" });
const inputStyle = { width: "100%", boxSizing: "border-box", height: 40, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: "0 12px", fontSize: 14, fontFamily: "Inter, sans-serif", color: C.ink, WebkitAppearance: "none", appearance: "none" };
const labelStyle = { fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", opacity: 0.6, display: "block", marginBottom: 4 };

function Stub({ children, style = {} }) {
  return (
    <div style={{ ...cardStyle(), ...style }}>
      <div style={{ position: "absolute", left: -8, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: 999, background: C.paper, border: `1px solid ${C.line}` }} />
      <div style={{ position: "absolute", right: -8, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, borderRadius: 999, background: C.paper, border: `1px solid ${C.line}` }} />
      {children}
    </div>
  );
}

function SelectedBadge() {
  return (
    <span style={{ position: "absolute", top: -10, right: 10, display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 600, padding: "2px 9px", borderRadius: 999, background: C.primary, color: C.paper }}>
      <Check size={11} /> Selected
    </span>
  );
}

function AmbientBackground() {
  // Faint decorative flight-path texture, fixed behind all content — purely atmospheric, non-interactive.
  const routes = [
    { d: "M -5 8 Q 25 -4 50 12 T 105 6", planeAt: [50, 12], rotate: 25 },
    { d: "M -5 55 Q 15 42 32 50 T 55 62", planeAt: [10, 47], rotate: -35 },
    { d: "M 0 92 Q 35 78 60 96 T 100 118", planeAt: [60, 96], rotate: 30 },
  ];
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMid slice" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, opacity: 0.5, pointerEvents: "none" }}>
      {routes.map((r, i) => (
        <g key={i}>
          <path d={r.d} fill="none" stroke="#9C9282" strokeWidth="0.35" strokeDasharray="0.8,1.6" strokeLinecap="round" />
          <g transform={`translate(${r.planeAt[0]}, ${r.planeAt[1]}) rotate(${r.rotate}) scale(0.09)`}>
            <path d="M32 2 L36 14 L58 26 L58 30 L36 24 L34 40 L44 48 L44 51 L32 47 L20 51 L20 48 L30 40 L28 24 L6 30 L6 26 L28 14 Z" fill="#9C9282" />
          </g>
        </g>
      ))}
    </svg>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState({ airlines: [], stars: [], propType: [], freeCancel: false, breakfast: false });
  const [trip, setTrip] = useState({ from: "riyadh", start: "2026-09-10", end: "2026-09-16", type: "relax", mood: "Calm", budget: 15000, adults: 2, kids: 0, names: [] });
  const [destId, setDestId] = useState(null);
  const [flight, setFlight] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState(1);
  const [plan, setPlan] = useState({});
  const [customActivities, setCustomActivities] = useState([]);
  const [breakdown, setBreakdown] = useState({ food: 0, shopping: 0, transport: 0 });

  const nights = daysBetween(trip.start, trip.end);
  const days = useMemo(() => dateRange(trip.start, trip.end), [trip.start, trip.end]);
  const dest = DESTINATIONS.find((d) => d.id === destId);
  const home = HOME_CITIES.find((h) => h.id === trip.from);

  const flightTotal = flight ? flight.price * (trip.adults + trip.kids * 0.75) : 0;
  const hotelTotal = hotel ? hotel.price * nights * rooms : 0;
  const extrasTotal = breakdown.food + breakdown.shopping + breakdown.transport;

  const steps = ["Prefs", "Trip", "Discover", "Flight", "Stay", "Days", "Export"];

  const suggested = useMemo(() => {
    return DESTINATIONS.filter((d) => d.types.includes(trip.type))
      .map((d) => ({ ...d, moodMatch: d.moods.includes(trip.mood), hours: haversineHours(home, d) }))
      .sort((a, b) => (b.moodMatch - a.moodMatch) || a.hours - b.hours);
  }, [trip.type, trip.mood, home]);

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

  const hotels = useMemo(() => {
    if (!dest) return [];
    const names = ["The " + dest.name + " Pearl", dest.name + " Garden Residence", "Casa " + dest.name, dest.name + " Bay Apartments", dest.name + " Old Town House"];
    const list = names.map((n, i) => ({ id: n, name: n, stars: [3, 4, 4, 5, 3][i], type: i % 2 === 0 ? "hotel" : "apartment", price: Math.round((dest.base / 4) * (0.7 + i * 0.22)), freeCancel: i % 2 === 0, breakfast: i !== 1, area: ["Old Town", "Marina", "Hillside", "Beachfront", "City Center"][i] }));
    return list.filter((h) => {
      if (settings.stars.length && !settings.stars.includes(h.stars)) return false;
      if (settings.propType.length && !settings.propType.includes(h.type)) return false;
      if (settings.freeCancel && !h.freeCancel) return false;
      if (settings.breakfast && !h.breakfast) return false;
      return true;
    }).sort((a, b) => a.price - b.price);
  }, [dest, settings]);

  const activities = useMemo(() => {
    const pool = dest ? (ACTIVITY_POOL[dest.types[0]] || ACTIVITY_POOL.culture).map(([name, icon, cost]) => ({ id: uid(), name, icon, cost, perPerson: true })) : [];
    return [...pool, ...customActivities];
  }, [dest, customActivities]);

  const participants = trip.adults + trip.kids;
  const activitiesTotal = useMemo(() => Object.values(plan).flat().reduce((sum, a) => sum + (a.cost || 0) * (a.perPerson === false ? 1 : participants), 0), [plan, participants]);
  const spent = flightTotal + hotelTotal + activitiesTotal + extrasTotal;
  const remaining = trip.budget - spent;

  function toggleArr(key, val) { setSettings((s) => ({ ...s, [key]: s[key].includes(val) ? s[key].filter((x) => x !== val) : [...s[key], val] })); }
  function addToDay(day, act) { setPlan((p) => ({ ...p, [day]: [...(p[day] || []), act] })); }
  function removeFromDay(day, idx) { setPlan((p) => ({ ...p, [day]: p[day].filter((_, i) => i !== idx) })); }
  function goto(i) { setStep(i); }

  return (
    <div style={{ fontFamily: "Inter, sans-serif", background: C.paper, color: C.ink, minHeight: "100vh", position: "relative" }}>
      <style>{FONTS}{`h1,h2,h3,.display{font-family:'Fraunces',serif;} .mono{font-family:'IBM Plex Mono',monospace;}`}</style>
      <AmbientBackground />

      <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.ink, color: C.paper, padding: "12px 16px" }}>
        <div className="flex items-center justify-between" style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="flex items-center gap-2">
            <Compass size={20} color={C.primaryLight} />
            <span className="display" style={{ fontSize: 18, fontWeight: 600 }}>Rihla</span>
            <span style={{ fontSize: 11, opacity: 0.6 }} className="hidden sm:inline">plan your escape</span>
          </div>
          <div className="flex items-center gap-2 mono" style={{ fontSize: 12 }}>
            <Wallet size={14} color={C.primaryLight} />
            <span>{fmt(trip.budget)}</span>
            <ArrowRight size={12} style={{ opacity: 0.5 }} />
            <span style={{ color: remaining < 0 ? "#E38A99" : C.primaryLight, fontWeight: 600 }}>{fmt(remaining)} left</span>
          </div>
        </div>
        <div className="flex overflow-x-auto" style={{ maxWidth: 900, margin: "12px auto 0", gap: 8, paddingBottom: 4 }}>
          {steps.map((s, i) => (
            <button key={s} onClick={() => goto(i)} className="flex flex-col items-center" style={{ gap: 4, flexShrink: 0, width: 56, background: "none", border: "none" }}>
              <div className="mono flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 999, fontSize: 12, fontWeight: 600, background: i < step ? C.secondary : i === step ? C.primary : "rgba(255,255,255,0.12)", color: i <= step ? C.paper : "#9aa2b5" }}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.03em", whiteSpace: "nowrap", color: i === step ? C.paper : "#9aa2b5" }}>{s}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 900, margin: "0 auto", padding: 16, paddingBottom: 100 }}>
        {step === 0 && <PreferencesStep settings={settings} toggleArr={toggleArr} setSettings={setSettings} />}
        {step === 1 && <TripStep trip={trip} setTrip={setTrip} />}
        {step === 2 && <DiscoverStep suggested={suggested} destId={destId} setDestId={setDestId} trip={trip} home={home} />}
        {step === 3 && <FlightStep dest={dest} flights={flights} flight={flight} setFlight={setFlight} />}
        {step === 4 && <HotelStep dest={dest} hotels={hotels} hotel={hotel} setHotel={setHotel} rooms={rooms} setRooms={setRooms} nights={nights} />}
        {step === 5 && <PlanStep dest={dest} activities={activities} days={days} plan={plan} addToDay={addToDay} removeFromDay={removeFromDay} setCustomActivities={setCustomActivities} participants={participants} />}
        {step === 6 && <ExportStep trip={trip} dest={dest} flight={flight} hotel={hotel} rooms={rooms} nights={nights} plan={plan} breakdown={breakdown} setBreakdown={setBreakdown} flightTotal={flightTotal} hotelTotal={hotelTotal} activitiesTotal={activitiesTotal} remaining={remaining} home={home} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10, background: "#fff", borderTop: `1px solid ${C.line}`, padding: "12px 16px" }}>
        <div className="flex justify-between" style={{ maxWidth: 900, margin: "0 auto" }}>
          <button onClick={() => goto(Math.max(0, step - 1))} disabled={step === 0} className="flex items-center gap-1" style={{ fontSize: 14, padding: "8px 16px", borderRadius: 6, background: "none", border: "none", opacity: step === 0 ? 0.3 : 1, color: C.ink }}>
            <ArrowLeft size={16} /> Back
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => goto(Math.min(steps.length - 1, step + 1))} className="flex items-center gap-1" style={{ fontSize: 14, padding: "9px 20px", borderRadius: 999, background: C.primary, color: C.paper, border: "none", fontWeight: 500 }}>
              Continue <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PreferencesStep({ settings, toggleArr, setSettings }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 style={{ fontSize: 24 }}>Your standing preferences</h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: -16 }}>Set these once. Every flight and stay you're shown will already match — jump to any step above any time without losing them.</p>

      <div>
        <span style={labelStyle}>Preferred airlines</span>
        <div className="flex flex-wrap gap-2">
          {AIRLINES.map((a) => (<button key={a} onClick={() => toggleArr("airlines", a)} style={pill(settings.airlines.includes(a))}>{a}</button>))}
        </div>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>None selected = show all airlines.</div>
      </div>
      <div>
        <span style={labelStyle}>Hotel star rating</span>
        <div className="flex flex-wrap gap-2">
          {[3, 4, 5].map((s) => (<button key={s} onClick={() => toggleArr("stars", s)} style={pill(settings.stars.includes(s))}>{s}★</button>))}
        </div>
      </div>
      <div>
        <span style={labelStyle}>Residence type</span>
        <div className="flex flex-wrap gap-2">
          {["hotel", "apartment"].map((t) => (<button key={t} onClick={() => toggleArr("propType", t)} style={pill(settings.propType.includes(t))}>{t === "hotel" ? "Hotel" : "Apartment"}</button>))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2" style={{ fontSize: 14 }}><input type="checkbox" checked={settings.freeCancel} onChange={() => setSettings((s) => ({ ...s, freeCancel: !s.freeCancel }))} /> Free cancellation only</label>
        <label className="flex items-center gap-2" style={{ fontSize: 14 }}><input type="checkbox" checked={settings.breakfast} onChange={() => setSettings((s) => ({ ...s, breakfast: !s.breakfast }))} /> Breakfast included only</label>
      </div>
    </div>
  );
}

function TripStep({ trip, setTrip }) {
  return (
    <div className="flex flex-col gap-6">
      <h2 style={{ fontSize: 24 }}>Tell me about this trip</h2>
      <div className="grid grid-cols-2 gap-3">
        <div><span style={labelStyle}>From</span>
          <select style={inputStyle} value={trip.from} onChange={(e) => setTrip({ ...trip, from: e.target.value })}>
            {HOME_CITIES.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
        </div>
        <div><span style={labelStyle}>Budget (SAR)</span><input type="number" style={inputStyle} value={trip.budget} onChange={(e) => setTrip({ ...trip, budget: Number(e.target.value) })} /></div>
        <div><span style={labelStyle}>Start date</span><input type="date" style={inputStyle} value={trip.start} onChange={(e) => setTrip({ ...trip, start: e.target.value })} /></div>
        <div><span style={labelStyle}>End date</span><input type="date" style={inputStyle} value={trip.end} onChange={(e) => setTrip({ ...trip, end: e.target.value })} /></div>
      </div>
      <div>
        <span style={labelStyle}>Mood</span>
        <div className="flex flex-wrap gap-2">{MOODS.map((m) => (<button key={m} onClick={() => setTrip({ ...trip, mood: m })} style={pill(trip.mood === m)}>{m}</button>))}</div>
      </div>
      <div>
        <span style={labelStyle}>Type of travel</span>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (<button key={t.id} onClick={() => setTrip({ ...trip, type: t.id })} style={pill(trip.type === t.id)} className="flex items-center gap-1.5"><t.icon size={13} /> {t.label}</button>))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><span style={labelStyle}>Adults</span><input type="number" min={1} style={inputStyle} value={trip.adults} onChange={(e) => setTrip({ ...trip, adults: Math.max(1, Number(e.target.value)) })} /></div>
        <div><span style={labelStyle}>Kids</span><input type="number" min={0} style={inputStyle} value={trip.kids} onChange={(e) => setTrip({ ...trip, kids: Math.max(0, Number(e.target.value)) })} /></div>
      </div>
      <div>
        <span style={labelStyle}>Traveler names (optional, comma separated)</span>
        <input style={inputStyle} placeholder="e.g. Kholuod, Sami, Layla" onChange={(e) => setTrip({ ...trip, names: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
      </div>
    </div>
  );
}

function DiscoverStep({ suggested, destId, setDestId, trip, home }) {
  const top = suggested.slice(0, 8);
  const c = 50;
  return (
    <div className="flex flex-col gap-5">
      <h2 style={{ fontSize: 24 }}>Where the compass points</h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: -12 }}>Based on {trip.type} · {trip.mood.toLowerCase()} mood, from {home.name}. Rings mark rough flight time.</p>

      <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", maxWidth: 420, margin: "0 auto", borderRadius: 999, overflow: "hidden", border: `1px solid ${C.line}`, background: C.ocean }}>
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[1, 2, 3].map((r) => (<circle key={r} cx={c} cy={c} r={(r / 3) * (c - 8)} fill="none" stroke={C.line} strokeWidth="0.5" />))}
          <circle cx={c} cy={c} r="2" fill={C.ink} />
          <text x={c} y={c + 6.5} textAnchor="middle" fontSize="3.4" fill={C.ink} fontFamily="IBM Plex Mono" fontWeight="600">{home.name}</text>
          {top.map((d) => {
            const ring = d.hours < 4 ? 1 : d.hours < 9 ? 2 : 3;
            const rad = (ring / 3) * (c - 8);
            const angle = (bearingDeg(home, d) * Math.PI) / 180;
            const x = c + rad * Math.sin(angle);
            const y = c - rad * Math.cos(angle);
            const active = destId === d.id;
            return (
              <g key={d.id} onClick={() => setDestId(d.id)} style={{ cursor: "pointer" }}>
                <line x1={c} y1={c} x2={x} y2={y} stroke={active ? C.secondary : C.primary} strokeWidth={active ? 0.6 : 0.35} strokeDasharray={active ? "0" : "1.2,1.2"} opacity={active ? 0.9 : 0.55} />
                <circle cx={x} cy={y} r={active ? 2.1 : 1.6} fill={active ? C.secondary : C.primary} stroke="#fff" strokeWidth="0.4" />
                <text x={x} y={y - 3} fontSize="3.4" fontWeight={active ? 700 : 500} textAnchor="middle" fill={C.ink}>{d.name}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <p style={{ fontSize: 11, opacity: 0.5, marginTop: -12, textAlign: "center" }}>A simplified compass, not to scale — tap a pin or a card to pick a destination.</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {top.map((d) => {
          const active = destId === d.id;
          return (
            <Stub key={d.id} style={selectedRing(active, C.primary)}>
              <div onClick={() => setDestId(d.id)} style={{ padding: "12px 20px", cursor: "pointer" }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>{d.hours}h · {d.hours >= 10 ? "long-haul" : d.hours >= 5 ? "mid-haul" : "short-haul"}</span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{d.region}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{d.blurb}</div>
                <div className="mono" style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>from {fmt(d.base)}/adult</div>
              </div>
            </Stub>
          );
        })}
      </div>
    </div>
  );
}

function FlightStep({ dest, flights, flight, setFlight }) {
  const [expanded, setExpanded] = useState(null);
  if (!dest) return <p>Pick a destination first.</p>;
  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontSize: 24 }}>Flights to {dest.name}</h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: -8 }}>Filtered to your preferred airlines from settings. Tap a card for full details.</p>
      <div className="flex flex-col gap-2">
        {flights.map((f) => {
          const isOpen = expanded === f.id;
          const isSelected = flight?.id === f.id;
          return (
            <Stub key={f.id} style={selectedRing(isSelected, C.primary)}>
              {isSelected && <SelectedBadge />}
              <div style={{ padding: "12px 20px" }}>
                <div className="flex items-center justify-between gap-2" style={{ cursor: "pointer" }} onClick={() => setExpanded(isOpen ? null : f.id)}>
                  <div>
                    <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: 14 }}><Plane size={14} color={C.primary} />{f.airline}</div>
                    <div className="mono" style={{ fontSize: 12, opacity: 0.6 }}>{f.depart} · {f.duration.toFixed(1)}h · {f.stops === 0 ? "nonstop" : f.stops + " stop" + (f.stops > 1 ? "s" : "")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ textAlign: "right" }}><div className="mono" style={{ fontWeight: 600 }}>{fmt(f.price)}</div><div style={{ fontSize: 10, opacity: 0.5 }}>/adult, round trip</div></div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px dashed ${C.line}`, fontSize: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Outbound</div><div className="mono">{f.depart} → {f.arrive}</div></div>
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Stops</div><div>{f.stops === 0 ? "Nonstop" : `${f.stops} stop(s), ~1h20 each`}</div></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Return flight</div><div className="mono">{f.returnDepart} → {addMinutes(f.returnDepart, f.duration * 60)}</div></div>
                      <div><div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.5 }}>Duration</div><div>{f.duration.toFixed(1)}h each way</div></div>
                    </div>
                    <button onClick={() => setFlight(f)} className="flex items-center gap-1.5" style={{ marginTop: 4, fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 999, background: isSelected ? C.secondary : C.primary, color: C.paper, border: "none", alignSelf: "flex-start" }}>
                      <Check size={13} /> {isSelected ? "Selected — change" : "Select this flight"}
                    </button>
                  </div>
                )}
              </div>
            </Stub>
          );
        })}
        {flights.length === 0 && <p style={{ fontSize: 14, opacity: 0.6 }}>No flights match your preferred airlines for this route — adjust preferences in Settings.</p>}
      </div>
    </div>
  );
}

function HotelStep({ dest, hotels, hotel, setHotel, rooms, setRooms, nights }) {
  if (!dest) return <p>Pick a destination first.</p>;
  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontSize: 24 }}>Stays in {dest.name}</h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: -8 }}>{nights} night{nights !== 1 ? "s" : ""} · filtered to your saved preferences.</p>
      <div className="flex flex-col gap-2">
        {hotels.map((h) => {
          const isSelected = hotel?.id === h.id;
          return (
            <Stub key={h.id} style={selectedRing(isSelected, C.primary)}>
              {isSelected && <SelectedBadge />}
              <div onClick={() => setHotel(h)} className="flex items-center justify-between gap-2" style={{ padding: "12px 20px", cursor: "pointer" }}>
                <div>
                  <div className="flex items-center gap-2" style={{ fontWeight: 600, fontSize: 14 }}><Hotel size={14} color={C.secondary} />{h.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{"★".repeat(h.stars)} · {h.type} · {h.area}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{h.freeCancel ? "Free cancellation" : "Non-refundable"} · {h.breakfast ? "Breakfast included" : "No breakfast"}</div>
                </div>
                <div style={{ textAlign: "right" }}><div className="mono" style={{ fontWeight: 600 }}>{fmt(h.price)}</div><div style={{ fontSize: 10, opacity: 0.5 }}>/night</div></div>
              </div>
            </Stub>
          );
        })}
        {hotels.length === 0 && <p style={{ fontSize: 14, opacity: 0.6 }}>No stays match your preferences — adjust filters in Settings.</p>}
      </div>
      {hotel && (
        <div className="flex items-center gap-3" style={{ paddingTop: 4 }}>
          <span style={{ fontSize: 14 }}>Rooms:</span>
          <button onClick={() => setRooms(Math.max(1, rooms - 1))} style={{ width: 28, height: 28, borderRadius: 999, background: "#fff", border: `1px solid ${C.line}` }}>–</button>
          <span className="mono">{rooms}</span>
          <button onClick={() => setRooms(rooms + 1)} style={{ width: 28, height: 28, borderRadius: 999, background: "#fff", border: `1px solid ${C.line}` }}>+</button>
          <span className="mono" style={{ fontSize: 14, opacity: 0.7, marginLeft: "auto" }}>{fmt(hotel.price * nights * rooms)} total</span>
        </div>
      )}
    </div>
  );
}

function PlanStep({ dest, activities, days, plan, addToDay, removeFromDay, setCustomActivities, participants }) {
  const [picked, setPicked] = useState(null);
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newPerPerson, setNewPerPerson] = useState(true);
  if (!dest) return <p>Pick a destination first.</p>;

  function addCustom() {
    if (!newName.trim()) return;
    setCustomActivities((c) => [...c, { id: uid(), name: newName.trim(), icon: "✨", cost: Number(newCost) || 0, perPerson: newPerPerson }]);
    setNewName(""); setNewCost("");
  }

  function costTag(a) {
    if (!a.cost) return "free";
    if (a.perPerson === false) return `${fmt(a.cost)} total`;
    return participants > 1 ? `${fmt(a.cost)} pp · ${fmt(a.cost * participants)} total` : `${fmt(a.cost)} pp`;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 style={{ fontSize: 24 }}>Shape your days in {dest.name}</h2>
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: -8 }}>Tap an activity, then tap a day to add it there. "pp" means per person.</p>
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
        <style>{`@media (min-width: 640px){ .plan-grid { grid-template-columns: 1fr 1.4fr !important; } }`}</style>
        <div className="plan-grid grid gap-4" style={{ gridTemplateColumns: "1fr" }}>
          <div className="flex flex-col gap-2">
            <span style={labelStyle}>Activities</span>
            {activities.map((a) => (
              <button key={a.id} onClick={() => setPicked(picked?.id === a.id ? null : a)} className="flex items-center gap-2" style={{ width: "100%", background: "#fff", border: `1px solid ${picked?.id === a.id ? C.primary : C.line}`, borderRadius: 6, padding: "8px 12px", fontSize: 14, textAlign: "left", boxShadow: picked?.id === a.id ? `0 0 0 2px ${C.primaryLight}` : "none" }}>
                <span>{a.icon}</span><span style={{ flex: 1 }}>{a.name}</span><span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>{costTag(a)}</span>
              </button>
            ))}
            <div className="flex flex-col gap-2" style={{ paddingTop: 8, borderTop: `1px dashed ${C.line}` }}>
              <span style={labelStyle}>Add your own</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Activity name" style={{ ...inputStyle, padding: "0 10px", height: 36 }} />
              <div className="flex gap-2">
                <input value={newCost} onChange={(e) => setNewCost(e.target.value)} type="number" placeholder="Cost (SAR)" style={{ ...inputStyle, padding: "0 10px", height: 36, flex: 1 }} />
                <button onClick={addCustom} className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, padding: "0 14px", borderRadius: 6, background: C.primary, color: C.paper, border: "none" }}><Plus size={13} />Add</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNewPerPerson(true)} style={pill(newPerPerson, C.secondary)}>Per person</button>
                <button onClick={() => setNewPerPerson(false)} style={pill(!newPerPerson, C.secondary)}>Total for everyone</button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span style={labelStyle}>Daily plan{picked && <span style={{ color: C.secondary, textTransform: "none" }}> — tap a day to add "{picked.name}"</span>}</span>
            {days.map((day, i) => (
              <div key={day} onClick={() => { if (picked) { addToDay(day, picked); setPicked(null); } }} style={{ background: "#fff", border: `1px dashed ${picked ? C.primary : "#D8CFB4"}`, borderRadius: 6, padding: 8, minHeight: 52, cursor: "pointer" }}>
                <div className="mono" style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>Day {i + 1} · {day}</div>
                <div className="flex flex-wrap gap-1.5">
                  {(plan[day] || []).map((a, idx) => (
                    <span key={idx} className="flex items-center gap-1" style={{ background: C.paper, border: `1px solid ${C.line}`, borderRadius: 999, padding: "4px 8px", fontSize: 12 }}>
                      {a.icon} {a.name}
                      <button onClick={(e) => { e.stopPropagation(); removeFromDay(day, idx); }} style={{ background: "none", border: "none", display: "flex" }}><X size={10} /></button>
                    </span>
                  ))}
                  {(!plan[day] || plan[day].length === 0) && <span style={{ fontSize: 11, opacity: 0.4 }}>Tap here to add</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve(); s.onerror = () => reject(new Error("load failed: " + src));
    document.body.appendChild(s);
  });
}

function ExportStep({ trip, dest, flight, hotel, rooms, nights, plan, breakdown, setBreakdown, flightTotal, hotelTotal, activitiesTotal, remaining, home }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const pageRefs = useRef([]);
  pageRefs.current = [];
  const addRef = (el) => { if (el) pageRefs.current.push(el); };

  if (!dest) return <p>Pick a destination first.</p>;
  const quote = QUOTES[Math.abs((dest.name.length + trip.adults) % QUOTES.length)];

  async function downloadPdf() {
    setError(""); setExporting(true);
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "pt", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < pageRefs.current.length; i++) {
        const canvas = await window.html2canvas(pageRefs.current[i], { scale: 2, backgroundColor: "#ffffff" });
        const imgData = canvas.toDataURL("image/png");
        const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * ratio, h = canvas.height * ratio;
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      }
      pdf.save(`trip-${dest.name.replace(/\s+/g, "-").toLowerCase()}.pdf`);
    } catch (e) {
      setError("Couldn't generate the PDF just now — check your connection and try again.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={labelStyle}>Adjust before exporting</span>
        <div className="grid grid-cols-3 gap-3">
          {["food", "shopping", "transport"].map((k) => (
            <div key={k}><label style={{ fontSize: 12, opacity: 0.6, textTransform: "capitalize" }}>{k} (SAR)</label>
              <input type="number" className="mono" style={{ ...inputStyle, padding: "6px 8px" }} value={breakdown[k]} onChange={(e) => setBreakdown({ ...breakdown, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
        <button onClick={downloadPdf} disabled={exporting} className="flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600, padding: "10px 20px", borderRadius: 999, background: C.secondary, color: C.paper, border: "none", opacity: exporting ? 0.6 : 1, alignSelf: "flex-start" }}>
          <Printer size={16} /> {exporting ? "Preparing PDF…" : "Download PDF"}
        </button>
        {error && <p style={{ fontSize: 12, color: C.warn }}>{error}</p>}
      </div>

      <div ref={addRef} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 24 }}>
        <div className="mono" style={{ fontSize: 11, textTransform: "uppercase", opacity: 0.5 }}>Trip document</div>
        <h1 style={{ fontSize: 30, marginTop: 4 }}>{dest.name}</h1>
        <div style={{ fontSize: 14, opacity: 0.7 }}>{dest.region} · {trip.start} → {trip.end} · {nights} nights · from {home.name}</div>
        <div className="flex items-center gap-2" style={{ marginTop: 16, fontSize: 14 }}>
          <Users size={15} /> {trip.adults} adult{trip.adults !== 1 ? "s" : ""}{trip.kids ? `, ${trip.kids} kid${trip.kids !== 1 ? "s" : ""}` : ""}
          {trip.names.length > 0 && <span style={{ opacity: 0.6 }}>— {trip.names.join(", ")}</span>}
        </div>
      </div>

      <div ref={addRef} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>Flight & stay</h2>
        {flight && <div className="flex items-center gap-2" style={{ fontSize: 14 }}><Plane size={15} color={C.primary} /> {flight.airline} · {flight.stops === 0 ? "nonstop" : flight.stops + " stop(s)"} · {flight.duration.toFixed(1)}h · <span className="mono">{fmt(flightTotal)}</span></div>}
        {hotel && <div className="flex items-center gap-2" style={{ fontSize: 14 }}><Hotel size={15} color={C.secondary} /> {hotel.name} · {"★".repeat(hotel.stars)} · {rooms} room{rooms !== 1 ? "s" : ""} · {hotel.area} · <span className="mono">{fmt(hotelTotal)}</span></div>}
      </div>

      <div ref={addRef} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Daily plan</h2>
        <div className="flex flex-col gap-2">
          {Object.entries(plan).filter(([, v]) => v.length).map(([day, acts]) => (
            <div key={day} style={{ fontSize: 14 }}><span className="mono" style={{ opacity: 0.6 }}>{day}</span> — {acts.map((a) => a.name).join(", ")}</div>
          ))}
          {Object.values(plan).flat().length === 0 && <div style={{ fontSize: 14, opacity: 0.5 }}>No activities planned yet.</div>}
        </div>
      </div>

      <div ref={addRef} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 8, padding: 24 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Budget breakdown</h2>
        <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
          <tbody>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Flight</td><td className="mono" style={{ textAlign: "right" }}>{fmt(flightTotal)}</td></tr>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Residence</td><td className="mono" style={{ textAlign: "right" }}>{fmt(hotelTotal)}</td></tr>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Activities</td><td className="mono" style={{ textAlign: "right" }}>{fmt(activitiesTotal)}</td></tr>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Food</td><td className="mono" style={{ textAlign: "right" }}>{fmt(breakdown.food)}</td></tr>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Shopping</td><td className="mono" style={{ textAlign: "right" }}>{fmt(breakdown.shopping)}</td></tr>
            <tr style={{ borderBottom: `1px solid ${C.ocean}` }}><td style={{ padding: "6px 0" }}>Car / trains</td><td className="mono" style={{ textAlign: "right" }}>{fmt(breakdown.transport)}</td></tr>
            <tr><td style={{ padding: "8px 0", fontWeight: 600 }}>Remaining of {fmt(trip.budget)} budget</td><td className="mono" style={{ textAlign: "right", fontWeight: 600, color: remaining < 0 ? C.warn : C.ink }}>{fmt(remaining)}</td></tr>
          </tbody>
        </table>
      </div>

      <div ref={addRef} style={{ background: C.ink, color: C.paper, borderRadius: 8, padding: 32, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
        <Sparkles color={C.primaryLight} style={{ marginBottom: 12 }} />
        <p className="display" style={{ fontSize: 20, fontStyle: "italic", maxWidth: 380 }}>{quote}</p>
        <div style={{ fontSize: 11, opacity: 0.5, marginTop: 32 }}>Made with 🤍 by Kholuod</div>
      </div>
    </div>
  );
}
