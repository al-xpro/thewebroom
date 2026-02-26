import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { ConvexClientProvider } from "@/components/web/ConvexClientProvider";
import { Toaster } from "sonner";

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Web Room",
  description: "A place where you can learn web development and be a part of a community.",
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
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </main>
          <Toaster closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
