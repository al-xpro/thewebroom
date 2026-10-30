import type { Metadata } from "next";
import { PageShell } from "@/components/web/PageShell";
import { NotificationsClient } from "./NotificationsClient";

export const metadata: Metadata = {
  title: "Notifications — The Web Room",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <PageShell>
      <NotificationsClient />
    </PageShell>
  );
}
