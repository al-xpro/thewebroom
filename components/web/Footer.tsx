"use client";

import { useEffect, useState } from "react";

export default function Footer() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer>
      <div className="flex w-full h-full items-center justify-center py-4 border-t">
          <p className="text-left text-sm leading-normal text-[#666666] dark:text-[#A0A0A0]">
            © {currentYear} The Web Room. All rights reserved.
          </p>
      </div>
    </footer>
  );
}
