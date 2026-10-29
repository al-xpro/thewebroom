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
  description: "A blog about building for the web: frontend, backend, design and the tools behind them.",
  category: "Blog",
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
