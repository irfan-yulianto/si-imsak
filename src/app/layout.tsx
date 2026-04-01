import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import "./globals.css";

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
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Si-Imsak — Jadwal Imsakiyah & Waktu Sholat",
    description:
      "Jadwal Imsakiyah real-time untuk seluruh kota di Indonesia.",
    images: ["/og-image.png"],
  },
  alternates: { canonical: "https://si-imsak.vercel.app" },
  applicationName: "Si-Imsak",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Si-Imsak",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#064E3B" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {CLARITY_ID && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window, document, "clarity", "script", "${CLARITY_ID}");`}
          </Script>
        )}
      </head>
      <body className={`${jakarta.variable} ${jetbrains.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(t!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`}
        </Script>
        <Script id="sw-register" strategy="afterInteractive">
          {`if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){})}`}
        </Script>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
