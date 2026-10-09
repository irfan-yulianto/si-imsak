// The mosques nearest a point, from the dataset that the workflow "Mosque data" builds
// every week (data/mosques.tsv). Read once per server instance into a grid of 0.01°
// cells, then searched ring by ring outward from the point. Server-only.
import fs from "node:fs";
import path from "node:path";
import type { Mosque } from "@/types";
import { distanceMeters } from "@/lib/mosque-osm";
import { parseTsv, type DatasetRow } from "@/lib/mosque-tsv";
import { errorMessage, log } from "@/lib/log";

/** The dataset: data/mosques.tsv, or MOSQUE_DATA_PATH (the end-to-end tests' fixture) */
const DATA_FILE = process.env.MOSQUE_DATA_PATH || path.join(process.cwd(), "data", "mosques.tsv");

const CELL_DEG = 0.01;
/** The narrowest a cell gets in Indonesia (m): 0.01° of longitude at 11° of latitude */
const CELL_MIN_M = CELL_DEG * 111_195 * Math.cos((11 * Math.PI) / 180);

export interface NearestOptions {
  /** The answer reaches at least this far (m)… */
  minReach?: number;
  /** …or to the minCount-th nearest mosque, if that's farther… */
  minCount?: number;
  /** …but holds no more than this many… */
  maxCount?: number;
  /** …and reaches no farther than this (m) */
  maxReach?: number;
}

export interface MosqueIndex {
  size: number;
  /**
   * The mosques around a point, nearest first, and how far from it the list is complete
   * (coverage, m): every mosque of the dataset closer than that is in it.
   */
  nearest(lat: number, lng: number, options?: NearestOptions): { mosques: Mosque[]; coverage: number };
}

export function buildIndex(rows: readonly DatasetRow[]): MosqueIndex {
  const cells = new Map<string, number[]>();
  const cellOf = (lat: number, lng: number) => [Math.floor(lat / CELL_DEG), Math.floor(lng / CELL_DEG)] as const;
  rows.forEach((row, i) => {
    const [r, c] = cellOf(row.lat, row.lng);
    const key = `${r}:${c}`;
    const list = cells.get(key);
    if (list) list.push(i);
    else cells.set(key, [i]);
  });

  return {
    size: rows.length,
    nearest(lat, lng, { minReach = 1500, minCount = 100, maxCount = 300, maxReach = 25_000 } = {}) {
      const [r0, c0] = cellOf(lat, lng);
      const found: { i: number; d: number }[] = [];
      const visit = (r: number, c: number) => {
        for (const i of cells.get(`${r}:${c}`) ?? []) found.push({ i, d: distanceMeters(lat, lng, rows[i].lat, rows[i].lng) });
      };

      let want = maxReach;
      for (let ring = 0; ; ring++) {
        if (ring === 0) visit(r0, c0);
        for (let k = -ring; k <= ring && ring > 0; k++) {
          visit(r0 - ring, c0 + k);
          visit(r0 + ring, c0 + k);
          if (Math.abs(k) < ring) {
            visit(r0 + k, c0 - ring);
            visit(r0 + k, c0 + ring);
          }
        }
        // Every mosque closer than this has been seen: the rest lie beyond this ring
        const seen = ring * CELL_MIN_M;
        found.sort((a, b) => a.d - b.d);
        const countReach = found.length >= minCount && found[minCount - 1].d <= seen ? found[minCount - 1].d : Infinity;
        want = Math.min(maxReach, Math.max(minReach, minCount > 0 ? countReach : 0));
        if (seen >= want) break;
      }

      let within = found.filter((f) => f.d <= want);
      let coverage = want;
      if (within.length > maxCount) {
        within = within.slice(0, maxCount);
        coverage = within[maxCount - 1].d;
      }
      const mosques = within.map(({ i, d }): Mosque => {
        const row = rows[i];
        return { id: row.id, name: row.name, lat: row.lat, lng: row.lng, distance: d, ...(row.street && { address: row.street }), type: row.type };
      });
      return { mosques, coverage };
    },
  };
}

export interface MosqueData {
  index: MosqueIndex;
  /** The OpenStreetMap data's date (YYYY-MM-DD), or "" */
  dataDate: string;
}

const loaded = new Map<string, Promise<MosqueData | null>>();

/**
 * The dataset, read on first use and kept for the life of the server instance. Null when
 * it can't be read; the next call tries again.
 */
export function loadMosqueData(file: string = DATA_FILE): Promise<MosqueData | null> {
  let data = loaded.get(file);
  if (!data) {
    data = (async () => {
      try {
        // Traced into the function by next.config.ts (outputFileTracingIncludes), not here
        const text = await fs.promises.readFile(/*turbopackIgnore: true*/ file, "utf8");
        const metaFile = file.replace(/\.tsv$/, ".meta.json");
        const index = buildIndex(parseTsv(text));
        const meta: unknown = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ metaFile, "utf8").catch(() => "{}"));
        const stamp = typeof meta === "object" && meta !== null && "osmTimestamp" in meta ? String(meta.osmTimestamp) : "";
        return { index, dataDate: /^\d{4}-\d{2}-\d{2}/.test(stamp) ? stamp.slice(0, 10) : "" };
      } catch (err) {
        log("error", { route: "mosques", error: `dataset: ${errorMessage(err)}` });
        loaded.delete(file);
        return null;
      }
    })();
    loaded.set(file, data);
  }
  return data;
}
