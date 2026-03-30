// ── Build Google Maps URL ─────────────────────────────────────────────────────
export function buildMapsUrl(origin, dest, waypoints) {
  let url = `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin.lat},${origin.lng}` +
    `&destination=${dest.lat},${dest.lng}` +
    `&travelmode=driving`;
  if (waypoints.length) {
    const wStr = waypoints
      .map(w => `${w.anchorLat.toFixed(6)},${w.anchorLng.toFixed(6)}`)
      .join('|');
    url += `&waypoints=${wStr}`;
  }
  return url;
}

// ── OSRM route stats ──────────────────────────────────────────────────────────
export async function fetchOsrmRoute(coordPairs) {
  // coordPairs: array of [lng, lat]
  const coordStr = coordPairs.map(([lng, lat]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&steps=false`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM request failed (${res.status})`);
  const data = await res.json();
  if (!data.routes || !data.routes.length) throw new Error('No OSRM route found');
  return { duration: data.routes[0].duration, distance: data.routes[0].distance };
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function formatDistance(metres) {
  return `${(metres / 1609.34).toFixed(1)} mi`;
}
