// The mosque finder's messages (the app's others are in messages.ts)

import { COARSE_M, SHARP_M } from "@/lib/geofix";

export const MOSQUE_MESSAGES = {
  // Its GPS (a device without one gets MESSAGES.noGeolocation)
  gpsDenied: "Izin lokasi ditolak. Buka pengaturan browser atau gunakan pencarian kota di bawah.",
  gpsUnavailable: "Lokasi tidak tersedia. Pastikan GPS aktif.",
  gpsTimeout: "Lokasi belum ditemukan. Pastikan GPS aktif, lalu coba lagi di tempat terbuka.",
  gpsFailed: "Gagal mendeteksi lokasi. Coba lagi.",
  gpsNotLocked:
    "GPS belum mengunci. Di tempat terbuka akurasinya biasanya 20 m atau lebih baik; tekan Perbarui Lokasi GPS untuk mencoba lagi.",
  // The search
  serviceBusy: "Layanan pencarian masjid sedang sibuk. Coba lagi beberapa saat.",
  tooManyRequests: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
  serverError: "Server sedang bermasalah. Coba lagi nanti.",
  failed: "Server gagal memuat data masjid. Coba tekan Muat Ulang.",
  connectionFailed: "Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.",
  stale: "Gagal memperbarui data. Menampilkan hasil sebelumnya.",
  // Suggesting a place that isn't listed
  suggestionRejected: "Permintaan tidak dikenali.",
  suggestionInvalid: "Periksa lagi isiannya: nama dan jalan hanya huruf, angka, spasi, dan tanda baca biasa, paling panjang 80 karakter.",
  suggestionNameMissing: "Tulis nama masjid atau musholla-nya dulu.",
  suggestionNameHint: "Tanpa kata \"Masjid\" atau \"Musholla\": itu dari pilihan jenis di atas.",
  suggestionNeedsSharpFix: "Posisi GPS belum cukup akurat untuk mengusulkan tempat. Tunggu sampai ±50 m atau lebih baik.",
  suggestionsOff: "Fitur usulan belum aktif di server ini.",
  suggestionsFull: "Antrean usulan sedang penuh. Coba lagi beberapa hari lagi, setelah usulan yang ada diperiksa.",
} as const;

/** The place is in the data already, under this name */
export function suggestionExists(name: string): string {
  return `Sudah tercatat: ${name}. Bila datanya keliru, laporkan di OpenStreetMap.`;
}

/** What the form says it sends, and what happens next; `accuracy` is the fix's (m) */
export function suggestionIntro(accuracy: number): string {
  return `Yang dikirim: jenis, nama, jalan, dan posisi Anda sekarang (±${Math.round(accuracy)} m), tanpa identitas Anda. Usulan diperiksa dulu sebelum masuk ke data, dan Anda melepaskannya ke domain publik (CC0).`;
}

/** The suggestion was taken, as issue `number` (0: the number wasn't told) */
export function suggestionSent(number: number): string {
  return `Terima kasih. Usulan${number > 0 ? ` #${number}` : " Anda"} diterima dan akan diperiksa dulu; bila sesuai, masuk ke data dalam satu–dua minggu.`;
}

/** No mosque within `reach` (e.g. "25 km") */
export function noMosquesMessage(reach: string): string {
  return `Tidak ada masjid atau musholla yang tercatat dalam ${reach}. Coba cari di Google Maps, atau laporkan yang Anda tahu di OpenStreetMap.`;
}

/** Where the search is when it isn't around the GPS position */
export function cityCentreLabel(city: string, picked: boolean): string {
  return picked ? `Sekitar pusat ${city}` : `Sekitar pusat ${city}, bukan lokasi Anda`;
}

/** The platforms whose settings a hint can name */
export type Platform = "android" | "ios" | "other";

/** The platform a user agent string names */
export function platformOf(userAgent: string): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  return "other";
}

/** Where the browser's location permission is made precise */
const PRECISE_LOCATION_SETTING: Record<Platform, string> = {
  android: 'buka Setelan → Aplikasi → browser Anda (misalnya Chrome) → Izin → Lokasi, lalu aktifkan "Gunakan lokasi akurat"',
  ios: 'buka Pengaturan → Privasi & Keamanan → Layanan Lokasi → Safari (atau Chrome), lalu aktifkan "Lokasi Persis" (Precise Location)',
  other: "izinkan browser ini memakai lokasi akurat di pengaturan lokasi perangkat",
};

/**
 * The browser is allowed only the approximate location (a kilometre or more; Android
 * gives exactly 2 km): the position is off by that much, and so are the distances
 */
export function approximateLocationHint(platform: Platform): string {
  return `Browser hanya mendapat lokasi perkiraan, bukan posisi GPS, sehingga jarak di bawah hanya kira-kira. Untuk lokasi akurat, ${PRECISE_LOCATION_SETTING[platform]}, lalu tekan Perbarui Lokasi GPS.`;
}

/**
 * What to tell the user once the watch has settled on a fix rougher than SHARP_M: an
 * approximate location and how to make it precise, or a GPS that hasn't locked yet
 */
export function gpsHint(settled: boolean, accuracy: number | null, platform: Platform): string | null {
  if (!settled || accuracy === null || accuracy <= SHARP_M) return null;
  return accuracy >= COARSE_M ? approximateLocationHint(platform) : MOSQUE_MESSAGES.gpsNotLocked;
}
