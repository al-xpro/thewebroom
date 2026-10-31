import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// How far the reader is through the page (0–1), and where its headings sit on that scale.
export function useReadingProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState({ pathname, completion: 0, headings: [] as number[] });

  useEffect(() => {
    const updateMetrics = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;

      // Each heading's top, mapped to where the scroll thumb would be with that heading at
      // the top of the viewport.
      const elements = Array.from(document.querySelectorAll("article h1, article h2, article h3"));
      const headings = elements.map((el) => {
        const absoluteTop = el.getBoundingClientRect().top + window.scrollY;
        return Math.min(Math.max(absoluteTop / scrollableHeight, 0), 1);
      });

      setProgress((prev) => {
        const fresh = prev.pathname !== pathname;
        const completion = scrollableHeight > 0 ? window.scrollY / scrollableHeight : fresh ? 0 : prev.completion;
        const sameHeadings =
          !fresh &&
          prev.headings.length === headings.length &&
          prev.headings.every((val, i) => Math.abs(val - headings[i]) < 0.001);
        if (!fresh && sameHeadings && completion === prev.completion) return prev;
        return { pathname, completion, headings: sameHeadings ? prev.headings : headings };
      });
    };

    // Content that loads later (images) changes the page's height: observe the body too.
    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(document.body);
    window.addEventListener("scroll", updateMetrics);
    window.addEventListener("resize", updateMetrics);

    return () => {
      window.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
      resizeObserver.disconnect();
    };
  }, [pathname]);

  // A new page starts at the top, before its first measurement arrives.
  if (progress.pathname !== pathname) return { completion: 0, headings: [] as number[] };
  return progress;
}
