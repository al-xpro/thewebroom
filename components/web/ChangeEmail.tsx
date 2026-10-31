"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showErrorToast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

// Changing the e-mail (#96): a link goes to the new address, and the address changes when
// it's opened. Only for accounts with a password (GitHub-only accounts use GitHub's).
export function ChangeEmail({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const send = async () => {
    const address = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      showErrorToast("Enter a valid address");
      return;
    }
    if (address === currentEmail.toLowerCase()) {
      showErrorToast("That's already your address");
      return;
    }
    setPending(true);
    const { error } = await authClient.changeEmail({ newEmail: address, callbackURL: "/profile" });
    setPending(false);
    if (error) {
      showErrorToast(error.message ?? "Couldn't send the link");
      return;
    }
    setSentTo(address);
    setEditing(false);
    setNewEmail("");
  };

  if (sentTo) {
    return (
      <p className="type-meta text-xs">
        We sent a link to <span className="text-black dark:text-white">{sentTo}</span>. Your address changes when you open
        it; until then you keep using this one.
      </p>
    );
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="type-meta cursor-pointer text-xs underline underline-offset-4 hover:text-black dark:hover:text-white">
        Change address
      </button>
    );
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <Input
        type="email"
        autoComplete="email"
        autoFocus
        value={newEmail}
        onChange={(event) => setNewEmail(event.target.value)}
        placeholder="New address"
        aria-label="New e-mail address"
        className="input-underline flex-1"
      />
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={pending || !newEmail.trim()}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        Send link
      </Button>
    </form>
  );
}
