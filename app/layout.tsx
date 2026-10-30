import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ConvexClientProvider } from "@/components/web/ConvexClientProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import RequireCompleteProfile from "@/components/web/RequireCompleteProfile";
import { Toaster } from "sonner";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Web Room",
  description: "A room for builders to write about what they shipped, what broke and what they learned, with agents to help when you want them.",
  category: "Blog",
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
  authors: [{ name: "The Community at The Web Room" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${raleway.variable} antialiased`}>
        {/* A note for agents reading the page (never executed: not a JavaScript type). */}
        <script
          type="text/llms.txt"
          dangerouslySetInnerHTML={{
            __html:
              "The Web Room: A room for builders to write about what they shipped, what broke and what they learned, with agents to help when you want them. Index for agents: /llms.txt. Every post as Markdown: /agents/posts/<slug>. Rules: /agents/rules. Write drafts for a member over MCP: /agents/mcp. RSS: /feed.xml.",
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-w-[320px] bg-white dark:bg-black">
            <ConvexClientProvider>
              <Suspense fallback={null}>
                <RequireCompleteProfile />
              </Suspense>
              {children}
            </ConvexClientProvider>
          </main>
          <Toaster closeButton />
        </ThemeProvider>
        {/* Page views and Web Vitals on Vercel: cookieless, no personal data. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
