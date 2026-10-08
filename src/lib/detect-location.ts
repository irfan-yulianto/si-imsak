import { useStore } from "@/store/useStore";
import { reverseGeocodeCity, searchCities, getSchedule } from "./api";
import { getTimezone } from "./timezone";
import { Location } from "@/types";

export interface DetectionResult {
  success: boolean;
  error?: string;
}

/**
 * Detect GPS location, find nearest city, and update schedule.
 * Uses Zustand store directly (works outside React).
 */
export function detectAndUpdateLocation(): Promise<DetectionResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ success: false, error: "Geolocation tidak tersedia" });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const store = useStore.getState();

        store.setUserCoords({ lat: latitude, lng: longitude });

        // Try reverse geocoding first, fall back to local centroid database
        let geocodedCity = "";
        try { geocodedCity = await reverseGeocodeCity(latitude, longitude); } catch {}
        // The 500+ city table is only loaded when geocoding failed — keeps it out of the initial bundle
        const cityGuess =
          geocodedCity || (await import("./cities")).getCityGuess(latitude, longitude);
        if (!cityGuess) {
          resolve({ success: false, error: "Tidak dapat mendeteksi kota" });
          return;
        }

        try {
          const searchRes = await searchCities(cityGuess);
          if (!searchRes.status || !searchRes.data?.length) {
            resolve({ success: false, error: "Kota tidak ditemukan dalam database" });
            return;
          }

          const guessNorm = cityGuess.toUpperCase().trim();
          const city: Location =
            searchRes.data.find(
              (c) => c.lokasi.toUpperCase().trim() === guessNorm
            ) ?? searchRes.data[0];

          // Save to localStorage
          try {
            localStorage.setItem("selectedLocation", JSON.stringify(city));
            localStorage.setItem("locationPermissionDismissed", String(Date.now()));
          } catch {}

          // Fetch prayer schedule
          const now = new Date();
          store.beginScheduleLoad(city.id, now.getFullYear(), now.getMonth() + 1);

          const res = await getSchedule(city.id, now.getFullYear(), now.getMonth() + 1);
          if (res.status && res.data?.jadwal) {
            const tz = getTimezone(res.data.daerah || city.daerah || "");
            store.setLocation(
              { ...city, daerah: res.data.daerah || city.daerah },
              tz
            );
            store.setSchedule(res.data.jadwal);
            store.setCountdownSchedule(res.data.jadwal);
            store.setViewMonth(now.getMonth() + 1, now.getFullYear());
            resolve({ success: true });
          } else {
            store.setScheduleError("Data jadwal tidak tersedia");
            resolve({ success: false, error: "Data jadwal tidak tersedia" });
          }
        } catch {
          const store = useStore.getState();
          store.setScheduleError(
            navigator.onLine
              ? "Gagal memuat jadwal. Coba lagi nanti."
              : "Anda sedang offline. Periksa koneksi internet."
          );
          resolve({ success: false, error: "Gagal memuat jadwal" });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ success: false, error: "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi." });
        } else if (error.code === error.TIMEOUT) {
          resolve({ success: false, error: "Waktu deteksi habis. Coba lagi." });
        } else {
          resolve({ success: false, error: "Gagal mendeteksi lokasi" });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
