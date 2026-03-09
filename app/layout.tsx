import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DevServiceWorkerReset } from "@/components/pwa/DevServiceWorkerReset";

export const metadata: Metadata = {
  title: "Drinking Diary",
  description: "Track your drinking, understand your habits",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png" },
      { url: "/icons/icon-512.png", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Drinking Diary",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="safe-area-padding">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="min-h-screen min-h-[100dvh] bg-slate-900 text-slate-100 antialiased">
        <DevServiceWorkerReset />
        {children}
      </body>
    </html>
  );
}
