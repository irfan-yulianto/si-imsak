// The mosque finder's messages (the app's others are in messages.ts)

export const MOSQUE_MESSAGES = {
  // Its GPS (a device without one gets MESSAGES.noGeolocation)
  gpsDenied: "Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.",
  gpsUnavailable: "Lokasi tidak tersedia. Pastikan GPS aktif.",
  gpsFailed: "Gagal mendeteksi lokasi. Coba lagi.",
  // The search
  serviceBusy: "Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat.",
  tooManyRequests: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  serverError: "Server sedang bermasalah. Coba lagi nanti.",
  failed: "Server gagal memuat data masjid. Coba tekan Muat Ulang.",
  connectionFailed: "Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.",
  stale: "Gagal memperbarui data. Menampilkan hasil sebelumnya.",
} as const;

/** No mosque within `radius` (e.g. "2 km") */
export function noMosquesMessage(radius: string): string {
  return `Tidak ada masjid ditemukan dalam radius ${radius}. Coba perbesar radius atau pindah lokasi.`;
}
