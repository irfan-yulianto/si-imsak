import { ImageResponse } from "next/og";

export const alt = "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat untuk seluruh kota di Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Link preview image (WhatsApp, Telegram, X…). Rendered once at build time.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 80px",
          background: "linear-gradient(135deg, #064E3B 0%, #065F46 55%, #115E59 100%)",
          color: "#FFFFFF",
        }}
      >
        {/* The app icon's crescent (CrescentIcon) */}
        <svg width="200" height="200" viewBox="0 0 24 24" fill="#FFFFFF">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 0 1 0-16c-3 2-5 5-5 8s2 6 5 8z" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 104, letterSpacing: -2 }}>Si-Imsak</div>
          <div style={{ fontSize: 44, marginTop: 8, color: "#D1FAE5" }}>
            Jadwal Imsakiyah & Waktu Sholat
          </div>
          <div style={{ fontSize: 28, marginTop: 36, color: "#FCD34D" }}>
            Hitung mundur waktu sholat · seluruh kota di Indonesia
          </div>
        </div>
      </div>
    ),
    size
  );
}
