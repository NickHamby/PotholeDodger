import requests
import sys
import os
from datetime import datetime, timedelta

# --- Config ---
API_URL = "https://webapi.citizenservices.org/rvaone/api/v1/requests"
SERVICE_IDS = [
    "new_cs221019222643",  # Potholes on Road
    "new_cs180228161314",  # Raise and Lower Sewer or Manhole
    "new_cs180221194130",  # Repair Bridge
    "new_cs221019163752",  # Repair Road
]
ACTIVE_STATUSES = ["1", "2", "3", "4"]
MAPS_BASE = "https://www.google.com/maps/search/?api=1&query="

# --- Step 1: Fetch ---
def fetch():
    now = datetime.utcnow()
    two_years_ago = now - timedelta(days=730)

    payload = {
        "start": int(two_years_ago.timestamp() * 1000),
        "end": int(now.timestamp() * 1000),
        "services": SERVICE_IDS,
        "status": ACTIVE_STATUSES,
        "dynamicalStringFilters": [
            {"filterName": "Neighborhoods", "filterValues": []},
            {"filterName": "Council Districts", "filterValues": []},
        ],
        "orderBy": "requestDate",
        "orderDirection": "desc",
        "pageNumber": 1,
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    print("Fetching RVA311 data...")
    response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
    response.raise_for_status()
    data = response.json()
    print(f"Fetch complete. Raw response keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
    return data

# --- Step 2: Parse ---
def parse(raw):
    if isinstance(raw, list):
        records = raw
    elif isinstance(raw, dict):
        records = raw.get("data") or raw.get("results") or raw.get("requests") or []
    else:
        records = []

    parsed = []
    for r in records:
        lat = r.get("latitude") or r.get("lat")
        lng = r.get("longitude") or r.get("lng") or r.get("lon")
        if lat is None or lng is None:
            continue
        parsed.append({
            "id": r.get("id"),
            "serviceName": r.get("serviceName"),
            "latitude": float(lat),
            "longitude": float(lng),
            "location": r.get("location"),
            "status": r.get("status"),
            "requestDate": r.get("requestDate"),
            "description": r.get("description"),
        })

    print(f"Parsed {len(parsed)} records with valid coordinates.")
    return parsed

# --- Step 3: Deduplicate ---
def deduplicate(records):
    seen = set()
    deduped = []
    for r in records:
        key = (round(r["latitude"], 5), round(r["longitude"], 5))
        if key not in seen:
            seen.add(key)
            deduped.append(r)
    print(f"Deduplicated to {len(deduped)} records.")
    return deduped

# --- Step 4: Format ---
def format_urls(records):
    urls = []
    for r in records:
        url = f"{MAPS_BASE}{r['latitude']},{r['longitude']}"
        urls.append(url)
    return "\n".join(urls)

# --- Main ---
def main():
    raw = fetch()
    parsed = parse(raw)

    if not parsed:
        print("ERROR: No valid records returned from RVA311 API. Failing loudly.")
        sys.exit(1)

    deduped = deduplicate(parsed)

    if not deduped:
        print("ERROR: No records remaining after deduplication. Failing loudly.")
        sys.exit(1)

    url_list = format_urls(deduped)
    print(f"Formatted {len(deduped)} Google Maps URLs.")

    output_path = "output/rva311-hazards.txt"
    os.makedirs("output", exist_ok=True)
    with open(output_path, "w") as f:
        f.write(url_list)

    print(f"Output written to {output_path}")

if __name__ == "__main__":
    main()