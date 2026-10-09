// Stand-in for MyQuran and Nominatim during the end-to-end tests. The app server is
// started with MYQURAN_API_BASE and NOMINATIM_REVERSE_URL pointing here (and the mosque
// search reads e2e/mosques.fixture.tsv), so no test reaches the internet. Every answer
// is deterministic.
import http from "node:http";
import data from "./data.cjs";

const { CITIES, cityById, monthDates, upstreamDay } = data;

const PORT = Number(process.env.MOCK_UPSTREAM_PORT || 3101);

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

// Cities that aren't in the fixture list still get a schedule (tests may seed any id)
function cityOrDefault(id) {
  return cityById(id) ?? { id, lokasi: "KOTA UJI", daerah: "DKI JAKARTA", offset: 0 };
}

function schedule(res, id, period) {
  if (!/^[a-f0-9]{32}$/.test(id)) return send(res, 404, { status: false, message: "Lokasi tidak ditemukan" });
  const city = cityOrDefault(id);
  let dates;
  if (/^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split("-").map(Number);
    dates = monthDates(y, m);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    dates = [period];
  } else {
    return send(res, 400, { status: false, message: "Format tanggal salah" });
  }
  send(res, 200, {
    status: true,
    data: {
      id: city.id,
      kabko: city.lokasi,
      prov: city.daerah,
      jadwal: Object.fromEntries(dates.map((date) => [date, upstreamDay(city, date)])),
    },
  });
}

function citySearch(res, query) {
  const q = decodeURIComponent(query).toUpperCase().trim();
  const found = CITIES.filter((c) => c.lokasi.includes(q) || q.includes(c.lokasi.replace(/^(KOTA|KAB\.) /, "")));
  // MyQuran v3 answers "not found" with a 404
  if (found.length === 0) return send(res, 404, { status: false, message: "Data tidak ditemukan" });
  send(res, 200, { status: true, data: found.map(({ id, lokasi, daerah }) => ({ id, lokasi, daerah })) });
}

const squared = (a, b) => (a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2;

function reverseGeocode(res, url) {
  const point = { lat: Number(url.searchParams.get("lat")), lng: Number(url.searchParams.get("lon")) };
  const nearest = [...CITIES].sort((a, b) => squared(a, point) - squared(b, point))[0];
  send(res, 200, { address: { ...nearest.address, state: nearest.daerah, country: "Indonesia" } });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const parts = url.pathname.split("/").filter(Boolean);
  if (req.method === "GET" && parts[0] === "myquran" && parts[1] === "jadwal" && parts.length === 4) {
    return schedule(res, parts[2], parts[3]);
  }
  if (req.method === "GET" && parts[0] === "myquran" && parts[1] === "kota" && parts[2] === "cari" && parts[3]) {
    return citySearch(res, parts[3]);
  }
  if (req.method === "GET" && url.pathname === "/nominatim/reverse") return reverseGeocode(res, url);
  if (url.pathname === "/health") return send(res, 200, { ok: true });
  send(res, 404, { status: false, message: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => console.log(`mock upstream on :${PORT}`));
