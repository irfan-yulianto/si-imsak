import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LocationSearch from "./LocationSearch";

// Mock dependencies
vi.mock("@/lib/api", () => ({
  searchCities: vi.fn(),
  getSchedule: vi.fn().mockResolvedValue({ status: true, data: { jadwal: [], daerah: "DKI JAKARTA" } })
}));

vi.mock("@/lib/detect-location", () => ({
  detectAndUpdateLocation: vi.fn()
}));

vi.mock("@/lib/timezone", () => ({
  getTimezone: vi.fn().mockReturnValue("WIB")
}));

// Mock Zustand store simply to bypass default state logic
// We just need to ensure the component renders and we can verify its localStorage interactions
vi.mock("@/store/useStore", () => ({
  useStore: vi.fn((selector) => {
    const mockStore = {
      location: {
        cityId: "12345",
        cityName: "KOTA JAKARTA",
        province: "DKI JAKARTA"
      },
      setLocation: vi.fn(),
      setSchedule: vi.fn(),
      setScheduleLoading: vi.fn(),
      setScheduleError: vi.fn(),
      setViewMonth: vi.fn(),
      setCountdownSchedule: vi.fn(),
      setIsOffline: vi.fn()
    };
    return selector(mockStore);
  })
}));

import type { MockInstance } from "vitest";

describe("LocationSearch", () => {
  let getItemSpy: MockInstance;
  let removeItemSpy: MockInstance;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, "getItem");
    removeItemSpy = vi.spyOn(Storage.prototype, "removeItem");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to default location on parse error", () => {
    // Return invalid JSON when retrieving "selectedLocation"
    getItemSpy.mockImplementation((key: string) => {
      if (key === "selectedLocation") {
        return "{invalid-json";
      }
      return null;
    });

    render(<LocationSearch />);

    // Expect the fallback mechanism to attempt to remove the invalid entry
    expect(removeItemSpy).toHaveBeenCalledWith("selectedLocation");
  });
});
