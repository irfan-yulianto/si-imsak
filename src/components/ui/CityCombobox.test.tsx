import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import CityCombobox from "./CityCombobox";

const CITIES = ["KOTA BANDUNG", "KAB. BANDUNG", "KAB. BANDUNG BARAT"];

function Harness({ onSelect = vi.fn(), isSearching = false, cities = CITIES }: {
  onSelect?: (c: string) => void;
  isSearching?: boolean;
  cities?: string[];
}) {
  const [query, setQuery] = useState("");
  const results = query.length >= 2 ? cities.filter((c) => c.includes(query.toUpperCase())) : [];
  return (
    <CityCombobox
      label="Cari kota"
      placeholder="Cari kota..."
      query={query}
      onQueryChange={setQuery}
      results={results}
      getKey={(c) => c}
      getLabel={(c) => c}
      onSelect={onSelect}
      isSearching={isSearching}
    />
  );
}

describe("CityCombobox", () => {
  it("exposes combobox semantics", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox", { name: "Cari kota" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input.getAttribute("aria-controls")).toBeTruthy();
  });

  it("opens the listbox and announces the result count while typing", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "band" } });
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("status")).toHaveTextContent("3 kota ditemukan");
  });

  it("moves the highlight with the arrow keys and selects with Enter", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "band" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" }); // stays on the last option
    fireEvent.keyDown(input, { key: "ArrowUp" });
    const active = screen.getByRole("option", { name: "KAB. BANDUNG" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", active.id);

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith("KAB. BANDUNG");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("selects with a click", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "band" } });
    fireEvent.click(screen.getByRole("option", { name: "KOTA BANDUNG" }));
    expect(onSelect).toHaveBeenCalledWith("KOTA BANDUNG");
  });

  it("shows and announces an empty state once the search has settled", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "xyz" } });
    expect(screen.getByRole("listbox")).toHaveTextContent("Kota tidak ditemukan");
    expect(screen.getByRole("status")).toHaveTextContent("Kota tidak ditemukan");
  });

  it("does not claim 'not found' while still searching", () => {
    render(<Harness isSearching />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "xyz" } });
    expect(screen.queryByText("Kota tidak ditemukan.")).not.toBeInTheDocument();
  });

  it("closes on Escape keeping the text and focus, then clears on a second Escape", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    input.focus();
    fireEvent.change(input, { target: { value: "band" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("band");
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
  });

  it("clear button empties the query and returns focus to the input", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "band" } });
    fireEvent.click(screen.getByRole("button", { name: "Bersihkan pencarian" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });
});
