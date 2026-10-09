import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CountdownTimer from "./CountdownTimer";
import { useStore } from "@/store/useStore";
import { getSchedule } from "@/lib/api";
import type { ScheduleDay } from "@/types";

// Real store and real time maths; only the network is replaced
vi.mock("@/lib/api", () => ({ getSchedule: vi.fn() }));
vi.mock("@/lib/time", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/time")>()),
  syncServerTime: vi.fn(() => Promise.resolve(0)),
}));
vi.mock("@/lib/detect-location", () => ({ detectAndUpdateLocation: vi.fn() }));

const JAKARTA = { cityId: "jkt", cityName: "KOTA JAKARTA", province: "DKI JAKARTA", timezone: "WIB" as const };

function day(date: string, overrides: Partial<ScheduleDay> = {}): ScheduleDay {
  return {
    tanggal: date, date, imsak: "04:30", subuh: "04:40", terbit: "05:55", dhuha: "06:20",
    dzuhur: "12:05", ashar: "15:15", maghrib: "18:10", isya: "19:20", ...overrides,
  };
}

function monthResponse(jadwal: ScheduleDay[]) {
  return { status: true, data: { id: "jkt", lokasi: "KOTA JAKARTA", daerah: "DKI JAKARTA", jadwal } };
}

/** Let fake time pass, running timers and the promise callbacks they start */
async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

const FAILED_LOAD = { data: [], loading: false, error: "Gagal memuat jadwal. Coba lagi nanti." };

beforeEach(() => {
  // 15 March 2026, 12:00 WIB
  vi.useFakeTimers({ now: new Date("2026-03-15T05:00:00Z") });
  vi.mocked(getSchedule).mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  useStore.setState({
    location: JAKARTA,
    countdownSchedule: [],
    schedule: { data: [], loading: false, error: null },
    timeOffset: 0,
    todayDateStr: "",
    viewYear: 2026,
    viewMonth: 3,
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CountdownTimer recovery", () => {
  it("keeps retrying an empty countdown with growing pauses after the first load failed", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new TypeError("Failed to fetch"));
    useStore.setState({ schedule: FAILED_LOAD });

    render(<CountdownTimer />);
    await wait(0);
    // The failure is shown right away, and a retry starts
    expect(screen.getByText("Jadwal Tidak Tersedia")).toBeInTheDocument();
    expect(getSchedule).toHaveBeenCalledTimes(1);

    await wait(3_000);
    expect(getSchedule).toHaveBeenCalledTimes(2);
    await wait(9_000); // 12 s: the next attempt waits 10 s after the previous one
    expect(getSchedule).toHaveBeenCalledTimes(2);
    await wait(3_000); // 15 s
    expect(getSchedule).toHaveBeenCalledTimes(3);
    await wait(30_000); // 45 s
    expect(getSchedule).toHaveBeenCalledTimes(4);
    await wait(60_000); // 105 s — from now on once a minute
    expect(getSchedule).toHaveBeenCalledTimes(5);
    await wait(60_000);
    expect(getSchedule).toHaveBeenCalledTimes(6);
  });

  it("recovers on its own and repairs the table once the network is back", async () => {
    vi.mocked(getSchedule)
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue(monthResponse([day("2026-03-15")]));
    useStore.setState({ schedule: FAILED_LOAD });

    render(<CountdownTimer />);
    await wait(3_000);

    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();
    expect(screen.queryByText("Jadwal Tidak Tersedia")).not.toBeInTheDocument();
    expect(useStore.getState().schedule).toEqual({ data: [day("2026-03-15")], loading: false, error: null });
  });

  it("recovers when 'Coba Lagi' on the table loads the current month", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new TypeError("Failed to fetch"));
    useStore.setState({ schedule: FAILED_LOAD });
    render(<CountdownTimer />);
    await wait(0);
    expect(screen.getByText("Jadwal Tidak Tersedia")).toBeInTheDocument();

    vi.mocked(getSchedule).mockResolvedValue(monthResponse([day("2026-03-15")]));
    await act(() => useStore.getState().fetchScheduleForMonth(2026, 3));

    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();
  });

  it("tries again right away when the connection comes back", async () => {
    vi.mocked(getSchedule).mockRejectedValue(new TypeError("Failed to fetch"));
    useStore.setState({ schedule: FAILED_LOAD });
    render(<CountdownTimer />);
    await wait(3_000);
    expect(getSchedule).toHaveBeenCalledTimes(2);

    await wait(2_000); // the next attempt would only be due at 13 s
    expect(getSchedule).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    expect(getSchedule).toHaveBeenCalledTimes(3);
  });

  it("waits for the city's own load instead of requesting the same month twice", async () => {
    useStore.setState({ schedule: { data: [], loading: true, error: null } });
    render(<CountdownTimer />);
    await wait(9_000);
    expect(getSchedule).not.toHaveBeenCalled();
    expect(screen.getByText("Memuat Jadwal...")).toBeInTheDocument();
  });

  it("doesn't keep showing the previous city's countdown while a new city loads", async () => {
    useStore.setState({ countdownSchedule: [day("2026-03-15")] });
    render(<CountdownTimer />);
    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();

    act(() => {
      useStore.setState({
        location: { cityId: "bdg", cityName: "KOTA BANDUNG", province: "JAWA BARAT", timezone: "WIB" },
        countdownSchedule: [],
        schedule: { data: [], loading: true, error: null },
      });
    });

    expect(screen.queryByText("Menuju Waktu Dzuhur")).not.toBeInTheDocument();
    expect(screen.getByText("Memuat Jadwal...")).toBeInTheDocument();
  });
});

describe("CountdownTimer privacy", () => {
  it("keeps the city name out of Clarity recordings", () => {
    useStore.setState({ countdownSchedule: [day("2026-03-15")] });
    render(<CountdownTimer />);
    expect(screen.getByRole("button", { name: /KOTA JAKARTA/ })).toHaveAttribute("data-clarity-mask", "True");
  });
});

describe("CountdownTimer arrivals", () => {
  it("announces a time that arrives while the app is open", async () => {
    vi.setSystemTime(new Date("2026-03-15T05:04:58Z")); // 12:04:58 WIB
    useStore.setState({ countdownSchedule: [day("2026-03-15")] });
    render(<CountdownTimer />);
    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();

    await wait(3_000);
    expect(screen.getByText("Waktunya Dzuhur!")).toBeInTheDocument();
  });

  it("announces a time even when the 3 s check sees it pass before the 1 s tick does", async () => {
    // Mounted at 12:04:57.5: at 12:05:00.5 (Dzuhur) the check, created first, and the tick
    // are due together, and the check would otherwise move on to Ashar unannounced
    vi.setSystemTime(new Date("2026-03-15T05:04:57.500Z"));
    useStore.setState({ countdownSchedule: [day("2026-03-15")] });
    render(<CountdownTimer />);
    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();

    await wait(3_000);
    expect(screen.getByText("Waktunya Dzuhur!")).toBeInTheDocument();
  });

  it("doesn't announce a time that passed while the phone was asleep", async () => {
    vi.setSystemTime(new Date("2026-03-15T05:04:50Z")); // 12:04:50 WIB, Dzuhur in 10 s
    useStore.setState({ countdownSchedule: [day("2026-03-15")] });
    render(<CountdownTimer />);
    expect(screen.getByText("Menuju Waktu Dzuhur")).toBeInTheDocument();

    // Asleep for two hours: the clock jumps, no timer ran in between
    vi.setSystemTime(new Date("2026-03-15T07:04:50Z"));
    await wait(1_000);

    expect(screen.queryByText("Waktunya Dzuhur!")).not.toBeInTheDocument();
    expect(screen.getByText("Menuju Waktu Ashar")).toBeInTheDocument();
  });

  it("after Isya on the last day of a month, counts down to Imsak with next month's data", async () => {
    vi.setSystemTime(new Date("2026-03-31T12:21:00Z")); // 31 March, 19:21 WIB
    vi.mocked(getSchedule).mockImplementation(async (_id, _year, month) =>
      monthResponse(month === 3 ? [day("2026-03-31")] : [day("2026-04-01", { imsak: "04:29" })])
    );
    useStore.setState({ countdownSchedule: [day("2026-03-31")] });

    render(<CountdownTimer />);
    await wait(0);

    expect(getSchedule).toHaveBeenCalledWith("jkt", 2026, 4);
    expect(screen.getByText("Menuju Imsak Besok")).toBeInTheDocument();
    expect(screen.getByText("04:29 WIB")).toBeInTheDocument();
  });

  it("keeps today's date in the store current, also without schedule data", async () => {
    vi.setSystemTime(new Date("2026-03-15T16:59:58Z")); // 23:59:58 WIB
    useStore.setState({ schedule: { data: [], loading: true, error: null } });
    render(<CountdownTimer />);
    expect(useStore.getState().todayDateStr).toBe("2026-03-15");

    await wait(3_000);
    expect(useStore.getState().todayDateStr).toBe("2026-03-16");
  });
});
