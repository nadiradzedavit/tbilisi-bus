import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const scriptSrc = isDev
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const CSP = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.basemaps.cartocdn.com https://server.arcgisonline.com",
  "font-src 'self' data:",
  "connect-src 'self' https://transit.ttc.com.ge https://overpass-api.de https://overpass.kumi.systems https://*.basemaps.cartocdn.com https://demotiles.maplibre.org https://server.arcgisonline.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.basemaps.cartocdn.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/((?!_next/static|__nextjs).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
