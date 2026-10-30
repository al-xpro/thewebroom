import type { Metadata } from "next";
import { PageShell } from "@/components/web/PageShell";
import { ReadingListClient } from "./ReadingListClient";

export const metadata: Metadata = {
  title: "Reading list — The Web Room",
  robots: { index: false, follow: false },
};

export default function ReadingListPage() {
  return (
    <PageShell>
      <ReadingListClient />
    </PageShell>
  );
}
