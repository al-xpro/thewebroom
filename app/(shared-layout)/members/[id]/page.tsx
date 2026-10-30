import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/web/PageShell";
import { MemberClient } from "./MemberClient";

export const metadata: Metadata = {
  title: "Member — The Web Room",
};

async function Member({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberClient userId={id} />;
}

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PageShell>
      <Suspense fallback={null}>
        <Member params={params} />
      </Suspense>
    </PageShell>
  );
}
