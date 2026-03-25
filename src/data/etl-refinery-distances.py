#!/usr/bin/env python3
"""ETL: Compute haversine distance from each Australian postcode centroid to nearest refinery."""

import csv
import json
import math
import ssl
import urllib.request
import io
import sys

# Australian operating refineries
REFINERIES = {
    "Lytton QLD": (-27.4195, 153.1269),
    "Geelong VIC": (-38.1499, 144.3606),
}

# Matthew Proctor's Australian Postcodes dataset
POSTCODES_URL = "https://www.matthewproctor.com/Content/postcodes/australian_postcodes.csv"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km using the haversine formula."""
    R = 6371.0
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def main():
    print("Downloading Australian postcodes dataset...", file=sys.stderr)
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(POSTCODES_URL, headers={"User-Agent": "ETL-RefineryDistances/1.0"})
    with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
        raw = resp.read().decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(raw))

    # Collect all lat/lng per postcode and average them (centroid)
    postcode_coords: dict[str, list[tuple[float, float]]] = {}
    for row in reader:
        postcode = row.get("postcode", "").strip()
        lat_str = row.get("lat", "").strip()
        lng_str = row.get("lon", row.get("long", row.get("lng", ""))).strip()

        if not postcode or not lat_str or not lng_str:
            continue
        try:
            lat = float(lat_str)
            lng = float(lng_str)
        except ValueError:
            continue
        if lat == 0.0 and lng == 0.0:
            continue

        postcode_coords.setdefault(postcode, []).append((lat, lng))

    print(f"Found {len(postcode_coords)} unique postcodes", file=sys.stderr)

    result = {}
    for postcode, coords in sorted(postcode_coords.items()):
        avg_lat = sum(c[0] for c in coords) / len(coords)
        avg_lng = sum(c[1] for c in coords) / len(coords)

        nearest_name = ""
        nearest_dist = float("inf")
        for name, (rlat, rlng) in REFINERIES.items():
            d = haversine_km(avg_lat, avg_lng, rlat, rlng)
            if d < nearest_dist:
                nearest_dist = d
                nearest_name = name

        result[postcode] = {
            "nearest_refinery": nearest_name,
            "distance_km": round(nearest_dist, 1),
            "lat": round(avg_lat, 4),
            "lng": round(avg_lng, 4),
        }

    output_path = __file__.replace("etl-refinery-distances.py", "refinery-distances.json")
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Wrote {len(result)} postcodes to {output_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
