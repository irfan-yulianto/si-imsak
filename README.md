# Si-Imsak — Jadwal Imsakiyah & Waktu Sholat

Aplikasi web jadwal imsakiyah dan waktu sholat real-time untuk seluruh kota/kabupaten di Indonesia. Menampilkan countdown menuju waktu sholat berikutnya, jadwal harian & bulanan dengan konversi kalender Hijriyah otomatis, serta pencari masjid terdekat.

## Fitur

- **Countdown Real-time** — Timer mundur menuju waktu sholat berikutnya dengan sinkronisasi waktu server, berjalan 24/7 secara siklis (termasuk transisi Isya ke Imsak besok). Menggunakan DOM refs untuk performa optimal tanpa re-render React setiap detik
- **Jadwal Hari Ini** — Kartu waktu sholat hari ini dengan highlight otomatis waktu sholat yang sedang berlaku
- **Tabel Jadwal Bulanan** — Navigasi antar bulan untuk melihat jadwal sepanjang tahun, tampilan tabel (desktop) dan kartu per hari (mobile)
- **Kalender Hijriyah** — Konversi otomatis ke kalender Hijriyah menggunakan `Intl.DateTimeFormat` (`islamic-umalqura`)
- **Pencari Masjid Terdekat** — Cari masjid di sekitar lokasi GPS atau kota pilihan via OpenStreetMap Overpass API, dengan navigasi langsung ke Google Maps
- **Deteksi Lokasi** — Geolocation otomatis dengan reverse geocoding sampai tingkat kota/kabupaten, database 514 kota/kabupaten di seluruh Indonesia
- **Pencarian Kota** — Cari kota/kabupaten dari database Kemenag RI via MyQuran API v3
- **Tema Gelap & Terang** — Tema gelap secara default, bisa diganti lewat tombol di header; pilihan disimpan di perangkat
- **PWA** — Installable sebagai Progressive Web App dengan service worker caching
- **Offline Support** — Cache jadwal di localStorage dan service worker. Service worker juga memakai salinan cache saat server error atau jaringan lebih lambat dari 3,5 detik
- **Responsive** — Optimal di mobile dan desktop dengan bottom navigation pada mobile
- **Aksesibilitas** — Lolos audit axe-core WCAG 2.1 AA: navigasi keyboard penuh (skip link, tab ARIA, pencarian kota dengan panah/Enter/Escape), status & error diumumkan ke screen reader, target sentuh 44px, menghormati `prefers-reduced-motion`
- **Sinkronisasi Waktu** — NTP-style time sync ke endpoint `/api/time` milik aplikasi sendiri, dengan sessionStorage caching untuk instant startup

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| State | Zustand 5 |
| Analytics | Vercel Analytics, Vercel Speed Insights, Microsoft Clarity |
| Font | Plus Jakarta Sans, JetBrains Mono |
| Bahasa | TypeScript 5 |
| Tes | Vitest, Testing Library, Playwright, axe-core |

## Sumber Data

| Data | Sumber |
|------|--------|
| Jadwal Sholat | [MyQuran API v3](https://api.myquran.com) — data resmi Kemenag RI |
| Masjid Terdekat | [OpenStreetMap Overpass API](https://overpass-api.de) — tiga mirror ditanya sekaligus, jawaban pertama yang dipakai |
| Deteksi Kota | [Nominatim](https://nominatim.org) (OpenStreetMap) — reverse geocoding |
| Sinkronisasi Waktu | Endpoint `/api/time` (jam server) — fallback ke waktu lokal perangkat |

## Memulai

### Prasyarat

- Node.js 22 (sama dengan `.nvmrc`, `engines` di `package.json`, CI, dan Vercel)
- npm — gunakan npm (`package-lock.json`), bukan package manager lain, agar dependensi sama dengan CI dan Vercel

### Instalasi

```bash
git clone https://github.com/irfan-yulianto/si-imsak.git
cd si-imsak
npm ci
```

### Development

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Build Production

```bash
npm run build
npm start
```

## Struktur Project

```
src/
├── app/
│   ├── api/
│   │   ├── cities/route.ts      # Proxy pencarian kota ke MyQuran API v3
│   │   ├── geocode/route.ts     # Reverse geocoding: koordinat → kota/kabupaten (Nominatim)
│   │   ├── mosques/route.ts     # Pencarian masjid via Overpass API (beberapa mirror sekaligus)
│   │   ├── schedule/route.ts    # Proxy jadwal sholat ke MyQuran API v3 (1 panggilan bulanan + fallback per hari)
│   │   └── time/route.ts        # Jam server untuk sinkronisasi waktu klien
│   ├── layout.tsx               # Root layout (font, metadata, analytics, theme init)
│   ├── page.tsx                 # Halaman utama (2 tab: Jadwal & Masjid)
│   ├── error.tsx                # Halaman error (mencatat digest untuk dicocokkan dengan log server)
│   ├── global-error.tsx         # Halaman error bila root layout gagal
│   ├── opengraph-image.tsx      # Gambar preview link (dibuat saat build)
│   ├── manifest.ts, robots.ts, sitemap.ts
│   └── globals.css              # Global styles, animasi, Islamic geometric background
├── components/
│   ├── layout/                  # Header (+ tombol tema), Footer, CurrentYear
│   ├── location/                # LocationSearch: pencarian kota, GPS, status offline
│   ├── mosque/                  # MosqueFinder: masjid terdekat (GPS atau kota)
│   ├── pwa/                     # InstallBanner, UpdateToast (notifikasi versi baru)
│   ├── schedule/                # CountdownTimer, TodayCard, ScheduleTable
│   └── ui/                      # CityCombobox, Icons
├── lib/
│   ├── api.ts                   # Client API (fetch + timeout + offline cache)
│   ├── city-time.ts             # Tanggal di zona waktu kota, aman untuk prerender
│   ├── cities.ts                # Database 514 kota/kabupaten dengan koordinat
│   ├── constants.ts             # Konfigurasi (lokasi default, cache, batas wilayah)
│   ├── countdown-helpers.ts     # Penentuan waktu sholat berikutnya
│   ├── detect-location.ts       # Deteksi lokasi otomatis (GPS + reverse geocoding)
│   ├── geocode.ts               # Nama kota Nominatim → nama kota MyQuran
│   ├── hijri.ts                 # Konversi kalender Hijriyah (Intl.DateTimeFormat)
│   ├── log.ts                   # Log JSON satu baris untuk route API
│   ├── mosques.ts               # Overpass query builder + response parser
│   ├── rate-limit.ts            # Rate limiter untuk API routes (sliding window)
│   ├── report-error.ts          # Laporan error dari halaman error
│   ├── time.ts                  # Sinkronisasi waktu server (NTP-style)
│   ├── timezone.ts              # Mapping timezone Indonesia (WIB/WITA/WIT)
│   └── upstream.ts              # Alamat MyQuran, Nominatim, Overpass (bisa diganti lewat env)
├── store/
│   └── useStore.ts              # Zustand store (location, schedule, countdown, UI)
├── types/
│   └── index.ts                 # TypeScript types & interfaces
└── instrumentation.ts           # Log saat server mulai dan saat request error
public/
├── sw.js                        # Service worker (dicek tsconfig.sw.json, dites di src/__tests__/sw.test.ts)
└── .well-known/security.txt
e2e/                             # Tes Playwright + mock upstream (mock-upstream.mjs)
scripts/                         # Anggaran bundle, diff screenshot, synthetic monitoring
```

## Keamanan

- **Content Security Policy (CSP)** — Whitelist ketat untuk script, connect, image, dan font sources
- **HSTS** — Strict-Transport-Security dengan preload (max-age 2 tahun)
- **Security Headers** — X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy; route API juga mengirim Cross-Origin-Resource-Policy. Header `X-App-Version` menyebut deploy mana yang menjawab
- **Rate Limiting** — Sliding window per IP di memori (30 req/menit untuk jadwal, 10 req/menit untuk masjid & geocode). Ini hanya lapis tipis, karena tiap instance serverless punya memori sendiri; perlindungan utamanya adalah cache CDN dan aturan Vercel Firewall (lihat Deployment)
- **Input Validation** — Validasi ketat pada semua API routes (MD5 city_id, koordinat dalam batas Indonesia, radius 100-10.000m)
- **Request Timeout** — Setiap panggilan upstream punya batas waktu dan satu retry. `/api/schedule` selesai paling lama 8 detik; saat MyQuran down ia membalas 502 dengan `Retry-After` setelah paling banyak 3 panggilan, lalu menahan panggilan berikutnya selama 15 detik
- **Service Worker Versioning** — Worker didaftarkan sebagai `/sw.js?v=<build id>`, jadi setiap deploy memasang worker dan cache baru; cache lama dihapus saat aktivasi. Versi baru menunggu sampai pengguna menekan "Muat ulang" pada notifikasi pembaruan
- **No Personal Data** — Tidak menyimpan data personal pengguna di server

Kerentanan dilaporkan secara privat; lihat [SECURITY.md](SECURITY.md).

## Privasi

Si-Imsak tidak punya akun maupun database. Data yang dikirim saat aplikasi dipakai:

| Penerima | Data | Kapan |
|----------|------|-------|
| Server Si-Imsak (Vercel) | ID kota, tahun dan bulan; kata kunci pencarian kota; koordinat yang dibulatkan ke 3 desimal (±110 m) | Memuat jadwal, mencari kota, mendeteksi kota dari GPS, mencari masjid |
| MyQuran | ID kota dan periode, kata kunci pencarian kota | Diteruskan oleh server, jadi MyQuran melihat server Vercel, bukan IP pengguna |
| Nominatim (OpenStreetMap) | Koordinat yang dibulatkan | Mendeteksi kota dari GPS, lewat server |
| Overpass (OpenStreetMap) | Koordinat yang dibulatkan dan radius pencarian | Mencari masjid, lewat server |
| Vercel Analytics & Speed Insights | Kunjungan halaman dan metrik performa, tanpa cookie | Setiap kunjungan |
| Microsoft Clarity (hanya jika `NEXT_PUBLIC_CLARITY_ID` diisi) | Rekaman interaksi dan heatmap, memakai cookie. Elemen yang memuat lokasi (pencarian dan prompt kota, nama kota di countdown, koordinat, pencarian dan daftar masjid) ditandai `data-clarity-mask` sehingga isinya tidak terekam. Saat halaman error tampil, sesinya diberi tanda `app_error` beserta digest error (kode acak tanpa data pribadi) | Setiap kunjungan |

Log request Vercel mencatat IP dan URL, termasuk koordinat yang dibulatkan, sesuai kebijakan retensi log Vercel. Koordinat GPS tidak disimpan di server.

Yang disimpan di perangkat (localStorage, bisa dihapus lewat pengaturan browser):

- `selectedLocation` — kota terpilih
- `si:schedule:*` — jadwal per bulan, dipakai saat offline, kedaluwarsa setelah 7 hari (paling banyak 24 bulan)
- `si:mosques:*` — hasil pencarian masjid selama 30 menit; nama kuncinya memuat koordinat yang dibulatkan ke 2 desimal (±1 km)
- `theme`, `locationPermissionDismissed`, `pwa-install-dismissed` — preferensi tampilan dan prompt
- `si:timeOffset` (sessionStorage) — selisih jam perangkat dengan server

Semua akses ke storage lewat `src/lib/storage.ts`. Cache dari versi lama (`schedule_*`, `mosques_*`) dipindah ke kunci baru saat aplikasi dibuka, dan yang kedaluwarsa dibersihkan.

Koordinat GPS hanya disimpan di memori selama halaman terbuka. Pemilik deployment sebaiknya memasang masking Clarity ke **Strict** sebagai lapis kedua.

## Deployment

Dioptimalkan untuk deployment di [Vercel](https://vercel.com):

```bash
npm run build
```

`vercel.json` menjalankan function di region Singapura (`sin1`), dekat pengguna dan MyQuran. Vercel memakai Node.js 22 sesuai `engines` di `package.json`. Server menulis log JSON satu baris per kejadian (`src/lib/log.ts`, `src/instrumentation.ts`); cari di **Vercel → Logs**, misalnya dengan `"route":"schedule"`.

API routes mengirim header `Cache-Control` dengan `s-maxage` supaya CDN Vercel melayani request berulang tanpa memanggil function maupun upstream API:

| Route | Cache CDN |
|-------|-----------|
| `/api/schedule` | 24 jam + stale-while-revalidate 7 hari (bulan yang datanya tidak lengkap dikirim `no-store`) |
| `/api/cities` | 24 jam + stale-while-revalidate 7 hari |
| `/api/geocode` | 24 jam (koordinat dibulatkan ke 3 desimal) |
| `/api/mosques` | 1 jam + stale-while-revalidate 2 jam (koordinat dibulatkan ke 3 desimal) |
| `/api/time` | `no-store` |

### Rate limit di Vercel Firewall

Rate limiter di memori tidak dibagi antar instance serverless. Untuk batas yang benar-benar berlaku, tambahkan aturan di **Vercel Dashboard → Project → Firewall → Configure → New Rule**:

- **If** Request Path *starts with* `/api/`
- **Then** Rate Limit, *Fixed Window* 60 detik, 60 request per IP, aksi *Deny* (429)

Request yang dilayani dari cache CDN tidak dihitung, jadi pengguna normal tidak akan terkena batas ini.

Fitur Vercel yang terintegrasi:
- **Vercel Analytics** — Page views dan web vitals
- **Vercel Speed Insights** — Performance monitoring
- **Microsoft Clarity** — Session replay dan heatmap

## Kontribusi & Pemeliharaan

### Pemeriksaan sebelum merge

Setiap pull request dan push ke `main` menjalankan workflow **CI** (`.github/workflows/ci.yml`) dengan tiga job:

| Job | Isi |
|-----|-----|
| `quality` | Lint, shellcheck, typecheck (aplikasi dan service worker), `npm audit` untuk dependensi production, tanda tangan registry, unit test dengan ambang coverage, build, dan anggaran ukuran bundle (`bundle-budget.json`) |
| `unit (…)` | Unit test dengan zona waktu perangkat Asia/Jakarta, Asia/Jayapura, America/Los_Angeles, dan Pacific/Auckland |
| `e2e` | Playwright terhadap build production |

Jalankan langkah yang sama secara lokal:

```bash
npm ci
npm run lint        # ESLint, tanpa warning
npm run typecheck   # tsc untuk aplikasi dan public/sw.js
npm test            # Vitest (semua API eksternal di-mock)
npm run build
node scripts/check-bundle-size.mjs
```

### Tes end-to-end

Tes di `e2e/` berjalan terhadap `next start`. MyQuran, Nominatim, dan Overpass diganti `e2e/mock-upstream.mjs` (lewat env `MYQURAN_API_BASE`, `NOMINATIM_REVERSE_URL`, `OVERPASS_ENDPOINTS`), jadi tidak ada request ke internet. Setiap tes gagal bila ada error di console, error halaman, atau pelanggaran CSP.

```bash
npx playwright install chromium   # sekali saja
npm run e2e:build                 # build dengan waktu build di batas bulan dan Clarity ID palsu
npm run e2e
```

Bila Chromium sudah terpasang di mesin, arahkan `PW_CHROMIUM_PATH` ke file executable-nya.

### Perbandingan screenshot

Workflow **Visual** (`.github/workflows/visual.yml`) mem-build `main` dan pull request, memotret skenario yang sama dari keduanya, lalu membandingkannya piksel per piksel. Selisih membuat job gagal, kecuali pull request diberi label **`visual-change`**: selisihnya tetap dilaporkan di ringkasan job, dan gambarnya tersedia sebagai artefak.

### Synthetic monitoring

Workflow **Synthetic** (`.github/workflows/synthetic.yml`, skrip `scripts/synthetic.sh`) memeriksa production tiap jam di menit ke-17: header keamanan, region function (`sin1`), jadwal bulan berjalan, file statis, dan kontrak API MyQuran. Sekali sehari ia juga memeriksa Nominatim dan Overpass, lalu membuka situs di Chromium dengan skrip Clarity dan Vercel yang asli untuk menangkap pelanggaran CSP. Kegagalan membuka issue berlabel `synthetic-failure`, yang tertutup sendiri saat pemeriksaan kembali lulus. Workflow ini juga bisa dijalankan manual dari tab Actions.

Runner GitHub berjalan di IP datacenter, sehingga Vercel Firewall bisa menantangnya dengan halaman "Security Checkpoint" (HTTP 429). Monitor melaporkannya sebagai kegagalan tersendiri, dan situs tidak ikut diperiksa. Agar monitor bisa lewat:

1. Buat token acak, misalnya dengan `openssl rand -hex 32`.
2. Simpan sebagai secret repo **`SYNTHETIC_TOKEN`** (Settings → Secrets and variables → Actions).
3. Di **Vercel → Project → Firewall → Configure → New Rule**, buat aturan: **If** *Request Header* `x-synthetic-monitor` *Equals* token tadi, **Then** *Bypass*.

Monitor hanya mengirim header itu ke situs ini, tidak ke MyQuran, Nominatim, atau Overpass. Bila tantangan datang dari mitigasi DDoS tingkat platform, aturan bypass tidak berlaku; cek tab Firewall dan hubungi dukungan Vercel.

GitHub mematikan workflow terjadwal setelah 60 hari tanpa aktivitas di repo. Bila itu terjadi, aktifkan lagi dari tab Actions.

### Dependensi

Dependabot (`.github/dependabot.yml`) membuka pull request mingguan, dikelompokkan per keluarga paket. Action di workflow dipin ke SHA commit, dan Dependabot ikut memperbaruinya.

### Pengaturan repo yang disarankan

- **Ruleset** untuk `main` (Settings → Rules): wajib lewat pull request, blokir force-push, dan wajib lulus status check `quality`, keempat `unit (…)`, `e2e`, dan `screenshots (base vs head)`.
- **Automatically delete head branches** (Settings → General → Pull Requests) supaya branch PR yang sudah di-merge terhapus otomatis.
- **Code security** (Settings → Advanced Security): Dependabot alerts dan security updates, secret scanning dengan push protection, CodeQL default setup, dan **private vulnerability reporting** (dipakai `SECURITY.md`).
- **Actions** (Settings → Actions → General): izin default `GITHUB_TOKEN` read-only, dan wajibkan action dipin ke SHA.

### Membersihkan branch lama

Branch dari PR yang ditutup tanpa merge tidak ikut terhapus otomatis. Untuk menghapus semua branch remote kecuali `main`:

```bash
git fetch --prune origin
git branch -r | grep -vE 'origin/(main|HEAD)' | sed 's#^ *origin/##' | xargs -n 20 git push origin --delete
```

Periksa dulu daftarnya (`git branch -r`) bila ada branch yang masih dipakai.

## Lisensi

[MIT](LICENSE)
