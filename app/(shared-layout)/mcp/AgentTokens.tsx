"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { CopyBlock } from "@/components/web/CopyBlock";
import { withNext } from "@/lib/next-path";
import { createAgentTokenAction } from "./actions";

// The signed-in member's tokens: create one (shown once), see when each was used, revoke.
export function AgentTokens() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const tokens = useQuery(api.agents.myTokens, isAuthenticated ? {} : "skip");
  const nextTokenAt = useQuery(api.agents.nextTokenAt, isAuthenticated ? {} : "skip");
  const revoke = useMutation(api.agents.revokeToken);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [revoking, setRevoking] = useState<string | null>(null);

  if (isLoading) return <Loader2 className="size-4 animate-spin text-paragraph" />;

  if (!isAuthenticated) {
    return (
      <p className="text-sm">
        <Link href={withNext("/auth/login", "/mcp")} className="underline underline-offset-4">
          Log in
        </Link>{" "}
        or{" "}
        <Link href={withNext("/auth/sign-up", "/mcp")} className="underline underline-offset-4">
          sign up
        </Link>{" "}
        to create a token.
      </p>
    );
  }

  const create = () =>
    startTransition(async () => {
      const result = await createAgentTokenAction(name);
      if ("error" in result) {
        showErrorToast(result.error ?? "Couldn't create the token.");
        return;
      }
      setCreated(result.token);
      setName("");
    });

  const onRevoke = async (id: Id<"agentTokens">) => {
    setRevoking(id);
    try {
      await revoke({ id });
      showSuccessToast("Token revoked");
    } catch {
      showErrorToast("Couldn't revoke the token");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <form
        className="flex items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name, e.g. Claude Code on my laptop"
          maxLength={40}
          aria-label="Token name"
          className="input-underline flex-1"
        />
        <Button type="submit" size="sm" disabled={pending || Boolean(nextTokenAt)}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Create
        </Button>
      </form>
      {nextTokenAt && !created && (
        <p className="type-meta text-xs">
          One new token a day: the next one {formatDistanceToNow(nextTokenAt, { addSuffix: true })}.
        </p>
      )}

      {created && (
        <div className="space-y-2">
          <p className="text-sm">Copy it now: it won’t be shown again.</p>
          <CopyBlock code={created} />
          <button type="button" onClick={() => setCreated(null)} className="type-meta cursor-pointer hover:text-black dark:hover:text-white">
            Done
          </button>
        </div>
      )}

      {tokens && tokens.length > 0 && (
        <ul>
          {tokens.map((token) => (
            <li key={token.id} className="relative divider-fade-top flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{token.name}</p>
                <p className="type-meta text-xs">
                  <span className="font-mono">{token.prefix}…</span> · created {format(token.createdAt, "MMM d, yyyy")} ·{" "}
                  {token.lastUsedAt ? `used ${formatDistanceToNow(token.lastUsedAt, { addSuffix: true })}` : "never used"}
                </p>
              </div>
              <StatusBadge status={token.expired ? "expired" : "active"} />
              <Button
                size="sm"
                variant="ghost"
                disabled={revoking === token.id}
                onClick={() => void onRevoke(token.id)}
                className="text-destructive hover:text-destructive"
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
