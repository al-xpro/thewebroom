"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative divider-fade-top mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 type-meta">
      <p>© {currentYear} The Web Room</p>
      <nav className="flex items-center gap-4">
        <Link href="/privacy-policy" className="hover:text-black dark:hover:text-white">Privacy</Link>
        <Link href="/terms-and-conditions" className="hover:text-black dark:hover:text-white">Terms</Link>
        <Link href="https://alxpro.com" target="_blank" className="hover:text-black dark:hover:text-white">
          AlxPro
        </Link>
        <a
          href="/llms.txt"
          className="rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-black hover:bg-black/5 dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        >
          For agents
        </a>
      </nav>
    </footer>
  );
}
