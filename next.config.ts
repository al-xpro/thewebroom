import type { NextConfig } from "next";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
// Derive WebSocket and HTTP actions URLs from the base Convex URL
const convexOrigins = CONVEX_URL
  ? [
      CONVEX_URL,
      CONVEX_URL.replace("https://", "wss://"),
      CONVEX_URL.replace(".convex.cloud", ".convex.site"),
      // Also allow the broader *.convex.cloud and *.convex.site for WebSocket upgrades
      "https://*.convex.cloud",
      "wss://*.convex.cloud",
      "https://*.convex.site",
    ].join(" ")
  : "https://*.convex.cloud wss://*.convex.cloud https://*.convex.site";

const securityHeaders = [
  // Force HTTPS for 1 year, include subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Prevent clickjacking
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Limit referrer leaking
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions policy — disable unused browser APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Content Security Policy
  // unsafe-inline is required for Next.js inline styles and TipTap
  // unsafe-eval is required for Shiki syntax highlighting (uses new Function())
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com`,
      `script-src-elem 'self' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com`,

      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com`,

      `font-src 'self' https:`,

      `img-src 'self' https: data: blob:`,

      // Sentry's ingest (error tracking) and Vercel's analytics scripts in development.
      `connect-src 'self' ${convexOrigins} https://avatar.vercel.sh https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://va.vercel-scripts.com`,

      `frame-src https://vercel.live`,
      `frame-ancestors 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        hostname: "grateful-mosquito-699.convex.cloud",
        protocol: "https",
        port: "",
      },
      {
        hostname: "dusty-narwhal-48.convex.cloud",
        protocol: "https",
        port: "",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
};

export default nextConfig;
