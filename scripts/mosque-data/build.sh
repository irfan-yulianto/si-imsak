#!/usr/bin/env bash
# Builds data/mosques.tsv and data/mosques.meta.json from an OpenStreetMap extract of
# Indonesia, such as Geofabrik's indonesia-latest.osm.pbf:
#
#   scripts/mosque-data/build.sh indonesia-latest.osm.pbf [work dir]
#
# Needs osmium-tool and Node 22. The workflow mosque-data.yml runs it every week.
set -euo pipefail

pbf=$1
work=${2:-$(mktemp -d)}
here=$(dirname "$0")

# What may be a mosque, with the nodes its ways need, then as GeoJSON features
osmium tags-filter --overwrite -e "$here/filters.txt" -o "$work/candidates.osm.pbf" "$pbf"
osmium export --overwrite -f geojsonseq -u type_id --geometry-types=point,linestring,polygon \
  -o "$work/candidates.geojsonseq" "$work/candidates.osm.pbf"

# When the extract's data was current
timestamp=$(osmium fileinfo -g header.option.osmosis_replication_timestamp "$pbf" 2>/dev/null || true)

# The build imports the app's TypeScript (Node strips the types)
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$here/build.mjs" "$work/candidates.geojsonseq" data "$timestamp"
