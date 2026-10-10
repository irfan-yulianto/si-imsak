# Si-Imsak — Jadwal Imsakiyah & Waktu Sholat

Aplikasi web jadwal imsakiyah dan waktu sholat real-time untuk seluruh kota/kabupaten di Indonesia. Menampilkan countdown menuju waktu sholat berikutnya, jadwal harian & bulanan dengan konversi kalender Hijriyah otomatis, serta pencari masjid terdekat.

## Fitur

- **Countdown Real-time** — Timer mundur menuju waktu sholat berikutnya dengan sinkronisasi waktu server, berjalan 24/7 secara siklis (termasuk transisi Isya ke Imsak besok). Menggunakan DOM refs untuk performa optimal tanpa re-render React setiap detik
- **Jadwal Hari Ini** — Kartu waktu sholat hari ini dengan highlight otomatis waktu sholat yang sedang berlaku
- **Tabel Jadwal Bulanan** — Navigasi antar bulan untuk melihat jadwal sepanjang tahun, dalam satu tabel ringkas untuk semua layar: di HP tabelnya bisa digeser ke dua arah dengan kolom tanggal dan judul kolom tetap terlihat, dan dibuka di baris hari ini
- **Kalender Hijriyah** — Konversi otomatis ke kalender Hijriyah menggunakan `Intl.DateTimeFormat` (`islamic-umalqura`), dihitung di perangkat sehingga tetap jalan offline. Tanggal resmi di Indonesia mengikuti sidang isbat Kemenag, jadi di sekitar awal bulan Hijriyah tanggalnya bisa berbeda satu hari. Endpoint kalender MyQuran v3 sudah dicek sebagai alternatif: metodenya perhitungan "standar", bukan hasil isbat, jadi tidak lebih akurat
- **Pencari Masjid Terdekat** — Masjid dan musholla terdekat dari posisi GPS, atau di sekitar pusat kota pilihan, dengan navigasi langsung ke Google Maps.
  - Datanya dari OpenStreetMap, dilengkapi Overture Places untuk masjid yang belum dipetakan di OpenStreetMap, dan usulan pengguna yang sudah diperiksa pemilik; dibangun ulang setiap minggu menjadi dataset sendiri (lihat "Data masjid"). Dataset ini dibaca oleh server, tanpa layanan pihak ketiga saat pencarian.
  - Bila izin lokasi sudah diberikan, GPS langsung dipakai tanpa perlu menekan tombol.
  - Hasil pertama muncul dari fix pertama, lalu urutannya diperbarui saat GPS makin akurat: GPS diberi waktu satu menit untuk mengunci sampai ±50 m, dan pembacaan yang lebih kasar tidak menimpa fix yang lebih tajam. Server hanya ditanya lagi bila jawaban terakhir tidak lagi menjamin urutan terdekat dari posisi itu.
  - Jarak ditampilkan sejujur posisinya: dari fix yang lebih kasar dari 300 m jarak dibulatkan ("~300 m"), dan dari lokasi perkiraan (izin lokasi perkiraan di Android/iOS, ±2 km) hanya batas atasnya ("≤ 2.5 km"), dengan petunjuk mengaktifkan lokasi akurat.
  - Untuk masjid yang denah bangunannya dipetakan, jarak diukur ke dindingnya, bukan ke tengah halamannya. Dari fix yang akurat, masjid yang dindingnya dalam 30 m (atau sejauh akurasi fix) berlabel "Di lokasi Anda".
  - Yang berdiri di masjid atau musholla yang belum tercatat (fix ≤50 m, tidak ada tempat tercatat dalam 60 m) bisa mengusulkannya lewat "Tambahkan di sini"; usulan diperiksa pemilik sebagai issue GitHub sebelum masuk ke data (lihat "Data masjid").
  - Titik dan bangunan untuk masjid yang sama ditampilkan sekali, dan musholla dikenali dari namanya.
- **Deteksi Lokasi** — Geolocation otomatis dengan reverse geocoding sampai tingkat kota/kabupaten, database 514 kota/kabupaten di seluruh Indonesia
- **Pencarian Kota** — Cari kota/kabupaten dari database Kemenag RI via MyQuran API v3
- **Tema Gelap & Terang** — Tema gelap secara default, bisa diganti lewat tombol di header; pilihan disimpan di perangkat, dan warna bar browser ikut berganti
- **PWA** — Installable sebagai Progressive Web App dengan service worker caching, screenshot untuk dialog install, dan shortcut ke Masjid Terdekat
- **Offline Support** — Cache jadwal di localStorage dan service worker. Service worker juga memakai salinan cache saat server error atau jaringan lebih lambat dari 3,5 detik
- **Responsive** — Bottom navigation di HP; dua kolom di desktop (countdown di samping jadwal hari ini, kontrol pencari masjid di samping hasilnya); memperhitungkan notch dan home indicator iOS
- **Aksesibilitas** — Lolos audit axe-core WCAG 2.1 AA: navigasi keyboard penuh (skip link, tab ARIA, pencarian kota dengan panah/Enter/Escape) dengan indikator fokus berkontras minimal 3:1, status & error diumumkan ke screen reader, target sentuh 44px, menghormati `prefers-reduced-motion`
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
| Masjid Terdekat | [OpenStreetMap](https://www.openstreetmap.org/copyright) dan [Overture Maps Foundation](https://docs.overturemaps.org/attribution/), serta usulan pengguna aplikasi yang disetujui pemilik (issue GitHub berlabel `usulan-disetujui`): `data/mosques.tsv`, dibangun setiap minggu dari ekstrak Geofabrik, rilis Overture terbaru, dan issue itu oleh workflow **Mosque data** (ODbL; bagian Overture juga CDLA-Permissive-2.0, usulan pengguna CC0). Server menjawab dari dataset ini di memori |
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
│   │   ├── mosques/route.ts     # Masjid terdekat dari dataset (posisi dibulatkan ±1 km; meta.coverage, meta.suggestions), juga format lama ber-radius
│   │   ├── mosques/suggest/route.ts # Usulan masjid/musholla dari pengguna → issue GitHub (POST; aktif bila SUGGESTION_GITHUB_TOKEN terpasang)
│   │   ├── schedule/route.ts    # Proxy jadwal sholat ke MyQuran API v3 (1 panggilan bulanan + fallback per hari)
│   │   └── time/route.ts        # Jam server untuk sinkronisasi waktu klien
│   ├── layout.tsx               # Root layout (font, metadata, analytics, theme init)
│   ├── page.tsx                 # Halaman utama (2 tab: Jadwal & Masjid)
│   ├── error.tsx                # Halaman error (mencatat digest untuk dicocokkan dengan log server)
│   ├── global-error.tsx         # Halaman error bila root layout gagal
│   ├── opengraph-image.tsx      # Gambar preview link (dibuat saat build)
│   ├── manifest.ts, robots.ts, sitemap.ts
│   └── globals.css              # Token desain (warna tema terang/gelap, radius, ukuran layout), animasi, pola latar
├── components/
│   ├── layout/                  # Header (+ tombol tema), Footer, CurrentYear
│   ├── location/                # LocationSearch: pencarian kota dan prompt lokasi
│   ├── mosque/                  # MosqueFinder = MosqueControls + MosqueList (+ ikon khusus masjid)
│   ├── pwa/                     # InstallBanner, UpdateToast (notifikasi versi baru)
│   ├── schedule/                # CountdownTimer (LocationBadge, ArrivalNotice), TodayCard,
│   │                            # ScheduleTable (MonthNav, MonthTable, TodayFab)
│   └── ui/                      # Button, Card, Badge, Spinner, Skeleton, ErrorScreen, CityCombobox, Icons
├── hooks/
│   ├── useAppBootstrap.ts       # Start-up: migrasi dan hydrate cache, kota, online/offline, jam server
│   ├── useCityClock.ts          # useCityToday / useCityMinute: tanggal dan menit di kota terpilih
│   ├── useSchedule.ts           # Bulan untuk tabel dan countdown, dari cache bulan di store
│   ├── useNextPrayer.ts         # Waktu sholat berikutnya, pengumuman, dan retry data yang hilang
│   ├── useCountdownTicker.ts    # Digit countdown, ditulis langsung ke DOM tiap detik
│   ├── useGeolocationPermission.ts # Izin lokasi (Permissions API): GPS dimulai sendiri bila sudah diizinkan
│   ├── useGeolocationWatch.ts   # GPS untuk pencari masjid (hanya pembacaan yang lebih baik; berhenti di akurasi 50 m atau satu menit setelah pembacaan pertama)
│   └── useMosqueSearch.ts       # Pencarian masjid (aturan cakupan: kapan perlu bertanya lagi, retry, pembatalan)
├── lib/
│   ├── api.ts                   # Client API (fetch + timeout + offline cache)
│   ├── city-time.ts             # Satu-satunya tempat untuk tanggal dan jam kota (aman untuk prerender)
│   ├── cities.ts                # Database 514 kota/kabupaten dengan koordinat
│   ├── clock.ts                 # Satu timer bersama yang berdetak di setiap pergantian menit
│   ├── constants.ts             # Konfigurasi (lokasi default, cache, batas wilayah)
│   ├── countdown-helpers.ts     # Penentuan waktu sholat berikutnya
│   ├── geocode.ts               # Nama kota Nominatim → nama kota MyQuran
│   ├── geofix.ts                # Fix GPS: ambang akurasi (50/300/1000 m), pembacaan mana yang menggantikan fix, batas kesegaran
│   ├── hijri.ts                 # Konversi kalender Hijriyah (Intl.DateTimeFormat)
│   ├── http.ts                  # Jawaban JSON, panggilan upstream, gerbang 1 req/detik untuk Nominatim
│   ├── log.ts                   # Log JSON satu baris untuk route API
│   ├── messages.ts              # Pesan error dan status untuk pengguna (pencari masjid: mosque-messages.ts)
│   ├── mosque-osm.ts            # Nama, jenis (masjid/musholla), dan duplikat dari OpenStreetMap; tambahan dari Overture; tanpa import
│   ├── mosque-contrib.ts        # Usulan pengguna sebagai issue GitHub: isi issue dan cara membacanya kembali; tanpa import
│   ├── mosque-index.ts          # Dataset di memori: grid 0,01°, masjid terdekat dan cakupannya (server)
│   ├── mosques.ts               # Aturan cakupan di klien: urutan dari posisi persis, kapan bertanya lagi
│   ├── mosque-tsv.ts            # Format data/mosques.tsv dan validasinya; tanpa import
│   ├── rate-limit.ts            # Rate limiter untuk API routes (sliding window per route)
│   ├── report-error.ts          # Laporan error dari halaman error
│   ├── storage.ts               # Satu-satunya akses localStorage/sessionStorage (envelope, migrasi, eviction)
│   ├── theme.ts                 # Tema: kelas .dark dan theme-color, juga lewat script sebelum paint pertama
│   ├── time.ts                  # Sinkronisasi waktu server (NTP-style)
│   ├── timezone.ts              # Mapping timezone Indonesia (WIB/WITA/WIT)
│   ├── upstream.ts              # Alamat MyQuran dan Nominatim (bisa diganti lewat env)
│   └── validate.ts              # Guard untuk semua data dari luar (API, upstream, storage)
├── store/
│   ├── useStore.ts              # Zustand store dari tiga slice
│   ├── app-slice.ts             # Tema, offline, selisih jam, hydrate dari cache
│   ├── city-slice.ts            # Kota terpilih, selectCity, detectCity (GPS → kota)
│   └── schedule-slice.ts        # Cache bulan per kota (LRU 12), loadMonth, showMonth
├── types/
│   └── index.ts                 # TypeScript types & interfaces
└── instrumentation.ts           # Log saat server mulai dan saat request error
public/
├── sw.js                        # Service worker (dicek tsconfig.sw.json, dites di src/__tests__/sw.test.ts)
├── screenshots/                 # Screenshot untuk dialog install PWA (scripts/pwa-screenshots.mjs)
└── .well-known/security.txt
e2e/                             # Tes Playwright + mock upstream (mock-upstream.mjs)
scripts/                         # Anggaran bundle, diff screenshot, screenshot PWA, synthetic monitoring
└── mosque-data/                 # Pembangun data/mosques.tsv dari OpenStreetMap, Overture, dan usulan pengguna (lihat "Data masjid")
data/                            # data/mosques.tsv (ODbL dan CDLA-Permissive-2.0, data/LICENSE), diperbarui workflow Mosque data
```

## Keamanan

- **Content Security Policy (CSP)** — Whitelist ketat untuk script, connect, image, dan font sources
- **HSTS** — Strict-Transport-Security dengan preload (max-age 2 tahun)
- **Security Headers** — X-Frame-Options (DENY), X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy; route API juga mengirim Cross-Origin-Resource-Policy. Header `X-App-Version` menyebut deploy mana yang menjawab
- **Rate Limiting** — Sliding window per IP dan per route di memori (30 req/menit untuk jadwal dan pencarian kota, 60 req/menit untuk masjid karena banyak pengguna seluler berbagi satu IP dan datanya ada di memori, 10 req/menit untuk geocode, 3 usulan/menit untuk `/api/mosques/suggest`). Jawaban 429 menyertakan `Retry-After`. Ini hanya lapis tipis, karena tiap instance serverless punya memori sendiri; perlindungan utamanya adalah cache CDN dan aturan Vercel Firewall (lihat Deployment). Panggilan ke Nominatim dibatasi 1 per detik per instance, sesuai kebijakan pemakaiannya
- **Input Validation** — Validasi ketat pada semua API routes (MD5 city_id, koordinat dalam batas Indonesia, radius hanya 2, 3, 4, 6, 8, atau 10 km). Usulan masjid hanya diterima sebagai JSON dari halaman sendiri (`Content-Type`, `Sec-Fetch-Site`), paling besar 2 KB, dengan nama dan jalan 2–80 karakter dari huruf, angka, spasi, dan tanda baca biasa (tanpa markdown, tautan, atau mention), posisi di Indonesia dengan akurasi ≤50 m, dan tidak ada tempat tercatat dalam 60 m
- **Request Timeout** — Setiap panggilan upstream punya batas waktu dan satu retry. `/api/schedule` selesai paling lama 8 detik; saat MyQuran down ia membalas 502 dengan `Retry-After` setelah paling banyak 3 panggilan, lalu menahan panggilan berikutnya selama 15 detik
- **Service Worker Versioning** — Worker didaftarkan sebagai `/sw.js?v=<build id>`, jadi setiap deploy memasang worker dan cache baru; cache lama dihapus saat aktivasi. Versi baru menunggu sampai pengguna menekan "Muat ulang" pada notifikasi pembaruan
- **No Personal Data** — Tidak menyimpan data personal pengguna di server. Usulan masjid yang pengguna kirim sendiri menjadi issue GitHub publik, tanpa identitas pengirimnya

Kerentanan dilaporkan secara privat; lihat [SECURITY.md](SECURITY.md).

## Privasi

Si-Imsak tidak punya akun maupun database; usulan masjid dari pengguna disimpan sebagai issue GitHub di repo ini. Data yang dikirim saat aplikasi dipakai:

| Penerima | Data | Kapan |
|----------|------|-------|
| Server Si-Imsak (Vercel) | ID kota, tahun dan bulan; kata kunci pencarian kota; koordinat yang dibulatkan ke 2 desimal (±1 km) untuk mendeteksi kota dan mencari masjid; isi usulan masjid (jenis, nama, jalan, posisi persis saat mengirim, akurasinya) | Memuat jadwal, mencari kota, mendeteksi kota dari GPS, mencari masjid, mengirim usulan masjid |
| MyQuran | ID kota dan periode, kata kunci pencarian kota | Diteruskan oleh server, jadi MyQuran melihat server Vercel, bukan IP pengguna |
| Nominatim (OpenStreetMap) | Koordinat yang dibulatkan ke 2 desimal (±1 km) | Mendeteksi kota dari GPS, lewat server |
| GitHub (issue publik di repo ini), hanya bila mengirim usulan | Jenis, nama, dan jalan yang diketik; posisi GPS saat itu (5 desimal, ±1 m) beserta akurasinya; waktu kirim. Tanpa IP, nama, maupun akun pengirim | Mengirim usulan masjid atau musholla lewat "Tambahkan di sini", lewat server |
| Google Maps dan OpenStreetMap, hanya bila tautannya dibuka | Koordinat masjid yang dituju (Navigasi), atau area pencarian yang dibulatkan ke 3 desimal (±110 m: "Cari lebih banyak di Google Maps", "Laporkan di OpenStreetMap") | Membuka tab baru di situs mereka |
| Vercel Analytics & Speed Insights | Kunjungan halaman dan metrik performa, tanpa cookie | Setiap kunjungan |
| Microsoft Clarity (hanya jika `NEXT_PUBLIC_CLARITY_ID` diisi) | Rekaman interaksi dan heatmap, memakai cookie. Elemen yang memuat lokasi (pencarian dan prompt kota, nama kota di countdown, koordinat, pencarian dan daftar masjid) ditandai `data-clarity-mask` sehingga isinya tidak terekam. Saat halaman error tampil, sesinya diberi tanda `app_error` beserta digest error (kode acak tanpa data pribadi) | Setiap kunjungan |

Log request Vercel mencatat IP dan URL, termasuk koordinat yang dibulatkan, sesuai kebijakan retensi log Vercel. Koordinat GPS tidak disimpan di server; yang pengguna kirim sendiri sebagai usulan masjid tersimpan di issue GitHub (baris GitHub di atas), tanpa IP pengirim, dan log server hanya mencatat nomor issue-nya.

Yang disimpan di perangkat (localStorage, bisa dihapus lewat pengaturan browser):

- `selectedLocation` — kota terpilih
- `si:schedule:*` — jadwal per bulan, dipakai saat offline, kedaluwarsa setelah 7 hari (paling banyak 24 bulan)
- `theme`, `locationPermissionDismissed`, `pwa-install-dismissed` — preferensi tampilan dan prompt
- `si:timeOffset` (sessionStorage) — selisih jam perangkat dengan server

Semua akses ke storage lewat `src/lib/storage.ts`.
- Cache jadwal dari versi lama (`schedule_*`) dipindah ke kunci baru saat aplikasi dibuka, dan yang kedaluwarsa dibersihkan.
- Hasil pencarian masjid tidak lagi disimpan di perangkat. Cache-nya dari versi sebelumnya (`mosques_*`, `si:mosques:*`) dihapus.

Koordinat GPS hanya disimpan di memori selama halaman terbuka. Pemilik deployment sebaiknya memasang masking Clarity ke **Strict** sebagai lapis kedua.

## Deployment

Dioptimalkan untuk deployment di [Vercel](https://vercel.com):

```bash
npm run build
```

`vercel.json` menjalankan function di region Singapura (`sin1`), dekat pengguna dan MyQuran. Vercel memakai Node.js 22 sesuai `engines` di `package.json`. Server menulis log JSON satu baris per kejadian (`src/lib/log.ts`, `src/instrumentation.ts`); cari di **Vercel → Logs**, misalnya dengan `"route":"schedule"`.

**Usulan masjid.** Fitur "Tambahkan di sini" hidup bila variabel `SUGGESTION_GITHUB_TOKEN` terpasang di Vercel: fine-grained personal access token yang hanya mengakses repo ini dengan izin *Issues: Read and write* (buat di GitHub → Settings → Developer settings → Fine-grained tokens; beri kedaluwarsa dan pengingat untuk memperbaruinya, karena token yang mati hanya tampak di log sebagai 401). Variabel baru terbaca setelah deploy berikutnya. Tanpa token, `/api/mosques` menjawab `meta.suggestions: false`, tombolnya tidak tampil, dan endpoint menjawab 503. `SUGGESTION_GITHUB_REPO` (default repo ini) berguna untuk fork; `SUGGESTION_GITHUB_API` hanya untuk tes, karena mengarahkan token ke alamat lain.

API routes mengirim header `Cache-Control` dengan `s-maxage` supaya CDN Vercel melayani request berulang tanpa memanggil function maupun upstream API:

| Route | Cache CDN |
|-------|-----------|
| `/api/schedule` | 24 jam + stale-while-revalidate 7 hari (bulan yang datanya tidak lengkap dikirim `no-store`) |
| `/api/cities` | 24 jam + stale-while-revalidate 7 hari |
| `/api/geocode` | 24 jam (koordinat dibulatkan ke 2 desimal) |
| `/api/mosques` | 24 jam + stale-while-revalidate 7 hari (koordinat dibulatkan ke 2 desimal); deploy baru (mis. data mingguan) memulai cache baru |
| `/api/mosques/suggest` | `no-store` (POST) |
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

Tes di `e2e/` berjalan terhadap `next start`. MyQuran, Nominatim, dan GitHub diganti `e2e/mock-upstream.mjs` (lewat env `MYQURAN_API_BASE`, `NOMINATIM_REVERSE_URL`, `SUGGESTION_GITHUB_API`), dan pencarian masjid membaca `e2e/mosques.fixture.tsv` (lewat `MOSQUE_DATA_PATH`), jadi tidak ada request ke internet. Setiap tes gagal bila ada error di console, error halaman, atau pelanggaran CSP.

```bash
npx playwright install chromium   # sekali saja
npm run e2e:build                 # build dengan waktu build di batas bulan dan Clarity ID palsu
npm run e2e
```

Bila Chromium sudah terpasang di mesin, arahkan `PW_CHROMIUM_PATH` ke file executable-nya.

### Perbandingan screenshot

Workflow **Visual** (`.github/workflows/visual.yml`) mem-build `main` dan pull request, memotret skenario yang sama dari keduanya, lalu membandingkannya piksel per piksel. Selisih membuat job gagal, kecuali pull request diberi label **`visual-change`**: selisihnya tetap dilaporkan di ringkasan job, dan gambarnya tersedia sebagai artefak.

Screenshot untuk dialog install PWA (`public/screenshots/`, dicantumkan di `src/app/manifest.ts`) dibuat ulang setelah perubahan tampilan, dengan data dari fixture E2E dan jam tetap:

```bash
npm run build && npx next start -p 3100   # di terminal lain
node scripts/pwa-screenshots.mjs
```

`src/app/manifest.test.ts` memastikan ukuran di manifest sama dengan ukuran file-nya.

### Synthetic monitoring

Workflow **Synthetic** (`.github/workflows/synthetic.yml`, skrip `scripts/synthetic.sh`) memeriksa production tiap jam di menit ke-17: header keamanan, region function (`sin1`), jadwal bulan berjalan, pencarian masjid (minimal 10 di dekat Monas, dari data yang umurnya tidak lebih dari 21 hari), file statis, dan kontrak API MyQuran. Sekali sehari ia juga memeriksa Nominatim, lalu membuka situs di Chromium dengan skrip Clarity dan Vercel yang asli untuk menangkap pelanggaran CSP. Kegagalan membuka issue berlabel `synthetic-failure`, yang tertutup sendiri saat pemeriksaan kembali lulus. Workflow ini juga bisa dijalankan manual dari tab Actions.

Runner GitHub berjalan di IP datacenter, sehingga Vercel Firewall bisa menantangnya dengan halaman "Security Checkpoint" (HTTP 429). Monitor melaporkannya sebagai kegagalan tersendiri, dan situs tidak ikut diperiksa. Agar monitor bisa lewat:

1. Buat token acak, misalnya dengan `openssl rand -hex 32`.
2. Simpan sebagai secret repo **`SYNTHETIC_TOKEN`** (Settings → Secrets and variables → Actions).
3. Di **Vercel → Project → Firewall → Configure → New Rule**, buat aturan: **If** *Request Header* `x-synthetic-monitor` *Equals* token tadi, **Then** *Bypass*.

Monitor hanya mengirim header itu ke situs ini, tidak ke MyQuran atau Nominatim. Bila tantangan datang dari mitigasi DDoS tingkat platform, aturan bypass tidak berlaku; cek tab Firewall dan hubungi dukungan Vercel.

GitHub mematikan workflow terjadwal setelah 60 hari tanpa aktivitas di repo. Bila itu terjadi, aktifkan lagi dari tab Actions.

### Data masjid

Workflow **Mosque data** (`.github/workflows/mosque-data.yml`) membangun `data/mosques.tsv`, yaitu masjid dan musholla di Indonesia dari OpenStreetMap, ditambah yang hanya ada di Overture Places, ditambah usulan pengguna aplikasi yang disetujui pemilik. Datanya diambil dari ekstrak Geofabrik, rilis Overture terbaru, dan issue repo ini, dan diperbarui setiap Selasa pukul 02.23 WIB. Workflow ini juga bisa dijalankan manual dari tab Actions.

**Cara dataset dibangun** (`scripts/mosque-data/build.sh`):
1. `osmium tags-filter` menyaring calon dengan `filters.txt`.
2. `osmium export` mengubahnya menjadi GeoJSON.
3. `overturemaps download` mengambil tempat Overture di kotak Indonesia, lalu `overture.py` menyisakan yang:
   - beralamat di Indonesia (kotaknya juga mencakup Malaysia, Singapura, dan Brunei);
   - seluruh sumbernya berlisensi CDLA-Permissive-2.0;
   - namanya mungkin nama masjid.
4. `build.mjs` memakai aturan yang sama dengan aplikasi (`src/lib/mosque-osm.ts`):
   - tempat ibadah Muslim, bangunan masjid, dan bangunan yang bernama masjid atau musholla ikut;
   - masjid yang dipetakan sebagai titik sekaligus bangunan ditulis sekali;
   - dari Overture, hanya tempat yang namanya berawalan Masjid, Musholla, Langgar, Surau, Meunasah, atau Tajug, dan yang confidence-nya minimal 0,6 (`OVERTURE_MIN_CONFIDENCE`). Di bawah 0,6, satu dari enam tempat bergeser lebih dari 250 m dari masjid yang sama di OpenStreetMap; di atasnya, satu dari empat belas;
   - tempat Overture yang posisinya bukan miliknya sendiri dilewati:
     - titik yang dipakai bersama 5 tempat Overture atau lebih (`OVERTURE_SHARED_POINT`), yaitu titik tempat Overture menaruh apa saja yang hanya ia tahu kota atau desanya;
     - koordinat yang dibulatkan ke 3 desimal;
   - tempat Overture juga dilewati bila ada tempat lain dalam 60 m, tempat bernama mirip dalam 300 m, atau tempat sejenis dengan nama yang sama dalam jarak tertentu. Untuk nama langka (paling banyak 10 di Indonesia) jaraknya 2 km, dan untuk nama yang lebih umum makin pendek, sampai 300 m. Nama dibandingkan tanpa keterangan lokasi di belakangnya, misalnya "Masjid Istiqlal - Jakarta". Dua sumber sering menaruh satu masjid di titik yang berbeda, dan Overture kadang punya beberapa halaman untuk satu masjid; sebagian halaman dipasangi pin di alun-alun kota;
   - masjid terkenal (di OpenStreetMap bertag `wikidata` atau `wikipedia`) punya banyak halaman yang pinnya tersebar di kotanya. Karena itu, tempat Overture sejenis yang namanya diawali nama masjid terkenal dalam 10 km juga dilewati, misalnya "Masjid Istiqlal Jakarta Pusat" 1,3 km dari Istiqlal. Aturan ini tidak berlaku bila nama itu dipakai lebih dari 50 tempat di Indonesia, misalnya "Al-Azhar".

5. `contributions.mjs` mengambil issue berlabel `usulan-masjid` lewat `gh api`, menyisakan yang berlabel `usulan-disetujui` (dan tidak `usulan-ditolak`), lalu membaca blok JSON di badan tiap issue (`src/lib/mosque-contrib.ts`). `build.mjs` memasukkannya sebagai sumber ketiga dengan aturan duplikat yang sama: begitu OpenStreetMap atau Overture memetakan tempat itu, entri sumber peta yang dipakai. Usulan yang blok JSON-nya tidak terbaca dilewati dengan peringatan, dan workflow mencatat berapa usulan terbuka yang belum diberi label.

ID dari OpenStreetMap berbentuk `n…`, `w…`, atau `r…`. ID dari Overture berbentuk `o` diikuti ID Overture tanpa tanda hubung. ID dari usulan pengguna berbentuk `c` diikuti nomor issue-nya.

**Usulan pengguna.** Setiap usulan adalah satu issue berlabel `usulan-masjid` (dibuat aplikasi lewat `POST /api/mosques/suggest`, hanya dari fix ≤50 m tanpa tempat tercatat dalam 60 m; paling banyak 3 per menit per IP, dan berhenti saat 50 usulan terbuka menunggu) yang memuat nama, jenis, jalan, posisi, dan tautan peta. Pemilik memeriksanya di peta, lalu memberi label `usulan-disetujui` atau `usulan-ditolak` dan menutup issue-nya; bila ada yang perlu dibetulkan, blok JSON di badan issue diubah dulu. Usulan masuk ke dataset pada build berikutnya dan tampil berlabel "Usulan pengguna"; mengganti labelnya menjadi `usulan-ditolak` menariknya kembali. Kontributor melepaskan usulannya ke domain publik (CC0), jadi ikut lisensi ODbL dataset.

**Kolom.** `id`, `lat`, `lng` (pusat kotak pembatas, bilangan bulat 1e-5°), `type`, `name`, `street`, lalu `dlat` dan `dlng`: setengah lebar denah bangunan dalam 1e-5° untuk way dan relation OpenStreetMap, 0 untuk titik dan tempat Overture. Jarak diukur ke tepi kotak itu, jadi di gerbang masjid besar jaraknya ke dindingnya, bukan ke tengah halamannya. Denah yang lebih lebar dari 0,005° (~550 m, `MAX_HALF_EXTENT_DEG`) adalah kompleks atau area yang salah, dan disimpan sebagai titik. File dengan header lama (tanpa dua kolom terakhir) tetap terbaca.

**Validasi** (`validate.mjs`) menolak dataset bila:
- ada ID ganda;
- ada titik di luar Indonesia;
- ada denah bangunan yang lebih lebar dari 0,005°;
- Istiqlal, Baiturrahman, atau Al-Akbar hilang;
- jumlah dari OpenStreetMap berubah lebih dari 5%, atau jumlah dari Overture lebih dari 10%, dibanding data sebelumnya. Unduhan Overture yang gagal ikut tertangkap aturan ini. Jumlah usulan pengguna tidak dibatasi: beberapa usulan saja bisa melipatgandakannya.

**Publikasi.** Bila datanya berubah, `publish.sh` membuka pull request dari branch `data/mosques`, menjalankan CI di atasnya, lalu me-merge-nya bila hijau.
- Dataset pertama tidak di-merge otomatis.
- PR data juga menunggu pemilik bila ruleset mewajibkan review atau check `screenshots (base vs head)` (check itu tidak jalan untuk PR buatan workflow).
- Supaya workflow boleh membuka pull request, aktifkan **Allow GitHub Actions to create and approve pull requests** (Settings → Actions → General → Workflow permissions).

**Uji coba perubahan.** Pull request yang mengubah pipeline ini juga menjalankan build dan validasi pada data sungguhan, tanpa membuka PR data. Datasetnya bisa diunduh dari artifact `mosques`.

**Lisensi.** Datanya © kontributor OpenStreetMap dan Overture Maps Foundation, berlisensi ODbL 1.0. Bagian dari Overture juga berlisensi CDLA-Permissive-2.0, yang mewajibkan teksnya disertakan bersama data; usulan pengguna dilepaskan dengan CC0 1.0. Semuanya tercatat di `data/LICENSE`, dan UI menyebut ketiga sumber.

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
