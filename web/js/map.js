// ── Hazard map (Leaflet) ──────────────────────────────────────────────────────
// L is a browser global loaded via CDN script tag in index.html

let mapInstance = null;

export function renderHazardMap(origin, dest, waypoints, dodgedClusters, skippedClusters) {
  const mapDiv = document.getElementById('hazard-map');

  // Destroy existing map instance to prevent "already initialized" error
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  // Show the map container
  mapDiv.style.display = 'block';

  mapInstance = L.map('hazard-map');

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance);

  const boundsPoints = [];

  // Straight-line path (dashed blue polyline)
  L.polyline(
    [[origin.lat, origin.lng], [dest.lat, dest.lng]],
    { color: '#3b82f6', weight: 2, dashArray: '6,6', opacity: 0.8 }
  ).addTo(mapInstance);
  boundsPoints.push([origin.lat, origin.lng], [dest.lat, dest.lng]);

  // Origin / destination markers
  L.marker([origin.lat, origin.lng]).addTo(mapInstance)
    .bindTooltip('Origin', { permanent: false });
  L.marker([dest.lat, dest.lng]).addTo(mapInstance)
    .bindTooltip('Destination', { permanent: false });

  // Skipped clusters (grey)
  for (const c of skippedClusters) {
    L.circleMarker([c.lat, c.lng], {
      radius: 7, fillColor: '#64748b', color: '#fff', weight: 1, fillOpacity: 0.6
    }).addTo(mapInstance)
      .bindTooltip(`Cluster: ${c.count} hazards — not on this route`, { permanent: false });
    boundsPoints.push([c.lat, c.lng]);
  }

  // Dodged clusters (red)
  for (const c of dodgedClusters) {
    L.circleMarker([c.lat, c.lng], {
      radius: 10, fillColor: '#ef4444', color: '#fff', weight: 1.5, fillOpacity: 0.8
    }).addTo(mapInstance)
      .bindTooltip(`Cluster: ${c.count} hazards — being dodged`, { permanent: false });
    boundsPoints.push([c.lat, c.lng]);
  }

  // Waypoint anchors (blue)
  for (const w of waypoints) {
    L.circleMarker([w.anchorLat, w.anchorLng], {
      radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 2, fillOpacity: 1
    }).addTo(mapInstance)
      .bindTooltip('Detour waypoint', { permanent: false });
    boundsPoints.push([w.anchorLat, w.anchorLng]);
  }

  // Auto-fit bounds
  if (boundsPoints.length) {
    mapInstance.fitBounds(L.latLngBounds(boundsPoints), { padding: [30, 30] });
  }

  // Fix grey tile issue after container becomes visible
  mapInstance.invalidateSize();
}
