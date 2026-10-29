"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer>
      <div className="flex flex-col gap-3 sm:gap-2 w-full h-full py-4 relative divider-fade-top mb-8">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 sm:gap-x-4 gap-y-2 text-sm text-[#666666] dark:text-[#A0A0A0]">
          <Link href="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link href="/terms-and-conditions" className="text-primary hover:underline">
            Terms & Conditions
          </Link>
          <a
            href="mailto:alxpro.dev@gmail.com?subject=Re: The Web Room"
            className="text-primary hover:underline"
          >
            Contact Support 
          </a>
        </div>
        <div className="flex flex-col sm:flex-row w-full items-center sm:justify-between gap-2">
          <p className="text-left text-sm leading-normal text-[#666666] dark:text-[#A0A0A0]">
            © {currentYear} The Web Room. All rights reserved.
          </p>
          <p className="text-left text-sm leading-normal text-[#666666] dark:text-[#A0A0A0]">
            Designed and Developed by&nbsp;
            <Link
              href="https://alxpro.com"
              target="_blank"
              className="text-primary hover:underline"
            >
              AlxPro
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
