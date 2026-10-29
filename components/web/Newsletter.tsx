"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PlaceholdersAndVanishInput } from "../ui/placeholder-vanish-input";

export default function Newsletter() {
  const subscribe = useMutation(api.newsletter.subscribe);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  return (
    <section className="relative divider-fade-top py-10 space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor="newsletter-email" className="type-label">Newsletter</label>
        <p className="type-meta">New posts, now and then.</p>
      </div>
      <PlaceholdersAndVanishInput
        placeholder="Email"
        className="w-full"
        id="newsletter-email"
        onSubmit={(email) => {
          subscribe({ email })
            .then(() => setStatus("done"))
            .catch(() => setStatus("error"));
        }}
      />
      <p aria-live="polite" className="type-meta min-h-5">
        {status === "done" && "Got it. You're on the list."}
        {status === "error" && <span className="text-destructive">Check the address and try again.</span>}
      </p>
    </section>
  );
}
