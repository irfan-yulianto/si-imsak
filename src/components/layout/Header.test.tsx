import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Header from "./Header";
import { useStore } from "@/store/useStore";

// Mock the components to avoid rendering complexities
vi.mock("@/components/location/LocationSearch", () => ({
  default: () => <div data-testid="location-search" />,
}));
vi.mock("@/components/ui/Icons", () => ({
  CrescentIcon: () => <div data-testid="crescent-icon" />,
  SunIcon: () => <div data-testid="sun-icon" />,
  MoonIcon: () => <div data-testid="moon-icon" />,
}));

describe("Header", () => {
  let mockSetTheme: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetTheme = vi.fn();

    // Reset store state before each test
    useStore.setState({
      isOffline: false,
      theme: "light",
      setTheme: mockSetTheme,
      viewMonth: 3,
      viewYear: 2024,
    });

    // Clear localStorage
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should apply saved theme from localStorage", () => {
    localStorage.setItem("theme", "light");

    render(<Header />);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("should apply default dark theme if no theme in localStorage", () => {
    render(<Header />);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("should handle localStorage error gracefully and fallback to dark theme", () => {
    // Spy on Storage.prototype.getItem to throw an error
    const spy = vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("Access denied");
    });
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<Header />);

    expect(spy).toHaveBeenCalledWith("theme");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    expect(consoleWarnSpy).toHaveBeenCalledWith("Failed to access localStorage", expect.any(Error));
  });
});
