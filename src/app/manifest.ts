import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
    short_name: "Si-Imsak",
    description:
      "Jadwal Imsakiyah dan waktu sholat untuk seluruh kota di Indonesia",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    // The default (dark) theme's background, as the page sets theme-color to
    background_color: "#0A0E13",
    theme_color: "#0A0E13",
    categories: ["lifestyle", "education"],
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcuts: [
      {
        name: "Jadwal Sholat",
        short_name: "Jadwal",
        url: "/",
        icons: [
          {
            src: "/icons/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
