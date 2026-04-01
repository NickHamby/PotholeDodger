# PotholeDodger — Copilot Agent Instructions

## What this repo is

PotholeDodger is a client-side web app that routes drivers around pothole and road-hazard hotspots in Richmond, VA. It geocodes a user-supplied origin and destination via Nominatim (OpenStreetMap), fetches a direct route from the OSRM public demo server, clusters 774 hardcoded RVA 311 hazard coordinates that fall along that corridor, and opens a Google Maps Directions URL with up to 3 waypoints that steer around the densest hazard clusters. No build step, no API keys, no back-end. Live at: https://nickhamby.github.io/PotholeDodger/

---

## Repo structure

```
index.html                      — root redirect to web/index.html (GitHub Pages workaround)
output/
  rva311-hazards.txt            — 774 hazard coords as Google Maps search URLs (source data)
scripts/
  rva311_pipeline.py            — Python: fetches RVA 311 data → deduplicates → writes output/rva311-hazards.txt
web/
  index.html                    — HTML skeleton (~63 lines)
  css/
    theme.css                   — dark UI theme
  js/
    hazards.js                  — 774 hardcoded hazard coords + buildClusters() + selectWaypoints() + filterHazardsByStreetNames()
    geocode.js                  — geocode() + attachAutocomplete() — Nominatim OSM, bounded=0, viewbox biased to Richmond VA
    routing.js                  — fetchOsrmRoute() + fetchOsrmRouteWithSteps() + formatDuration() + formatDistance() + buildMapsUrl()
    map.js                      — renderHazardMap() — Leaflet map rendering
    app.js                      — DOM wiring + main click handler
.github/
  workflows/
    rva311-pipeline.yml         — GitHub Actions: runs scripts/rva311_pipeline.py on workflow_dispatch
    test.yml                    — GitHub Actions: unit tests + E2E tests on push/PR to main
  copilot-instructions.md       — this file
tests/
  unit/
    routing.test.js
    hazards.test.js
  e2e/
    app.test.js
```

---

## Tech stack and key dependencies

| Dependency | Role | Notes |
|---|---|---|
| Vanilla JS ES modules | App logic | No bundler, no build step |
| Leaflet 1.9.4 | Map rendering | Loaded from unpkg CDN |
| Nominatim (OpenStreetMap) | Geocoding + reverse-geocoding | No API key; must respect usage policy |
| OSRM public demo server | Route stats (distance, duration, steps) | Best-effort / demo only; not for production load; always handle `null` |
| Google Maps Directions URL API | Opens route in new tab | No API key needed |
| GitHub Pages | Deployment | Serves from `main /` root |
| Vitest | Unit tests | jsdom environment |
| Playwright | E2E tests | Chromium only, serves `web/` on port 3000 |
| Python 3.11 + requests | Data pipeline | `scripts/rva311_pipeline.py` |

---

## How to run tests

```bash
npm install          # always run first
npm test             # unit tests (vitest)
npm run test:e2e     # E2E tests (Playwright, chromium)
```

Test files:
- `tests/unit/routing.test.js`
- `tests/unit/hazards.test.js`
- `tests/e2e/app.test.js`

---

## Routing algorithm (hazards.js)

**Constants:**

| Parameter | Value | Meaning |
|---|---|---|
| `CELL_SIZE` | 0.005° | ~550 m grid cell for clustering |
| `MIN_CLUSTER` | 3 | Minimum hazards to form a cluster |
| `CORRIDOR_HALF` | 0.018° | ~2 km perpendicular corridor half-width |
| `T_MIN` / `T_MAX` | 0.05 / 0.95 | Scalar projection bounds along route vector |
| `MAX_WAYPOINTS` | 3 | Cap at 3 waypoints |
| `DETOUR_PUSH` | 0.012° | ~1.3 km push away from cluster centroid |

**Flow:**
1. User enters origin + destination → Nominatim geocodes both
2. `fetchOsrmRouteWithSteps()` fetches the direct route + street names
3. `filterHazardsByStreetNames()` reverse-geocodes cluster centroids via Nominatim, keeps clusters on route streets
4. `selectWaypoints()` projects clusters onto the route vector, filters by corridor + t-bounds, picks top 3 by density
5. `buildMapsUrl()` constructs a Google Maps Directions URL with waypoints → opens in new tab

---

## Data pipeline

- Source: RVA 311 open data via `POST https://webapi.citizenservices.org/rvaone/api/v1/requests`
- No auth required
- 4 service IDs for road hazards: `new_cs221019222643`, `new_cs180228161314`, `new_cs180221194130`, `new_cs221019163752`
- Status codes 1–4 = hazard still active (Unprocessed, Assigned, In Progress, On Hold)
- Output: `output/rva311-hazards.txt` — one Google Maps search URL per line, 774 unique coords
- Pipeline triggered manually via `workflow_dispatch` on `rva311-pipeline.yml`

---

## Key rules and gotchas

### Governing rules (from RULES.md)
1. Any action a human must do manually must be formatted `<u>***bold, underlined, italic***</u>` to distinguish Copilot actions from manual steps. This formatting appears in agent responses, PR descriptions, and any documentation where Copilot-automated steps are listed alongside steps the user must perform themselves (e.g. "Click **Deploy** in the GitHub UI").
2. All agent names must follow `<scope>-<domain>-<function>-agent` pattern (e.g. `task-potholedodger-triage-agent`). Never use generic or unscoped names.
3. Avoid large rewrites unless explicitly requested. When a rewrite is requested, name the branch `refactor-<subject>`. Keep token usage low and codebases legible.
4. Only one approval request at a time. Do not propose the next change until the current one is confirmed and successfully pushed.
5. Any response that contains a write-tool command must contain ONLY that command — no follow-ups, no commentary. Only after the write succeeds should the next message be sent.

### Technical gotchas
- **Never set `User-Agent` in browser `fetch()` calls** — `User-Agent` is a forbidden header in all browsers; attempting to set it is silently ignored. Do not add it to any `fetch` options.
- **ES modules require an HTTP server** — they cannot be served from `file://` in any browser.
- **GitHub Pages only serves from `/` or `/docs`** — the root `index.html` redirect is intentional, do not remove it.
- **OSRM is best-effort** — `fetchOsrmRoute` and `fetchOsrmRouteWithSteps` return `null` on any failure; `app.js` must always handle `null` gracefully.
- **Nominatim `bounded=0` + `viewbox`** — results are biased to Richmond but not hard-filtered; do not change `bounded=1` or results will silently disappear outside the bounding box.
- **Proximity clusters are intentional** — report density is a routing signal, not noise to be filtered.
- **Do NOT modify** `web/js/`, `web/index.html`, or `.github/workflows/` unless the task explicitly targets those files.
- **The repo is public** — no secrets, no API keys, no auth tokens anywhere in code.

---

## Backlog (planned agents)

| Agent name | Purpose |
|---|---|
| `task-potholedodger-triage-agent` | Reads Actions failure logs, diagnoses cause, suggests fix |
| `task-rva311-reviewer-agent` | Scans `rva311-hazards.txt` after each pipeline run, flags anomalies |
| `task-rva311-changelog-agent` | Diffs new vs previous output, writes summary to CHANGELOG.md |
| `task-rva311-watchdog-agent` | Compares live RVA311 API response shape against last known good, opens issue on drift |
| Cron trigger for pipeline | Wire `rva311-pipeline.yml` to run on a schedule (currently `workflow_dispatch` only) |
