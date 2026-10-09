# Changelog

Semua perubahan penting dicatat di sini. Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan nomor versinya mengikuti [Semantic Versioning](https://semver.org/lang/id/). Setiap versi bersesuaian dengan satu pull request yang di-merge ke `main`, dan setiap merge langsung di-deploy ke production.

## [Belum dirilis] — v2.1.1

### Ditambahkan
- **Pipeline data masjid mingguan** (workflow **Mosque data**, `scripts/mosque-data`). Pipeline ini membangun `data/mosques.tsv` dari ekstrak OpenStreetMap Indonesia (Geofabrik), dengan aturan yang sama dengan aplikasi. Tambahannya: bangunan yang hanya bernama masjid atau musholla ikut terdata, dan masjid yang dipetakan dua kali ditulis sekali.
- **Validasi sebelum dipakai.** Dataset ditolak bila ada ID ganda, ada titik di luar Indonesia, landmark hilang, atau jumlahnya berubah lebih dari 5% dalam seminggu.
- **PR data mingguan.** Perubahan diajukan lewat pull request yang di-merge otomatis setelah CI hijau; dataset pertama diperiksa manual.
- **Uji coba perubahan pipeline.** Pull request yang mengubah pipeline menjalankannya pada data sungguhan.
- **Pengukuran Overture Places**, hanya lewat dispatch manual. Hasilnya menentukan apakah sumber itu layak digabung.
- Data berlisensi ODbL dengan atribusi kontributor OpenStreetMap (`data/LICENSE`). Aplikasi belum memakai dataset ini; `/api/mosques` beralih ke dataset ini di versi berikutnya.

## [2.1.0] — 2026-10-09 ([#489](https://github.com/irfan-yulianto/si-imsak/pull/489))

Pencari masjid menemukan masjid dan musholla terdekat dari posisi GPS Anda, dengan urutan yang benar.

### Diubah
- **GPS otomatis.** Bila izin lokasi sudah diberikan, GPS langsung dipakai saat pencari masjid dibuka, tanpa menekan tombol. Sebelumnya, pada kunjungan ulang, pencarian dilakukan di sekitar pusat kota.
- **GPS dipertajam.** GPS juga dipertajam lagi saat aplikasi dibuka kembali, bila posisinya sudah lebih dari 2 menit atau kurang akurat.
- **Posisi dari deteksi kota.** Posisi dari deteksi kota disimpan beserta akurasi dan waktunya. Posisi yang kasar atau lama dipertajam dulu, tidak langsung dianggap "Lokasi GPS Anda".
- **Hasil lebih cepat.** Hasil muncul dari fix GPS pertama, tidak lagi menunggu sampai 15 detik.
- **Urutan diperbarui.** Urutan masjid diperbarui saat GPS makin akurat atau saat Anda berpindah. Pencarian diulang hanya bila daftar yang ada tidak lagi menjamin urutan terdekat dari posisi itu.
- **Pencarian lebih luas.** Masjid dan musholla yang dipetakan sebagai relation, bertag `religion=islam`, atau tempat ibadah tanpa tag agama yang bernama "Masjid …"/"Musholla …" ikut dicari.
- **Musholla dikenali dari namanya.** Termasuk mushola, musala, langgar, surau, meunasah, dan tajug.
- **Tanpa duplikat.** Masjid yang dipetakan sebagai titik sekaligus bangunan ditampilkan sekali.
- **Hasil lebih banyak.** Sampai 50 hasil, 20 di antaranya tampil lebih dulu, dengan tombol "Tampilkan lebih banyak".
- **Daftar tidak berkedip.** Saat memuat ulang, daftar tetap tampil dengan keterangan "Memperbarui…", bukan kembali ke kerangka kosong.
- **Label lokasi jelas.** Bila tidak memakai GPS, pencari menulis "Sekitar pusat {kota}, bukan lokasi Anda", atau nama kota yang dipilih di kotak pencarian.
- **Atribusi dan laporan.** Ada atribusi "© kontributor OpenStreetMap" (wajib menurut lisensi ODbL), keterangan bahwa jarak diukur garis lurus, dan tautan untuk melaporkan masjid atau musholla yang belum tercantum ke OpenStreetMap.

### Diperbaiki
- **Tautan Google Maps.** "Cari lebih banyak di Google Maps" kini benar-benar mencari di sekitar lokasi yang dipakai. Parameter `center` sebelumnya diabaikan Google Maps.
- **Pesan bila GPS tidak menemukan posisi.** Bila GPS tidak menemukan posisi, muncul pesan; sebelumnya pencarian lokasi berhenti tanpa keterangan. Yang dipakai juga fix paling akurat, bukan yang terakhir.
- **Kota yang dipilih.** Memilih kota menghentikan GPS, sehingga fix yang datang belakangan tidak lagi menggantikan kota yang dipilih. Pilihan "Perluas Pencarian" juga tidak lagi hilang setiap kali GPS memberi posisi baru.

### Dihapus
- **Cache hasil masjid di perangkat.** Cache ini (30 menit) menyimpan 20 masjid terdekat dari titik lama dan dipakai lagi dalam radius ±1 km, sehingga bisa menampilkan "terdekat" yang salah. Cache lamanya dihapus saat aplikasi dibuka.

## [2.0.2] — 2026-10-09 ([#488](https://github.com/irfan-yulianto/si-imsak/pull/488))

### Diperbaiki
- Pencari masjid kembali mendapat jawaban.
  - Mirror Overpass yang dipakai kini `overpass.private.coffee` (pengganti `overpass.kumi.systems`) dan `overpass-api.de`.
  - `overpass.openstreetmap.ru`, yang sudah tidak menjawab, dihapus.
- Query yang kehabisan waktu atau memori di Overpass tidak lagi tampil sebagai "Tidak ada masjid ditemukan", dan tidak di-cache.
  - Mirror berikutnya yang ditanya.
  - Bila semua gagal, pengguna diminta mencoba lagi.
- Batas pencarian masjid naik dari 10 menjadi 20 per menit per IP, karena banyak pengguna seluler berbagi satu IP.

### Diubah
- CDN menyimpan hasil pencarian masjid 24 jam, dan tetap melayaninya sampai 7 hari bila Overpass gagal. Hasil kosong hanya disimpan 10 menit.

## [2.0.1] — 2026-10-09 ([#485](https://github.com/irfan-yulianto/si-imsak/pull/485))

### Diperbaiki
- Link "Masjid Terdekat" di header memindahkan fokus keyboard dan screen reader ke pencari masjid, bukan hanya menggulir layar.

## [2.0.0] — 2026-10-09 ([#484](https://github.com/irfan-yulianto/si-imsak/pull/484))

Tampilan baru di atas token desain. Tidak ada fitur yang ditambah atau dihapus; versi mayor karena hampir semua layar berubah.

### Diubah
- Warna, radius, bayangan, dan ukuran teks didefinisikan sekali per tema sebagai token di `globals.css`, dan komponen memakai nama semantiknya (`bg-surface`, `text-fg-muted`, `rounded-card`, …). Komponen dasar baru di `components/ui/`: Button, Card, Badge, Spinner, dan Skeleton.
- Jadwal bulanan menjadi satu tabel ringkas untuk semua layar, menggantikan kartu per hari di HP. Di HP tabelnya ada di kotak yang bisa digeser ke dua arah, dengan kolom tanggal dan judul kolom tetap terlihat, dan dibuka di baris hari ini. Tinggi halaman di HP turun dari ±16.000 px menjadi ±3.900 px.
- Di desktop, countdown berada di samping jadwal hari ini. Di tab masjid, kontrol tetap terlihat di samping daftar hasil.
- Di HP, pencarian kota mendapat baris sendiri di header. Header, navigasi bawah, dan tombol yang melayang memperhitungkan notch dan home indicator iOS. Fokus keyboard tidak pernah tertutup header atau navigasi bawah.
- Pemberitahuan versi baru dan tombol "Hari Ini" ditumpuk dalam satu kolom, sehingga tidak lagi saling menutupi. Tombol "Hari Ini" tidak muncul di tab masjid.
- Countdown: nama sholat menjadi judul, lengkap dengan jamnya. Denyut tanpa henti dihapus; animasi hanya muncul saat waktu sholat tiba.
- Jadwal hari ini: waktu yang sudah lewat diredupkan, bukan dicoret, dan tanggal Hijriyah ada di bawah judul.
- Kontras kartu terhadap latar dinaikkan di kedua tema. Warna bar browser (`theme-color`) mengikuti tema.
- Indikator fokus keyboard punya kontras minimal 3:1 di semua permukaan; sebelumnya 2,3:1 di tema terang.
- Pesan lebih seragam: setiap pesan diakhiri titik, tanpa istilah teknis, dan satu pesan untuk perangkat tanpa deteksi lokasi.
- Manifest PWA berbahasa Indonesia dan mendukung semua orientasi. Ia juga menyertakan screenshot untuk dialog install dan shortcut ke Masjid Terdekat (`scripts/pwa-screenshots.mjs` membuat ulang screenshot-nya).
- Fade-in bertahap dihapus, dan banner install pindah ke akhir panel jadwal. Setiap skeleton seukuran isinya, dan tes E2E kini mewajibkan CLS di bawah 0,02.
- CSS awal turun dari 11,6 KB menjadi 8,5 KB (gzip). JavaScript awal 198,0 KB, sedikit di bawah v1.3.0.

### Diperbaiki
- Halaman tidak lagi bisa digeser ke samping di HP 320 px, atau di tab masjid saat ada nama masjid yang panjang.

### Privasi
- Pencari masjid menulis "Lokasi GPS Anda", bukan koordinat Anda, sehingga posisi tidak terbaca dari layar atau rekaman layar.

### Dihapus
- Tampilan kartu per hari di HP (`MobileCards`) dan tabel khusus desktop (`DesktopTable`), keduanya diganti `MonthTable`.

## [1.3.0] — 2026-10-09 ([#483](https://github.com/irfan-yulianto/si-imsak/pull/483))

### Diubah
- Store dipecah per slice. Satu cache bulan (`months`, paling banyak 12 bulan) menggantikan `schedule` dan `countdownSchedule`, dan pindah kota memakai token sehingga jawaban lambat untuk kota sebelumnya diabaikan.
- Satu modul untuk masing-masing urusan: tanggal dan jam kota (`city-time.ts`), validasi data dari luar (`validate.ts`), localStorage (`storage.ts`, dengan envelope `si:*` dan migrasi key lama), serta satu jam bersama yang berdetak di setiap pergantian menit (`clock.ts`).
- `useAppBootstrap()` mengurus start-up: migrasi dan hydrate cache, memuat kota, status online, sinkronisasi jam server, dan pergantian bulan.
- Tabel jadwal, countdown, dan pencari masjid dipecah menjadi komponen dan hook kecil. Menggulir tidak lagi me-render ulang tabel bulanan.
- Route API memakai helper bersama (`lib/http.ts`). Rate limit dihitung per route, dan jawaban 429 menyertakan `Retry-After`.
- Overpass ditanya satu mirror dulu; mirror berikutnya hanya bila yang sebelumnya gagal atau belum menjawab dalam 3 detik. Nominatim dipanggil paling banyak sekali per detik per instance.
- `/api/mosques` hanya menerima radius yang dipakai aplikasi: 2, 3, 4, 6, 8, atau 10 km.
- Kalender Hijriyah tetap Umm al-Qura. Endpoint kalender MyQuran ternyata memakai perhitungan "standar", bukan hasil isbat Kemenag, jadi tidak lebih akurat; README menjelaskan kemungkinan selisih satu hari.

### Diperbaiki
- Waktu sholat diumumkan tepat pada waktunya; sebelumnya bisa terlambat sampai 1 detik. Digit countdown langsung terisi saat tampil.
- Pencarian kota yang gagal karena jaringan kini mengatakannya, bukan "Kota tidak ditemukan".
- Pencari masjid membatalkan pencarian lama saat pencarian baru dimulai, dan tetap menemukan lokasi kota meski MyQuran mengubah penulisan namanya.
- Tombol "Hari Ini" yang melayang mengikuti kartu hari baru setelah tengah malam.

### Privasi
- Untuk mendeteksi kota, posisi dikirim dengan pembulatan 2 desimal (±1 km), bukan 3 desimal (±110 m).

### Dihapus
- Aset bawaan create-next-app yang tidak dipakai, `CopyIcon`, catatan `.jules/`, serta dukungan untuk data lama di perangkat (ID kota numerik, `detectedKecamatan`).

## [1.2.0] — 2026-10-09 ([#473](https://github.com/irfan-yulianto/si-imsak/pull/473), [#480](https://github.com/irfan-yulianto/si-imsak/pull/480))

### Ditambahkan
- Tes end-to-end Playwright terhadap build production, dengan MyQuran, Nominatim, dan Overpass tiruan. Setiap tes gagal bila ada error di console, error halaman, atau pelanggaran CSP. Spec mencakup hydration, countdown, zona waktu perangkat, race pindah kota, retry, lokasi, masjid, offline, aksesibilitas (axe), dan layout shift.
- Perbandingan screenshot `main` vs pull request (`visual.yml`). Label `visual-change` menandai perubahan tampilan yang disengaja.
- CI dengan action yang dipin ke SHA: lint, typecheck, audit dependensi dan tanda tangan registry, coverage, build, anggaran ukuran bundle, unit test di empat zona waktu, dan E2E.
- Synthetic monitoring tiap jam terhadap production, MyQuran, Nominatim, dan Overpass. Kegagalan membuka issue berlabel `synthetic-failure`.
- Log server berformat JSON (`instrumentation.ts`, `lib/log.ts`) dan header `X-App-Version`. Halaman error mencatat digest yang bisa dicocokkan dengan log server.
- Dependabot mingguan, `LICENSE`, `SECURITY.md`, `/.well-known/security.txt`, `CODEOWNERS`, template pull request, dan changelog ini.

### Diubah
- Function berjalan di region Singapura (`sin1`), dekat pengguna dan MyQuran.
- Header keamanan diperketat: COOP, CORP untuk API, `script-src-attr 'none'`, font hanya dari origin sendiri, dan tanpa `X-Powered-By`.
- Node.js 22 dipakai di semua tempat (`engines`, `.nvmrc`, CI).
- Service worker memakai navigation preload. Halaman dan jadwal diambil dari cache bila server membalas 5xx atau jaringan lebih lambat dari 3,5 detik. Salinan jadwal dibatasi 48 dan yang kedaluwarsa dibersihkan.

### Diperbaiki
- Pesan "Waktunya …" kadang terlewat bila pengecekan 3 detik mendahului tick 1 detik.
- Dengan `prefers-reduced-motion`, konten tidak lagi menunggu jeda animasi sebelum tampil.
- Monitor synthetic mengenali halaman "Security Checkpoint" Vercel sebagai kegagalan tersendiri, dan bisa melewatinya dengan token bypass (`SYNTHETIC_TOKEN`) ([#480](https://github.com/irfan-yulianto/si-imsak/pull/480)).

## [1.1.0] — 2026-10-09 ([#472](https://github.com/irfan-yulianto/si-imsak/pull/472))

### Keamanan
- Next.js 16.4.0 dan React 19.3.0, menutup advisory kritis dan tinggi di Next.js 16.1.6.

### Diperbaiki
- Kalimantan Tengah memakai WIB, bukan WITA; sebelumnya semua waktu sholat di provinsi itu meleset satu jam.
- Tidak ada lagi hydration mismatch saat bulan kunjungan berbeda dengan bulan build, atau di sekitar pergantian bulan.
- Pindah kota saat berpindah bulan tidak lagi bisa menampilkan jadwal kota lain.
- Countdown pulih sendiri bila pemuatan jadwal pertama gagal.
- `/api/schedule` selesai paling lama 8 detik saat MyQuran lambat atau down, dengan `Retry-After` dan jeda 15 detik sebelum mencoba lagi.
- Pencari masjid: radius pilihan tetap dipakai, dan hasil yang sudah basi tidak lagi menimpa hasil baru.
- Font Plus Jakarta Sans tampil, preview link (gambar OG) dan favicon diperbaiki, kontras tombol pembaruan memenuhi AA, safe area iOS dihormati, dan tanggal Hijriyah benar di zona waktu UTC+12.

### Privasi
- Elemen yang memuat lokasi ditandai `data-clarity-mask` supaya tidak terekam Clarity. README kini menjelaskan data apa yang dikirim ke siapa.

## [1.0.0] — 2026-10-08 ([#471](https://github.com/irfan-yulianto/si-imsak/pull/471))

### Diubah
- Satu panggilan MyQuran per bulan (dengan fallback per hari), cache CDN untuk route API, sinkronisasi jam lewat `/api/time` milik sendiri, dan rate limiter.
- Perbaikan hydration, countdown di akhir bulan, dan service worker berversi dengan notifikasi pembaruan.
- Navigasi tab ARIA, pencarian kota dengan pola combobox, status dan error yang diumumkan ke screen reader, serta kontras WCAG 2.1 AA.
- CI pertama (lint dan typecheck bersih), dan lockfile khusus npm.

[Belum dirilis]: https://github.com/irfan-yulianto/si-imsak/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/irfan-yulianto/si-imsak/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/irfan-yulianto/si-imsak/releases/tag/v1.0.0
