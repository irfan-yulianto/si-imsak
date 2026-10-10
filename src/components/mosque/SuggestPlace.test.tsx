import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import SuggestPlace from "./SuggestPlace";

const fetchMock = vi.fn();
const onSent = vi.fn();
const onClose = vi.fn();
const props = { coords: { lat: -6.2, lng: 106.8 }, accuracy: 12, onSent, onClose };
const taken = (number: number) => ({ ok: true, status: 200, json: async () => ({ status: true, data: { number } }) });

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  onSent.mockReset();
  onClose.mockReset();
});

afterEach(cleanup);

describe("SuggestPlace", () => {
  it("sends the kind, the name and the street typed, and the position, then thanks with the issue's number", async () => {
    fetchMock.mockResolvedValue(taken(12));
    render(<SuggestPlace {...props} />);
    expect(screen.getByRole("region", { name: "Tambahkan masjid atau musholla di sini" })).toHaveTextContent("posisi Anda sekarang (±12 m)");
    expect(screen.getByRole("radio", { name: "Musholla" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Masjid" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Nama" }), { target: { value: " Nurul Iman " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Jalan (opsional)" }), { target: { value: "Gang Uji" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Usulan" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Usulan #12 diterima"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/mosques/suggest");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body)).toEqual({ kind: "masjid", name: "Nurul Iman", street: "Gang Uji", lat: -6.2, lng: 106.8, accuracy: 12 });
    expect(onSent).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("asks for the name before sending anything", () => {
    render(<SuggestPlace {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim Usulan" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Tulis nama masjid atau musholla-nya dulu.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows the server's own reason, and keeps the form for another try", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ status: false, error: "Sudah tercatat: Masjid Uji. Bila datanya keliru, laporkan di OpenStreetMap." }) });
    render(<SuggestPlace {...props} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nama" }), { target: { value: "Uji" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Usulan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Sudah tercatat: Masjid Uji."));
    expect(screen.getByRole("textbox", { name: "Nama" })).toHaveValue("Uji");
    expect(onSent).not.toHaveBeenCalled();
  });

  it("explains a refusal without a reason, and a server that can't be reached", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) });
    render(<SuggestPlace {...props} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Nama" }), { target: { value: "Uji" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim Usulan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."));

    fetchMock.mockRejectedValue(new Error("Network Error"));
    fireEvent.click(screen.getByRole("button", { name: "Kirim Usulan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Gagal terhubung ke server. Periksa koneksi internet dan coba lagi."));
  });

  it("can be put away", () => {
    render(<SuggestPlace {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
