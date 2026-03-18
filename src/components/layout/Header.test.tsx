import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Header from "./Header";
import { useStore } from "@/store/useStore";

// Mock the child component LocationSearch
vi.mock("@/components/location/LocationSearch", () => ({
  default: () => <div data-testid="location-search-mock">Location Search</div>,
}));

// Mock the getHijriMonthsForGregorianMonth function
const mockGetHijriMonths = vi.fn(() => [
  { monthName: "Ramadan", year: 1445 },
  { monthName: "Syawal", year: 1445 },
]);

vi.mock("@/lib/hijri", () => ({
  getHijriMonthsForGregorianMonth: (...args: any[]) => mockGetHijriMonths(...args),
}));

// Mock useStore
vi.mock("@/store/useStore", () => ({
  useStore: vi.fn(),
}));

describe("Header Component", () => {
  const mockSetTheme = vi.fn();

  const defaultStoreState = {
    isOffline: false,
    theme: "dark",
    setTheme: mockSetTheme,
    viewMonth: 3, // March
    viewYear: 2024,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for useStore
    vi.mocked(useStore).mockImplementation((selector) => {
      if (typeof selector === "function") {
        return selector(defaultStoreState);
      }
      return defaultStoreState;
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly with default state", () => {
    render(<Header />);
    expect(screen.getByText("Si-Imsak")).toBeInTheDocument();
    expect(screen.getByTestId("location-search-mock")).toBeInTheDocument();
  });

  it("loads theme from localStorage if available", () => {
    // Mock localStorage to return "light" theme
    window.localStorage.getItem = vi.fn().mockReturnValue("light");

    render(<Header />);

    expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("defaults to 'dark' theme if localStorage is empty", () => {
    window.localStorage.getItem = vi.fn().mockReturnValue(null);

    render(<Header />);

    expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("defaults to 'dark' theme if localStorage throws an error", () => {
    window.localStorage.getItem = vi.fn().mockImplementation(() => {
      throw new Error("Access denied");
    });

    render(<Header />);

    expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("displays hijri subtitle based on viewMonth and viewYear", () => {
    render(<Header />);

    expect(mockGetHijriMonths).toHaveBeenCalledWith(2024, 3);

    // Check for the expected string format from our mock: "Ramadan – Syawal 1445H"
    expect(screen.getByText("Ramadan – Syawal 1445H / 2024")).toBeInTheDocument();
  });

  it("displays single hijri month correctly without dash", () => {
    mockGetHijriMonths.mockReturnValueOnce([
      { monthName: "Ramadan", year: 1445 },
    ]);

    render(<Header />);

    expect(screen.getByText("Ramadan 1445H / 2024")).toBeInTheDocument();
  });

  it("shows offline badge when isOffline is true", () => {
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = { ...defaultStoreState, isOffline: true };
      return selector(state);
    });

    render(<Header />);

    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("does not show offline badge when isOffline is false", () => {
    render(<Header />);

    expect(screen.queryByText("Offline")).not.toBeInTheDocument();
  });

  it("toggles theme from dark to light", () => {
    render(<Header />);

    const themeButton = screen.getByRole("button", { name: "Aktifkan mode terang" });
    fireEvent.click(themeButton);

    expect(mockSetTheme).toHaveBeenCalledWith("light");
  });

  it("toggles theme from light to dark", () => {
    vi.mocked(useStore).mockImplementation((selector: any) => {
      const state = { ...defaultStoreState, theme: "light" };
      return selector(state);
    });

    render(<Header />);

    const themeButton = screen.getByRole("button", { name: "Aktifkan mode gelap" });
    fireEvent.click(themeButton);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
