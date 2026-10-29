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
      <nav className="flex gap-4">
        <Link href="/privacy-policy" className="hover:text-black dark:hover:text-white">Privacy</Link>
        <Link href="/terms-and-conditions" className="hover:text-black dark:hover:text-white">Terms</Link>
        <a href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room" className="hover:text-black dark:hover:text-white">
          Contact
        </a>
        <Link href="https://alxpro.com" target="_blank" className="hover:text-black dark:hover:text-white">
          AlxPro
        </Link>
      </nav>
    </footer>
  );
}
