import { describe, it, expect } from "vitest";
import { MOSQUE_MESSAGES, approximateLocationHint, cityCentreLabel, gpsHint, noMosquesMessage, platformOf } from "./mosque-messages";

describe("platformOf", () => {
  it("tells Android and iOS apart from the rest", () => {
    expect(platformOf("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36")).toBe("android");
    expect(platformOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1")).toBe("ios");
    expect(platformOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15")).toBe("ios");
    expect(platformOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36")).toBe("other");
    expect(platformOf("")).toBe("other");
  });
});

describe("gpsHint", () => {
  it("says nothing while the watch runs, or once the fix is sharp", () => {
    expect(gpsHint(false, 2000, "android")).toBeNull();
    expect(gpsHint(true, null, "android")).toBeNull();
    expect(gpsHint(true, 50, "android")).toBeNull();
  });

  it("says the GPS hasn't locked when the fix stays rough", () => {
    expect(gpsHint(true, 120, "other")).toBe(MOSQUE_MESSAGES.gpsNotLocked);
    expect(gpsHint(true, 999, "other")).toBe(MOSQUE_MESSAGES.gpsNotLocked);
  });

  it("explains an approximate location, with the platform's own settings", () => {
    const android = gpsHint(true, 2000, "android");
    expect(android).toBe(approximateLocationHint("android"));
    expect(android).toContain("lokasi perkiraan, bukan posisi GPS");
    expect(android).toContain('Setelan → Aplikasi → browser Anda (misalnya Chrome) → Izin → Lokasi, lalu aktifkan "Gunakan lokasi akurat"');
    expect(android).toMatch(/Perbarui Lokasi GPS\.$/);
    expect(gpsHint(true, 1000, "ios")).toContain('Layanan Lokasi → Safari (atau Chrome), lalu aktifkan "Lokasi Persis"');
    expect(gpsHint(true, 5000, "other")).toContain("di pengaturan lokasi perangkat");
  });
});

describe("the finder's other messages", () => {
  it("names the distance nothing was found within", () => {
    expect(noMosquesMessage("25 km")).toBe(
      "Tidak ada masjid atau musholla yang tercatat dalam 25 km. Coba cari di Google Maps, atau laporkan yang Anda tahu di OpenStreetMap."
    );
  });

  it("labels a city's centre, and says when it isn't the user's position", () => {
    expect(cityCentreLabel("KOTA JAKARTA", true)).toBe("Sekitar pusat KOTA JAKARTA");
    expect(cityCentreLabel("KOTA JAKARTA", false)).toBe("Sekitar pusat KOTA JAKARTA, bukan lokasi Anda");
  });
});
