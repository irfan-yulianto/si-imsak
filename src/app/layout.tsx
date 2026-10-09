import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://si-imsak.vercel.app"),
  title: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
  description:
    "Jadwal Imsakiyah dan waktu sholat real-time untuk seluruh kota di Indonesia. Countdown waktu sholat dan pencari masjid terdekat.",
  keywords: [
    "jadwal imsakiyah",
    "jadwal sholat",
    "waktu sholat",
    "imsakiyah",
    "jadwal imsak",
    "waktu imsak",
    "jadwal sholat indonesia",
    "ramadan 2026",
    "ramadan 1447H",
  ],
  openGraph: {
    title: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
    description:
      "Jadwal Imsakiyah dan waktu sholat real-time untuk seluruh kota di Indonesia. Countdown dan pencari masjid terdekat.",
    type: "website",
    url: "https://si-imsak.vercel.app",
    // The image comes from app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
    description:
      "Jadwal Imsakiyah real-time untuk seluruh kota di Indonesia.",
  },
  alternates: { canonical: "https://si-imsak.vercel.app" },
  applicationName: "Si-Imsak",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Si-Imsak",
  },
};

// Microsoft Clarity project ID — set NEXT_PUBLIC_CLARITY_ID in .env.local
// Falls back to empty string (no-op) if not configured
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The font variables live on <html>: --font-sans is resolved on :root, where a
    // variable defined only on <body> would be missing
    <html lang="id" className={`${jakarta.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        {/* Set to the saved theme's background by the script below, before the first paint */}
        <meta name="theme-color" content={THEME_COLORS.dark} />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {CLARITY_ID && (
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
      </head>
      <body className="antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
