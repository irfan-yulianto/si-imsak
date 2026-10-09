# Kebijakan Keamanan

*To report a vulnerability, please use GitHub's [private vulnerability reporting](https://github.com/irfan-yulianto/si-imsak/security/advisories/new). Reports in English or Indonesian are welcome.*

## Versi yang didukung

Hanya versi yang sedang berjalan di [si-imsak.vercel.app](https://si-imsak.vercel.app), yaitu branch `main`, yang menerima perbaikan keamanan.

## Melaporkan kerentanan

Jangan laporkan kerentanan lewat issue, diskusi, atau pull request publik. Kirim laporan secara privat lewat **[private vulnerability reporting](https://github.com/irfan-yulianto/si-imsak/security/advisories/new)** GitHub.

Sertakan:

- bagian yang terdampak (halaman, route API, service worker, dependensi);
- langkah untuk mereproduksi, atau bukti konsep;
- dampak yang Anda perkirakan.

Yang bisa Anda harapkan:

- tanggapan pertama dalam 7 hari;
- kabar perkembangan sampai laporan selesai ditangani;
- nama Anda dicantumkan di advisory bila Anda mau.

## Cakupan

Termasuk: kode di repositori ini dan deployment-nya di si-imsak.vercel.app, misalnya XSS, kebocoran data lokasi, penyalahgunaan route `/api/*` untuk menyerang pihak lain, atau celah di service worker.

Tidak termasuk:

- kerentanan di layanan pihak ketiga (MyQuran, OpenStreetMap, Vercel, Microsoft Clarity); laporkan langsung ke pemiliknya;
- serangan volumetrik (DoS);
- temuan pemindai otomatis tanpa dampak yang bisa ditunjukkan.

Lihat juga [`/.well-known/security.txt`](https://si-imsak.vercel.app/.well-known/security.txt).
