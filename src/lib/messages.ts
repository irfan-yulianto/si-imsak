// What the app tells its users when something can't be loaded or found, in one place

export const MESSAGES = {
  offline: "Anda sedang offline. Periksa koneksi internet Anda.",
  loadFailed: "Gagal memuat jadwal. Coba lagi nanti.",
  noSchedule: "Data tidak tersedia untuk bulan ini",
  // Location detection (GPS → city)
  noGeolocation: "Geolocation tidak tersedia",
  cityNotDetected: "Tidak dapat mendeteksi kota",
  cityNotInDatabase: "Kota tidak ditemukan dalam database",
  citySearchFailed: "Gagal mencari kota. Periksa koneksi internet",
  permissionDenied: "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.",
  detectTimeout: "Waktu deteksi habis",
  detectFailed: "Gagal mendeteksi lokasi",
} as const;

/** Why a schedule didn't load: the device being offline, or anything else */
export function loadFailedMessage(): string {
  return typeof navigator !== "undefined" && !navigator.onLine ? MESSAGES.offline : MESSAGES.loadFailed;
}
