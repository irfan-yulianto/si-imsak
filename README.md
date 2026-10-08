# Si-Imsak — Jadwal Imsakiyah & Waktu Sholat

Aplikasi web jadwal imsakiyah dan waktu sholat real-time untuk seluruh kota/kabupaten di Indonesia. Menampilkan countdown menuju waktu sholat berikutnya, jadwal harian & bulanan dengan konversi kalender Hijriyah otomatis, serta pencari masjid terdekat.

## Fitur

- **Countdown Real-time** — Timer mundur menuju waktu sholat berikutnya dengan sinkronisasi waktu server, berjalan 24/7 secara siklis (termasuk transisi Isya ke Imsak besok). Menggunakan DOM refs untuk performa optimal tanpa re-render React setiap detik
- **Jadwal Hari Ini** — Kartu waktu sholat hari ini dengan highlight otomatis waktu sholat yang sedang berlaku
- **Tabel Jadwal Bulanan** — Navigasi antar bulan untuk melihat jadwal sepanjang tahun, tampilan tabel (desktop) dan kartu per hari (mobile)
- **Kalender Hijriyah** — Konversi otomatis ke kalender Hijriyah menggunakan `Intl.DateTimeFormat` (`islamic-umalqura`)
- **Pencari Masjid Terdekat** — Cari masjid di sekitar lokasi GPS atau kota pilihan via OpenStreetMap Overpass API, dengan navigasi langsung ke Google Maps
- **Deteksi Lokasi** — Geolocation otomatis dengan reverse geocoding hingga tingkat kecamatan, database 514 kota/kabupaten di seluruh Indonesia
- **Pencarian Kota** — Cari kota/kabupaten dari database Kemenag RI via MyQuran API v3
- **Dark Mode** — Mengikuti preferensi sistem (OS)
- **PWA** — Installable sebagai Progressive Web App dengan service worker caching
- **Offline Support** — Cache jadwal di localStorage dan service worker untuk akses tanpa internet
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

## Sumber Data

| Data | Sumber |
|------|--------|
| Jadwal Sholat | [MyQuran API v3](https://api.myquran.com) — data resmi Kemenag RI |
| Masjid Terdekat | [OpenStreetMap Overpass API](https://overpass-api.de) — dengan fallback multi-endpoint |
| Sinkronisasi Waktu | Endpoint `/api/time` (jam server) — fallback ke waktu lokal perangkat |

## Memulai

### Prasyarat

- Node.js 20+ (versi yang dipakai CI ada di `.nvmrc`)
- npm — gunakan npm (`package-lock.json`), bukan package manager lain, agar dependensi sama dengan CI dan Vercel

### Instalasi

```bash
git clone <repo-url>
cd jadwal-imsakiyah
npm install
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
│   │   ├── geocode/route.ts     # Reverse geocoding (kecamatan dari koordinat)
│   │   ├── mosques/route.ts     # Pencarian masjid via Overpass API
│   │   ├── schedule/route.ts    # Proxy jadwal sholat ke MyQuran API v3 (1 panggilan bulanan + fallback per hari)
│   │   └── time/route.ts        # Jam server untuk sinkronisasi waktu klien
│   ├── layout.tsx               # Root layout (font, metadata, analytics, theme init)
│   ├── globals.css              # Global styles, animasi, Islamic geometric background
│   └── page.tsx                 # Halaman utama (2 tab: Jadwal & Masjid)
├── components/
│   ├── layout/
│   │   ├── Header.tsx           # Floating header (glassmorphism) + theme toggle
│   │   └── Footer.tsx           # Footer
│   ├── location/
│   │   └── LocationSearch.tsx   # Search kota + geolocation + offline detection
│   ├── mosque/
│   │   └── MosqueFinder.tsx     # Pencari masjid terdekat (GPS + search kota)
│   ├── pwa/
│   │   └── InstallBanner.tsx    # PWA install prompt banner
│   ├── schedule/
│   │   ├── CountdownTimer.tsx   # Countdown real-time ke sholat berikutnya
│   │   ├── TodayCard.tsx        # Kartu waktu sholat hari ini + Hijriyah banner
│   │   └── ScheduleTable.tsx    # Tabel jadwal bulanan + navigasi bulan
│   └── ui/
│       └── Icons.tsx            # Custom SVG icon components (prayer-specific)
├── lib/
│   ├── api.ts                   # Client API (fetch + timeout + offline cache)
│   ├── cities.ts                # Database 514 kota/kabupaten dengan koordinat
│   ├── constants.ts             # Konfigurasi (default location, API base URL)
│   ├── detect-location.ts       # Deteksi lokasi otomatis (GPS + reverse geocoding)
│   ├── hijri.ts                 # Konversi kalender Hijriyah (Intl.DateTimeFormat)
│   ├── mosques.ts               # Overpass query builder + response parser
│   ├── rate-limit.ts            # Rate limiter untuk API routes (sliding window)
│   ├── time.ts                  # Sinkronisasi waktu server (NTP-style)
│   └── timezone.ts              # Mapping timezone Indonesia (WIB/WITA/WIT)
├── store/
│   └── useStore.ts              # Zustand store (location, schedule, countdown, UI)
└── types/
    └── index.ts                 # TypeScript types & interfaces
```

## Keamanan

- **Content Security Policy (CSP)** — Whitelist ketat untuk script, connect, image, dan font sources
- **HSTS** — Strict-Transport-Security dengan preload (max-age 2 tahun)
- **Security Headers** — X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- **Rate Limiting** — Sliding window per IP di memori (30 req/menit untuk jadwal, 10 req/menit untuk masjid & geocode). Ini hanya lapis tipis, karena tiap instance serverless punya memori sendiri; perlindungan utamanya adalah cache CDN dan aturan Vercel Firewall (lihat Deployment)
- **Input Validation** — Validasi ketat pada semua API routes (MD5 city_id, koordinat dalam batas Indonesia, radius 100-10.000m)
- **Request Timeout** — 5-15 detik timeout pada semua upstream API calls dengan retry logic
- **Service Worker Versioning** — Worker didaftarkan sebagai `/sw.js?v=<build id>`, jadi setiap deploy memasang worker dan cache baru; cache lama dihapus saat aktivasi. Versi baru menunggu sampai pengguna menekan "Muat ulang" pada notifikasi pembaruan
- **No Personal Data** — Tidak menyimpan data personal pengguna di server

## Deployment

Dioptimalkan untuk deployment di [Vercel](https://vercel.com):

```bash
npm run build
```

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

Setiap pull request dan push ke `main` menjalankan workflow **CI** (`.github/workflows/ci.yml`). Jalankan langkah yang sama secara lokal:

```bash
npm ci
npm run lint        # ESLint, tanpa warning
npm run typecheck   # tsc --noEmit
npm test            # Vitest (semua API eksternal di-mock)
npm run build
```

### Pengaturan repo yang disarankan

- **Branch protection** untuk `main` (Settings → Branches): wajibkan status check **CI** lulus sebelum merge.
- **Automatically delete head branches** (Settings → General → Pull Requests) supaya branch PR yang sudah di-merge terhapus otomatis.

### Membersihkan branch lama

Branch dari PR yang ditutup tanpa merge tidak ikut terhapus otomatis. Untuk menghapus semua branch remote kecuali `main`:

```bash
git fetch --prune origin
git branch -r | grep -vE 'origin/(main|HEAD)' | sed 's#^ *origin/##' | xargs -n 20 git push origin --delete
```

Periksa dulu daftarnya (`git branch -r`) bila ada branch yang masih dipakai.

## Lisensi

MIT
