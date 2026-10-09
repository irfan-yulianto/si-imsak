"""Measures what Overture Maps' places would add to the OpenStreetMap mosque dataset.

    overturemaps download --bbox=95,-11,141,6 -f geoparquet --type=place -o places.parquet
    python3 scripts/mosque-data/overture-measure.py places.parquet data/mosques.tsv

Prints Markdown for the job summary: the Overture places that look like a masjid or a
musholla (by category or by name), how many have no OpenStreetMap entry within 60 m,
and the same for a few cities. Nothing is written to the dataset: this informs whether
merging Overture is worth it.
"""

import csv
import math
import re
import sys
from collections import Counter

import duckdb

NAME = re.compile(r"^(m[ae]sjid|mu(s|sh)[oa]ll?ah?|langgar|surau|meunasah|tajug)\b", re.IGNORECASE)
NEAR_M = 60
CELL = 0.001
# south, west, north, east
CITIES = {
    "Jakarta": (-6.37, 106.68, -6.08, 106.98),
    "Surabaya": (-7.35, 112.60, -7.18, 112.85),
    "Bandung": (-6.97, 107.55, -6.84, 107.74),
    "Medan": (3.48, 98.59, 3.70, 98.75),
    "Makassar": (-5.23, 119.38, -5.07, 119.52),
}


def meters(lat1, lng1, lat2, lng2):
    x = math.radians(lng2 - lng1) * math.cos(math.radians((lat1 + lat2) / 2))
    y = math.radians(lat2 - lat1)
    return math.hypot(x, y) * 6371000


def main(places_path, osm_path):
    grid = {}
    with open(osm_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            lat, lng = int(row["lat"]) / 1e5, int(row["lng"]) / 1e5
            grid.setdefault((math.floor(lat / CELL), math.floor(lng / CELL)), []).append((lat, lng))

    def in_osm(lat, lng):
        r, c = math.floor(lat / CELL), math.floor(lng / CELL)
        return any(
            meters(lat, lng, olat, olng) <= NEAR_M
            for dr in (-1, 0, 1)
            for dc in (-1, 0, 1)
            for olat, olng in grid.get((r + dr, c + dc), ())
        )

    con = duckdb.connect()
    source = f"read_parquet('{places_path}')"
    columns = {row[0] for row in con.execute(f"DESCRIBE SELECT * FROM {source}").fetchall()}
    # The category moved over the releases: categories.primary, then basic_category and taxonomy
    if "taxonomy" in columns:
        category = "coalesce(taxonomy.primary, '')"
    elif "basic_category" in columns:
        category = "coalesce(basic_category, '')"
    else:
        category = "coalesce(categories.primary, '')"
    rows = con.execute(
        f"""
        SELECT names.primary AS name, {category} AS category, confidence,
               (bbox.ymin + bbox.ymax) / 2 AS lat, (bbox.xmin + bbox.xmax) / 2 AS lng
        FROM {source}
        WHERE {category} ILIKE '%mosque%' OR {category} ILIKE '%islam%'
           OR regexp_matches(lower(coalesce(names.primary, '')), '^(m[ae]sjid|mu(s|sh)[oa]l|langgar|surau|meunasah|tajug)')
        """
    ).fetchall()

    found = [
        {"name": name or "", "category": cat, "confidence": conf or 0, "lat": lat, "lng": lng, "new": not in_osm(lat, lng)}
        for name, cat, conf, lat, lng in rows
    ]
    osm_total = sum(len(v) for v in grid.values())
    new = [p for p in found if p["new"]]

    print("### Overture Places vs the OpenStreetMap dataset\n")
    print(f"OpenStreetMap dataset: **{osm_total:,}** places.\n")
    print(f"Overture places like a masjid or musholla: **{len(found):,}**, of which **{len(new):,}** have no OSM entry within {NEAR_M} m")
    print(f"(+{len(new) / max(osm_total, 1):.1%} on the dataset).\n")
    print("| Confidence | Overture | New |\n|---|---|---|")
    for low, high in ((0.9, 1.01), (0.7, 0.9), (0, 0.7)):
        band = [p for p in found if low <= p["confidence"] < high]
        print(f"| {low}–{min(high, 1)} | {len(band):,} | {sum(p['new'] for p in band):,} |")
    print("\n| City | OSM | Overture | New | Gain |\n|---|---|---|---|---|")
    for city, (south, west, north, east) in CITIES.items():
        inside = lambda lat, lng: south <= lat <= north and west <= lng <= east
        osm = sum(1 for cell in grid.values() for lat, lng in cell if inside(lat, lng))
        ov = [p for p in found if inside(p["lat"], p["lng"])]
        n = sum(p["new"] for p in ov)
        print(f"| {city} | {osm:,} | {len(ov):,} | {n:,} | +{n / max(osm, 1):.0%} |")
    print("\nTop categories among them:\n")
    for cat, count in Counter(p["category"] for p in found).most_common(12):
        print(f"- `{cat or '(none)'}`: {count:,}")
    by_name = sum(1 for p in new if NAME.match(p["name"]))
    print(f"\nOf the new ones, {by_name:,} are named like a masjid or musholla.")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
