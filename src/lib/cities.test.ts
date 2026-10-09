import { describe, it, expect } from "vitest";
import { findCityCoords, getCityGuess } from "./cities";

describe("getCityGuess", () => {
  it("returns KOTA JAKARTA for Jakarta coordinates", () => {
    expect(getCityGuess(-6.17, 106.85)).toBe("KOTA JAKARTA");
  });

  it("returns KOTA SURABAYA for Surabaya coordinates", () => {
    expect(getCityGuess(-7.25, 112.75)).toBe("KOTA SURABAYA");
  });

  it("returns KOTA BANDA ACEH for northwestern Indonesia", () => {
    expect(getCityGuess(5.55, 95.32)).toBe("KOTA BANDA ACEH");
  });

  it("returns KAB. MERAUKE for southeastern Papua", () => {
    expect(getCityGuess(-8.50, 140.40)).toBe("KAB. MERAUKE");
  });

  it("returns closest city for coordinates near Jakarta", () => {
    // Slightly offset from Jakarta center
    expect(getCityGuess(-6.18, 106.84)).toBe("KOTA JAKARTA");
  });

  it("returns KOTA DENPASAR for Bali coordinates", () => {
    expect(getCityGuess(-8.65, 115.22)).toBe("KOTA DENPASAR");
  });

  it("never returns null", () => {
    // Even for extreme coordinates, it should return the closest city
    const result = getCityGuess(0, 110);
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("returns correct city for Pontianak (near equator)", () => {
    expect(getCityGuess(-0.02, 109.34)).toBe("KOTA PONTIANAK");
  });

  // Known centroid limitations — reverse geocoding (Nominatim) resolves these
  it("returns KAB. LAMONGAN for Benjeng, Gresik (known centroid limitation)", () => {
    // Benjeng is in KAB. GRESIK but closer to Lamongan centroid
    expect(getCityGuess(-7.25, 112.43)).toBe("KAB. LAMONGAN");
  });

  it("returns KAB. BEKASI for Pekayon, Kota Bekasi (known centroid limitation)", () => {
    // Pekayon is in KOTA BEKASI but centroids are only 1.6km apart
    expect(getCityGuess(-6.27, 106.98)).toBe("KAB. BEKASI");
  });
});

describe("findCityCoords", () => {
  it("finds a city by its MyQuran name", () => {
    expect(findCityCoords("KOTA JAKARTA")).toEqual({ lat: -6.17, lng: 106.85 });
  });

  it("tells a city from the regency of the same name", () => {
    const city = findCityCoords("KOTA BOGOR");
    const regency = findCityCoords("KAB. BOGOR");
    expect(city).not.toBeNull();
    expect(regency).not.toBeNull();
    expect(city).not.toEqual(regency);
  });

  it("still finds a city written differently upstream", () => {
    expect(findCityCoords("Kabupaten Bogor")).toEqual(findCityCoords("KAB. BOGOR"));
    expect(findCityCoords("Kota Adm. Jakarta Pusat")).toEqual(findCityCoords("KOTA JAKARTA"));
    // Without a kind: the city
    expect(findCityCoords("BOGOR")).toEqual(findCityCoords("KOTA BOGOR"));
  });

  it("gives up on a name it doesn't know", () => {
    expect(findCityCoords("ATLANTIS")).toBeNull();
    expect(findCityCoords("")).toBeNull();
  });
});
