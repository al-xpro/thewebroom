import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ConvexClientProvider } from "@/components/web/ConvexClientProvider";
import RequireCompleteProfile from "@/components/web/RequireCompleteProfile";
import { Toaster } from "sonner";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Web Room",
  description: "A community for writing about web architecture, UI engineering, AI and productivity, with an AI assistant when you want one.",
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
              "The Web Room: a community for writing about web architecture, UI engineering, AI and productivity. Index for agents: /llms.txt. Every post as Markdown: /agents/posts/<slug>. Rules: /agents/rules. Write drafts for a member over MCP: /agents/mcp. RSS: /feed.xml.",
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
      </body>
    </html>
  );
}
