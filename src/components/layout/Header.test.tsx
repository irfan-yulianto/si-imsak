import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import Header from "./Header";
import { useStore } from "@/store/useStore";

// Mock the child component LocationSearch
vi.mock("@/components/location/LocationSearch", () => ({
  default: () => <div data-testid="location-search-mock">Location Search</div>,
}));

// Mock useStore
vi.mock("@/store/useStore", () => ({
  useStore: vi.fn(),
}));

// The component only calls useStore(selector); type the mock for that use
const mockedUseStore = useStore as unknown as Mock<(selector: (state: unknown) => unknown) => unknown>;

describe("Header Component", () => {
  const mockSetTheme = vi.fn();

  const defaultStoreState = {
    isOffline: false,
    theme: "dark",
    setTheme: mockSetTheme,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation for useStore
    mockedUseStore.mockImplementation((selector) => selector(defaultStoreState));

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

  it("shows the app's tagline (the month is MonthNav's)", () => {
    render(<Header />);
    expect(screen.getByText("Jadwal sholat & imsakiyah")).toBeInTheDocument();
  });

  it("shows offline badge when isOffline is true", () => {
    mockedUseStore.mockImplementation((selector) => {
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
    mockedUseStore.mockImplementation((selector) => {
      const state = { ...defaultStoreState, theme: "light" };
      return selector(state);
    });

    render(<Header />);

    const themeButton = screen.getByRole("button", { name: "Aktifkan mode gelap" });
    fireEvent.click(themeButton);

    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });
});
