import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
    short_name: "Si-Imsak",
    description:
      "Jadwal Imsakiyah dan waktu sholat untuk seluruh kota di Indonesia",
    lang: "id",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Phones turned sideways, tablets and desktop windows all have a layout
    orientation: "any",
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
    // The install dialog shows these; scripts/pwa-screenshots.mjs takes them
    screenshots: [
      {
        src: "/screenshots/narrow.png",
        sizes: "780x1688",
        type: "image/png",
        form_factor: "narrow",
        label: "Hitung mundur ke waktu sholat berikutnya dan jadwal hari ini",
      },
      {
        src: "/screenshots/wide.png",
        sizes: "1280x800",
        type: "image/png",
        form_factor: "wide",
        label: "Hitung mundur, jadwal hari ini dan jadwal sebulan",
      },
    ],
    // The schedule is the start page; a shortcut to it would only repeat start_url
    shortcuts: [
      {
        name: "Masjid Terdekat",
        short_name: "Masjid",
        description: "Cari masjid di sekitar Anda",
        url: "/?tab=masjid",
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
