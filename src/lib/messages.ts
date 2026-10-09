// What the app tells its users when something fails, is missing or can't be found, in one
// place. The mosque finder's own messages are in mosque-messages.ts: the finder loads
// only when its tab opens, and they load with it.
// Every message is a sentence and ends with a period; headings are in title case.

export const MESSAGES = {
  // Schedule
  offline: "Anda sedang offline. Periksa koneksi internet Anda.",
  loadFailed: "Gagal memuat jadwal. Coba lagi nanti.",
  noSchedule: "Data tidak tersedia untuk bulan ini.",
  chooseCity: "Pilih kota untuk melihat jadwal sholat.",
  noTodaySchedule: "Jadwal hari ini belum tersedia.",
  countdownUnavailable: "Jadwal Tidak Tersedia",
  countdownRetrying: "Dicoba lagi otomatis. Periksa koneksi internet atau pilih kota lain.",
  // City search
  cityNotFound: "Kota tidak ditemukan.",
  citySearchFailed: "Gagal mencari kota. Periksa koneksi internet Anda.",
  // Location detection (GPS → city); noGeolocation is the mosque finder's too
  noGeolocation: "Perangkat ini tidak mendukung deteksi lokasi.",
  cityNotDetected: "Tidak dapat mendeteksi kota.",
  cityNotInDatabase: "Kota Anda tidak ada dalam daftar.",
  permissionDenied: "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi.",
  detectTimeout: "Waktu deteksi lokasi habis.",
  detectFailed: "Gagal mendeteksi lokasi.",
  locationUnknown: "Lokasi tidak dapat dideteksi.",
  typeCityInstead: "Ketik nama kota Anda di kolom pencarian.",
} as const;

/** Why a schedule didn't load: the device being offline, or anything else */
export function loadFailedMessage(): string {
  return typeof navigator !== "undefined" && !navigator.onLine ? MESSAGES.offline : MESSAGES.loadFailed;
}

/** The location prompt's explanation when detection failed: why, and what to do instead */
export function detectFailedMessage(error: string | undefined): string {
  if (error?.includes("ditolak")) return `Izin lokasi ditolak. ${MESSAGES.typeCityInstead}`;
  return `${(error || MESSAGES.locationUnknown).replace(/\.+$/, "")}. ${MESSAGES.typeCityInstead}`;
}
