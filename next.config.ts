import type { NextConfig } from "next";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
// WebSocket and HTTP connections to Convex (.convex.cloud = HTTP/WS, .convex.site = HTTP actions)
const convexOrigins = CONVEX_URL
  ? [
      CONVEX_URL,
      CONVEX_URL.replace("https://", "wss://"),
      CONVEX_URL.replace(".convex.cloud", ".convex.site"),
    ].join(" ")
  : "";

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
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
      `style-src 'self' 'unsafe-inline'`,
      `img-src 'self' https: data: blob:`,
      `font-src 'self' https:`,
      // Convex WebSocket + HTTP actions + avatar service
      `connect-src 'self' ${convexOrigins} https://avatar.vercel.sh https://api.ipify.org`,
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
        hostname: "images.unsplash.com",
        protocol: "https",
        port: "",
      },
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
    ],
  },
};

export default nextConfig;
