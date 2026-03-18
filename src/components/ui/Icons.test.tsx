import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ImsakIcon,
  SubuhIcon,
  TerbitIcon,
  DhuhaIcon,
  DzuhurIcon,
  AsharIcon,
  MaghribIcon,
  IsyaIcon,
  MosqueIcon,
  CrescentIcon,
  CopyIcon,
  MapPinIcon,
  SearchIcon,
  CalendarIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshIcon,
  PRAYER_ICON_MAP,
} from "./Icons";

const ICONS = [
  { name: "ImsakIcon", Component: ImsakIcon },
  { name: "SubuhIcon", Component: SubuhIcon },
  { name: "TerbitIcon", Component: TerbitIcon },
  { name: "DhuhaIcon", Component: DhuhaIcon },
  { name: "DzuhurIcon", Component: DzuhurIcon },
  { name: "AsharIcon", Component: AsharIcon },
  { name: "MaghribIcon", Component: MaghribIcon },
  { name: "IsyaIcon", Component: IsyaIcon },
  { name: "MosqueIcon", Component: MosqueIcon },
  { name: "CrescentIcon", Component: CrescentIcon },
  { name: "CopyIcon", Component: CopyIcon },
  { name: "MapPinIcon", Component: MapPinIcon },
  { name: "SearchIcon", Component: SearchIcon },
  { name: "CalendarIcon", Component: CalendarIcon },
  { name: "SunIcon", Component: SunIcon },
  { name: "MoonIcon", Component: MoonIcon },
  { name: "ChevronLeftIcon", Component: ChevronLeftIcon },
  { name: "ChevronRightIcon", Component: ChevronRightIcon },
  { name: "RefreshIcon", Component: RefreshIcon },
];

describe("Icons", () => {
  it.each(ICONS)("$name renders without crashing", ({ Component }) => {
    const { container } = render(<Component />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it.each(ICONS)("$name applies default size of 24", ({ Component }) => {
    const { container } = render(<Component />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "24");
    expect(svg).toHaveAttribute("height", "24");
  });

  it.each(ICONS)("$name applies custom size", ({ Component }) => {
    const { container } = render(<Component size={32} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "32");
    expect(svg).toHaveAttribute("height", "32");
  });

  it.each(ICONS)("$name passes extra props", ({ Component }) => {
    const { container } = render(<Component className="text-red-500" data-testid="custom-icon" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("text-red-500");
    expect(svg).toHaveAttribute("data-testid", "custom-icon");
  });

  describe("PRAYER_ICON_MAP", () => {
    it("contains all prayer times", () => {
      expect(Object.keys(PRAYER_ICON_MAP)).toEqual([
        "imsak",
        "subuh",
        "terbit",
        "dhuha",
        "dzuhur",
        "ashar",
        "maghrib",
        "isya",
      ]);
    });

    it("maps correctly to icon components", () => {
      expect(PRAYER_ICON_MAP.imsak).toBe(ImsakIcon);
      expect(PRAYER_ICON_MAP.subuh).toBe(SubuhIcon);
      expect(PRAYER_ICON_MAP.terbit).toBe(TerbitIcon);
      expect(PRAYER_ICON_MAP.dhuha).toBe(DhuhaIcon);
      expect(PRAYER_ICON_MAP.dzuhur).toBe(DzuhurIcon);
      expect(PRAYER_ICON_MAP.ashar).toBe(AsharIcon);
      expect(PRAYER_ICON_MAP.maghrib).toBe(MaghribIcon);
      expect(PRAYER_ICON_MAP.isya).toBe(IsyaIcon);
    });
  });
});
