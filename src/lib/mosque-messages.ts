// The mosque finder's messages (the app's others are in messages.ts)

export const MOSQUE_MESSAGES = {
  // Its GPS (a device without one gets MESSAGES.noGeolocation)
  gpsDenied: "Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.",
  gpsUnavailable: "Lokasi tidak tersedia. Pastikan GPS aktif.",
  gpsTimeout: "Lokasi belum ditemukan. Pastikan GPS aktif, lalu coba lagi di tempat terbuka.",
  gpsFailed: "Gagal mendeteksi lokasi. Coba lagi.",
  // The search
  serviceBusy: "Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat.",
  tooManyRequests: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  serverError: "Server sedang bermasalah. Coba lagi nanti.",
  failed: "Server gagal memuat data masjid. Coba tekan Muat Ulang.",
  connectionFailed: "Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.",
  stale: "Gagal memperbarui data. Menampilkan hasil sebelumnya.",
} as const;

/** No mosque within `reach` (e.g. "25 km") */
export function noMosquesMessage(reach: string): string {
  return `Tidak ada masjid atau musholla yang tercatat dalam ${reach}. Coba cari di Google Maps, atau laporkan yang Anda tahu di OpenStreetMap.`;
}

/** Where the search is when it isn't around the GPS position */
export function cityCentreLabel(city: string, picked: boolean): string {
  return picked ? `Sekitar pusat ${city}` : `Sekitar pusat ${city}, bukan lokasi Anda`;
}
