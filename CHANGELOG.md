# Changelog

Semua perubahan penting dicatat di sini. Formatnya mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/), dan nomor versinya mengikuti [Semantic Versioning](https://semver.org/lang/id/). Setiap versi bersesuaian dengan satu pull request yang di-merge ke `main`, dan setiap merge langsung di-deploy ke production.

## [Belum dirilis] — v1.2.0

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
