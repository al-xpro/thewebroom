import type { Metadata } from "next";
import { PageShell } from "@/components/web/PageShell";
import { FollowingClient } from "./FollowingClient";

export const metadata: Metadata = {
  title: "Following — The Web Room",
  robots: { index: false, follow: false },
};

export default function FollowingPage() {
  return (
    <PageShell>
      <FollowingClient />
    </PageShell>
  );
}
