"use client";

import { useState } from "react";
import { useConvex } from "convex/react";
import { Download, Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { showErrorToast } from "@/components/ui/toast";

// Everything the platform holds about you, as a JSON file (#20: data portability).
export function DownloadMyData() {
  const convex = useConvex();
  const [pending, setPending] = useState(false);

  const download = async () => {
    setPending(true);
    try {
      const data = await convex.query(api.account.exportMyData, {});
      if (!data) throw new Error("Sign in first");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `the-web-room-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showErrorToast("Couldn't prepare your data");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void download()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      Download my data
    </Button>
  );
}
