"""The Overture Maps places in Indonesia that may be a masjid or a musholla, for build.mjs.

    overturemaps download --bbox=95,-11,141,6 -f geoparquet --type=place -o places.parquet
    python3 scripts/mosque-data/overture.py places.parquet overture.jsonl

Writes one JSON object per line: id, lat, lng, name, street, confidence, and sharing: how
many places of the download, of any kind, share its point (to 1e-5 degrees). Keeps the
places whose address is in Indonesia (the box also holds Malaysia, Singapore, Brunei,
...), whose every source is under CDLA-Permissive-2.0, and whose name opens like a
mosque's. Loose on purpose: build.mjs applies the app's own rules (placeFromOverture and
addMissing in src/lib/mosque-osm.ts). Needs pyarrow, which the overturemaps client installs.
"""

import json
import sys

import pyarrow.compute as pc
import pyarrow.parquet as pq

LICENSE = "CDLA-Permissive-2.0"
# Masjid, mesjid, musholla and its spellings, langgar, surau, meunasah, tajug; Arabic script
NAME = r"(?i)^\W*(m[ae]sjid|mu[sš]|langgar|surau|meunasah|tajug|مسجد|مصل)"


def main(places_path, out_path):
    table = pq.read_table(places_path, columns=["id", "names", "confidence", "bbox", "sources", "addresses"])
    # Where each place is, to 1e-5 degrees, and how many places share each point
    bounds = table["bbox"]
    table = table.append_column("lat5", pc.round(pc.divide(pc.add(pc.struct_field(bounds, "ymin"), pc.struct_field(bounds, "ymax")), 2), 5))
    table = table.append_column("lng5", pc.round(pc.divide(pc.add(pc.struct_field(bounds, "xmin"), pc.struct_field(bounds, "xmax")), 2), 5))
    points = table.select(["lat5", "lng5"]).group_by(["lat5", "lng5"]).aggregate([([], "count_all")])
    points = points.filter(pc.greater(points["count_all"], 1))
    sharing = dict(zip(zip(points["lat5"].to_pylist(), points["lng5"].to_pylist()), points["count_all"].to_pylist()))

    # Places without an address can't be told to be in Indonesia
    table = table.filter(pc.fill_null(pc.greater(pc.list_value_length(table["addresses"]), 0), False))
    name = pc.fill_null(pc.struct_field(table["names"], "primary"), "")
    country = pc.struct_field(pc.list_element(table["addresses"], 0), "country")
    in_indonesia = pc.fill_null(pc.equal(country, "ID"), False)
    table = table.filter(pc.and_(in_indonesia, pc.match_substring_regex(name, NAME)))

    written = 0
    with open(out_path, "w", encoding="utf-8") as out:
        for row in table.to_pylist():
            if any(source.get("license") != LICENSE for source in row["sources"] or []):
                continue
            box = row["bbox"]
            out.write(
                json.dumps(
                    {
                        "id": row["id"],
                        "lat": round((box["ymin"] + box["ymax"]) / 2, 6),
                        "lng": round((box["xmin"] + box["xmax"]) / 2, 6),
                        "name": row["names"]["primary"],
                        "street": row["addresses"][0].get("freeform") or "",
                        "confidence": row["confidence"],
                        "sharing": sharing.get((row["lat5"], row["lng5"]), 1),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
            written += 1
    print(f"{written} Overture places in Indonesia that may be a mosque")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
