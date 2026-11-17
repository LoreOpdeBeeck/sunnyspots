#!/usr/bin/env node
// Builds antwerp-cafes.json for the Sunny cafés & coffee bars map.
// Run once a day (cron, GitHub Actions, your host's scheduler):   node update-cafes.mjs
// Needs Node.js 18 or newer. No packages to install.
//
// Data © OpenStreetMap contributors (ODbL). Keep the OpenStreetMap credit visible on the map.

import { writeFile, rename } from 'node:fs/promises';

const OUT = process.argv[2] || 'antwerp-cafes.json';
const BBOX = { s: 51.14, w: 4.25, n: 51.33, e: 4.55 };     // same area as the map
const CONTACT = 'https://github.com/LoreOpdeBeeck/sunnyspots';   // identifies this project to the Overpass operators
const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const NOT_COFFEE = /(\bijs|ijssalon|gelat|ice ?cream|glace|frozen yog|softijs)/i;

const query = `[out:json][timeout:60];nwr["amenity"~"^(cafe|bar|pub|biergarten)$"](${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e});out center tags;`;

async function fetchOverpass() {
  let last;
  // two rounds over all servers; wait a bit before the second round (busy servers often recover quickly)
  for (const [round, url] of [...SERVERS.map(u => [1, u]), ...SERVERS.map(u => [2, u])]) {
    if (round === 2 && url === SERVERS[0]) { console.log('All servers busy, retrying in 45 s…'); await new Promise(r => setTimeout(r, 45_000)); }
    console.log(`Round ${round}: ${url}`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(query),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': `sunny-cafes-antwerp/1.0 (${CONTACT})` },
        signal: AbortSignal.timeout(75_000)
      });
      if (!res.ok) { last = new Error(`${url} → HTTP ${res.status}`); console.log('  ' + last.message); continue; }
      return await res.json();
    } catch (e) { last = e; console.log('  ' + (e.name === 'TimeoutError' ? 'timed out' : e.message)); }
  }
  throw last;
}

const terrace = v => v == null ? null : /^(yes|terrace|garden|pedestrian_zone|sidewalk|street|patio|veranda|roof)/.test(v) ? 1 : v === 'no' ? 0 : null;

const data = await fetchOverpass();
const pois = [];
const seen = new Set();
for (const el of data.elements || []) {
  const t = el.tags || {};
  const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
  if (lat == null || !t.name) continue;
  if (/ice_cream|frozen_yogurt/.test(t.cuisine || '') || NOT_COFFEE.test(t.name)) continue;
  const key = t.name + '|' + lat.toFixed(4) + ',' + lon.toFixed(4);
  if (seen.has(key)) continue; seen.add(key);
  pois.push({
    n: t.name,
    k: t.amenity === 'cafe' ? 'coffee' : 'cafe',          // in Antwerp a "café" is a pub/bar; coffee bars are amenity=cafe
    la: +lat.toFixed(6), lo: +lon.toFixed(6),
    oh: t.opening_hours || '',
    t: terrace(t.outdoor_seating)
  });
}
if (pois.length < 100) throw new Error(`Only ${pois.length} places returned — not overwriting the existing file.`);
pois.sort((a, b) => a.n.localeCompare(b.n));
const json = JSON.stringify({ updated: new Date().toISOString(), source: '© OpenStreetMap contributors (ODbL)', pois });
await writeFile(OUT + '.tmp', json);
await rename(OUT + '.tmp', OUT);
console.log(`Wrote ${pois.length} places to ${OUT} (${(json.length / 1024).toFixed(0)} KB)`);
