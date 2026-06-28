// ─── City autocomplete + geo index ─────────────────────────
// Loads ~34k world cities (GeoNames cities15000) once at module init
// and serves prefix + substring matches via an in-memory scan.
// Each city carries lat/lng/population so we can compute Haversine
// distance and resolve a user's coordinates to the nearest city.
import path from 'path';
import fs from 'fs';

interface CityRow { n: string; r: string; c: string; la: number; lo: number; p: number }

export interface City {
  name: string;
  region: string;
  country: string;
  display: string;
  lat: number;
  lng: number;
  population: number;
}

let CITIES: (City & { key: string })[] = [];
let LOADED = false;

function loadCities(): void {
  if (LOADED) return;
  const candidates = [
    path.resolve(__dirname, '../data/cities-geo.json'),
    path.resolve(__dirname, '../../data/cities-geo.json'),
    path.resolve(__dirname, '../../../data/cities-geo.json'),
    path.resolve(process.cwd(), 'services/shared/data/cities-geo.json'),
    path.resolve(process.cwd(), '../shared/data/cities-geo.json'),
  ];
  const p = candidates.find((c) => fs.existsSync(c));
  if (!p) {
    // Fallback to legacy file without lat/lng (distance ranking disabled).
    const legacy = candidates.map((c) => c.replace('cities-geo.json', 'cities.json')).find((c) => fs.existsSync(c));
    if (!legacy) { LOADED = true; CITIES = []; return; }
    const raw = fs.readFileSync(legacy, 'utf8');
    const rows: { n: string; r: string; c: string }[] = JSON.parse(raw);
    CITIES = rows.map((r) => {
      const display = r.r ? `${r.n}, ${r.r}, ${r.c}` : `${r.n}, ${r.c}`;
      return { name: r.n, region: r.r, country: r.c, display, lat: 0, lng: 0, population: 0, key: r.n.toLowerCase() };
    });
    LOADED = true;
    return;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const rows: CityRow[] = JSON.parse(raw);
  CITIES = rows.map((r) => {
    const display = r.r ? `${r.n}, ${r.r}, ${r.c}` : `${r.n}, ${r.c}`;
    return { name: r.n, region: r.r, country: r.c, display, lat: r.la, lng: r.lo, population: r.p, key: r.n.toLowerCase() };
  });
  LOADED = true;
}

export function searchCities(query: string, limit = 12): City[] {
  if (!LOADED) loadCities();
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: (City & { key: string })[] = [];
  const contains: (City & { key: string })[] = [];
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    if (c.key === q) { prefix.unshift(c); continue; }
    if (c.key.startsWith(q)) prefix.push(c);
    else if (q.length >= 3 && c.key.includes(q)) contains.push(c);
    if (prefix.length >= limit * 4 && contains.length >= limit) break;
  }
  prefix.sort((a, b) => b.population - a.population || a.key.localeCompare(b.key));
  contains.sort((a, b) => b.population - a.population || a.key.localeCompare(b.key));
  return [...prefix, ...contains]
    .slice(0, limit)
    .map(({ name, region, country, display, lat, lng, population }) => ({ name, region, country, display, lat, lng, population }));
}

// ─── Haversine distance (km) ─────────────────────────
const R_KM = 6371;
function toRad(d: number): number { return (d * Math.PI) / 180; }

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function findNearestCity(lat: number, lng: number): City | null {
  if (!LOADED) loadCities();
  if (!CITIES.length) return null;
  let best: (City & { key: string }) | null = null;
  let bestD = Infinity;
  // Lat-band pre-filter (±2° ≈ 220 km) to avoid scanning all 33k cities every call.
  for (let i = 0; i < CITIES.length; i++) {
    const c = CITIES[i];
    if (Math.abs(c.lat - lat) > 2) continue;
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best) {
    for (let i = 0; i < CITIES.length; i++) {
      const c = CITIES[i];
      const d = distanceKm(lat, lng, c.lat, c.lng);
      if (d < bestD) { bestD = d; best = c; }
    }
  }
  if (!best) return null;
  const { name, region, country, display, lat: la, lng: lo, population } = best;
  return { name, region, country, display, lat: la, lng: lo, population };
}

export type CitySearchResult = City;
