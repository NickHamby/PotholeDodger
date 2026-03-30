import { buildClusters, selectWaypoints } from './hazards.js';
import { geocode, attachAutocomplete } from './geocode.js';
import { fetchOsrmRoute, formatDuration, formatDistance, buildMapsUrl } from './routing.js';
import { renderHazardMap } from './map.js';

// ── DOM refs ──────────────────────────────────────────────────────────────────
const originInput      = document.getElementById('origin');
const destInput        = document.getElementById('destination');
const locateBtn        = document.getElementById('locateBtn');
const goBtn            = document.getElementById('goBtn');
const statusEl         = document.getElementById('status');
const geoStatusEl      = document.getElementById('geoStatus');
const previewPanel     = document.getElementById('previewPanel');
const directStatsEl    = document.getElementById('directStats');
const dodgeStatsEl     = document.getElementById('dodgeStats');
const recommendationEl = document.getElementById('recommendation');
const dodgeBtnEl       = document.getElementById('dodgeBtn');
const directBtnEl      = document.getElementById('directBtn');

// ── Route preview thresholds ──────────────────────────────────────────────────
const MAX_ACCEPTABLE_DETOUR_SECONDS    = 180;  // 3 minutes
const MAX_ACCEPTABLE_DETOUR_PERCENTAGE = 0.15; // 15%

// ── Autocomplete ──────────────────────────────────────────────────────────────
const originAC = attachAutocomplete(originInput, document.getElementById('originDropdown'));
const destAC   = attachAutocomplete(destInput,   document.getElementById('destDropdown'));

function closeAllDropdowns() {
  originAC.closeDropdown();
  destAC.closeDropdown();
}

// Close dropdowns when clicking outside
document.addEventListener('mousedown', (e) => {
  if (!e.target.closest('.autocomplete-wrapper')) closeAllDropdowns();
});

// ── Geolocation ───────────────────────────────────────────────────────────────
locateBtn.addEventListener('click', () => {
  closeAllDropdowns();
  if (!navigator.geolocation) {
    geoStatusEl.textContent = 'Geolocation not supported by this browser.';
    return;
  }
  geoStatusEl.textContent = 'Locating…';
  locateBtn.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(6);
      const lng = pos.coords.longitude.toFixed(6);
      originInput.value = `${lat},${lng}`;
      geoStatusEl.textContent = `📍 Using your location (${lat}, ${lng})`;
      locateBtn.disabled = false;
    },
    (err) => {
      geoStatusEl.textContent = `Could not get location: ${err.message}`;
      locateBtn.disabled = false;
    },
    { timeout: 10000 }
  );
});

// ── Main handler ──────────────────────────────────────────────────────────────
goBtn.addEventListener('click', async () => {
  closeAllDropdowns();
  const originAddr = originInput.value.trim();
  const destAddr   = destInput.value.trim();

  if (!originAddr) {
    setStatus('Please enter an origin address.', 'error');
    return;
  }
  if (!destAddr) {
    setStatus('Please enter a destination address.', 'error');
    return;
  }

  goBtn.disabled = true;
  previewPanel.classList.remove('visible');
  setStatus('<span class="spinner"></span>Geocoding addresses…', '');

  try {
    let origin, dest;
    try {
      origin = await geocode(originAddr);
    } catch {
      setStatus('Could not find origin address — try being more specific.', 'error');
      return;
    }
    try {
      dest = await geocode(destAddr);
    } catch {
      setStatus('Could not find destination address — try being more specific.', 'error');
      return;
    }

    setStatus('<span class="spinner"></span>Computing route…', '');

    const clusters  = buildClusters();
    const { waypoints, dodgedClusters, skippedClusters } = selectWaypoints(origin, dest, clusters);

    const dodgeMapsUrl   = buildMapsUrl(origin, dest, waypoints);
    const directMapsUrl  = buildMapsUrl(origin, dest, []);

    setStatus('<span class="spinner"></span>Fetching route stats…', '');

    // Fetch direct and dodging route stats from OSRM in parallel (best-effort)
    const directCoords = [[origin.lng, origin.lat], [dest.lng, dest.lat]];
    const dodgeCoords  = waypoints.length
      ? [
          [origin.lng, origin.lat],
          ...waypoints.map(w => [w.anchorLng, w.anchorLat]),
          [dest.lng, dest.lat]
        ]
      : directCoords;

    const [directStats, dodgeStats] = await Promise.all([
      fetchOsrmRoute(directCoords),
      fetchOsrmRoute(dodgeCoords)
    ]);

    // Populate preview panel — handle unavailable OSRM stats gracefully
    if (directStats && dodgeStats) {
      directStatsEl.textContent = `${formatDuration(directStats.duration)} · ${formatDistance(directStats.distance)}`;
      dodgeStatsEl.textContent  = `${formatDuration(dodgeStats.duration)} · ${formatDistance(dodgeStats.distance)}`;

      const extraSec  = dodgeStats.duration - directStats.duration;
      const extraPct  = directStats.duration > 0 ? extraSec / directStats.duration : 0;

      if (!waypoints.length) {
        recommendationEl.textContent = 'No hazard clusters found — route is already clear';
        recommendationEl.className   = 'preview-recommendation green';
      } else if (extraSec > MAX_ACCEPTABLE_DETOUR_SECONDS || extraPct > MAX_ACCEPTABLE_DETOUR_PERCENTAGE) {
        recommendationEl.textContent = `This detour adds ${formatDuration(extraSec)} — consider taking the direct route`;
        recommendationEl.className   = 'preview-recommendation yellow';
      } else {
        recommendationEl.textContent = `Detour adds only ${formatDuration(extraSec)} to avoid ${waypoints.length} pothole cluster${waypoints.length > 1 ? 's' : ''}`;
        recommendationEl.className   = 'preview-recommendation green';
      }
    } else {
      directStatsEl.textContent = 'Route stats unavailable';
      dodgeStatsEl.textContent  = 'Route stats unavailable';
      recommendationEl.textContent = 'Stats unavailable — open Google Maps to compare';
      recommendationEl.className   = 'preview-recommendation';
    }

    dodgeBtnEl.href  = dodgeMapsUrl;
    directBtnEl.href = directMapsUrl;

    setStatus('', '');
    previewPanel.classList.add('visible');
    renderHazardMap(origin, dest, waypoints, dodgedClusters, skippedClusters);
  } catch (err) {
    setStatus(`Error: ${err.message}`, 'error');
  } finally {
    goBtn.disabled = false;
  }
});

function setStatus(html, type) {
  statusEl.innerHTML = html;
  statusEl.className = 'status' + (type ? ` ${type}` : '');
}
