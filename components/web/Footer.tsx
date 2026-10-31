"use client";

import Link from "next/link";
import { ForAgentsButton } from "@/components/web/ForAgentsButton";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative divider-fade-top mb-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 type-meta">
      <p>© {currentYear} The Web Room</p>
      <nav className="flex items-center gap-4">
        <Link href="/privacy-policy" className="hover:text-black dark:hover:text-white">Privacy</Link>
        <Link href="/terms-and-conditions" className="hover:text-black dark:hover:text-white">Terms</Link>
        <Link href="/rules" className="hover:text-black dark:hover:text-white">Rules</Link>
        <Link href="https://alxpro.com" target="_blank" className="hover:text-black dark:hover:text-white">
          AlxPro
        </Link>
        <ForAgentsButton />
      </nav>
    </footer>
  );
}
