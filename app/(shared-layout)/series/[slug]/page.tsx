import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/web/PageShell";
import { SeriesClient } from "./SeriesClient";

export const metadata: Metadata = {
  title: "Series — The Web Room",
};

async function Series({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SeriesClient slug={slug} />;
}

export default function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={null}>
        <Series params={params} />
      </Suspense>
    </PageShell>
  );
}
