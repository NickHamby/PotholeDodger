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
  // Returns null on any network or server failure (best-effort enhancement).
  try {
    const coordStr = coordPairs.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&steps=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || !data.routes.length) return null;
    return { duration: data.routes[0].duration, distance: data.routes[0].distance };
  } catch {
    return null;
  }
}

// ── OSRM route with street-name extraction ────────────────────────────────��───
export async function fetchOsrmRouteWithSteps(coordPairs) {
  // coordPairs: array of [lng, lat]
  // Returns { duration, distance, streetNames: Set<string> } or null on failure.
  try {
    const coordStr = coordPairs.map(([lng, lat]) => `${lng},${lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=false&steps=true`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.routes || !data.routes.length) return null;
    const route = data.routes[0];
    const streetNames = new Set();
    for (const leg of route.legs) {
      for (const step of leg.steps) {
        const name = (step.name || '').trim().toLowerCase();
        if (name) streetNames.add(name);
      }
    }
    return { duration: route.duration, distance: route.distance, streetNames };
  } catch {
    return null;
  }
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

export function formatDistance(metres) {
  return `${(metres / 1609.34).toFixed(1)} mi`;
}