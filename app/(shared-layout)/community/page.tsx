import type { Metadata } from "next";
import { PageShell } from "@/components/web/PageShell";
import { CommunityClient } from "./CommunityClient";

export const metadata: Metadata = {
  title: "Community — The Web Room",
  description: "Who writes on The Web Room, and what's happening lately.",
};

export default function CommunityPage() {
  return (
    <PageShell>
      <CommunityClient />
    </PageShell>
  );
}
