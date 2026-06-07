import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";
import Providers from "@/components/Providers";
import Nav from "@/components/Nav";
import LanguageToggle from "@/components/LanguageToggle";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Tbilisi Transit · Live arrivals",
  description:
    "Real-time bus arrivals, route maps, and journey planning for Tbilisi, Georgia.",
  applicationName: "Tbilisi Transit",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Tbilisi Transit",
    description: "Live bus arrivals for Tbilisi",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const locale = h.get("x-locale") === "ka" ? "ka" : "en";
  return (
    <html lang={locale} className="dark">
      <body
        className={`${inter.variable} ${mono.variable} min-h-dvh bg-bg font-sans text-fg antialiased`}
      >
        <Providers>
          <Nav />
          <div className="absolute right-4 top-3 z-50 sm:right-6">
            <LanguageToggle />
          </div>
          <main className="mx-auto max-w-7xl px-4 pb-32 pt-0 sm:px-6 sm:pb-16">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
