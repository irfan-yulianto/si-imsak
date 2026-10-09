import { useStore } from "@/store/useStore";
import { reverseGeocodeCity, searchCities } from "./api";
import { Location } from "@/types";

export interface DetectionResult {
  success: boolean;
  error?: string;
  /** The user picked a city while detection was running; their choice was kept. */
  superseded?: boolean;
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

    // A city chosen by hand while GPS is still working wins over the detected one
    const startCityToken = useStore.getState()._cityToken;
    const superseded = () => useStore.getState()._cityToken !== startCityToken;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        useStore.getState().setUserCoords({ lat: latitude, lng: longitude });

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
          if (superseded()) {
            resolve({ success: false, superseded: true });
            return;
          }
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

          const result = await useStore.getState().loadCitySchedule(city);
          if (result.superseded) resolve({ success: false, superseded: true });
          else if (result.ok) resolve({ success: true });
          else resolve({ success: false, error: result.error ?? "Gagal memuat jadwal" });
        } catch {
          resolve({ success: false, error: "Gagal mencari kota. Periksa koneksi internet" });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          resolve({ success: false, error: "Izin lokasi ditolak. Aktifkan GPS dan izinkan akses lokasi." });
        } else if (error.code === error.TIMEOUT) {
          resolve({ success: false, error: "Waktu deteksi habis" });
        } else {
          resolve({ success: false, error: "Gagal mendeteksi lokasi" });
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
