"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ModerationTab } from "@/components/web/admin/ModerationTab";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { showErrorToast, showSuccessToast } from "@/components/ui/toast";
import { HorizontalBars, StatusSplit, WeeklyColumns } from "@/components/web/admin/charts";
import { TOPICS } from "@/convex/topics";
import Footer from "@/components/web/Footer";

const WEEK = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 12;
type Tab = "overview" | "reports" | "posts" | "members";

interface Confirm {
  title: string;
  body: string;
  action: string;
  destructive?: boolean;
  run: () => Promise<unknown>;
  done: string;
}

// Counts per week for the last WEEKS weeks, oldest first.
function perWeek(times: number[], now: number) {
  return Array.from({ length: WEEKS }, (_, i) => {
    const end = now - (WEEKS - 1 - i) * WEEK;
    const start = end - WEEK;
    return {
      label: new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: times.filter((t) => t > start && t <= end).length,
    };
  });
}

export default function AdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const [isPending, startTransition] = useTransition();
  const isAdmin = useQuery(api.auth.getIsAdmin, isAuthenticated ? {} : "skip");
  const posts = useQuery(api.posts.getAllPostsForAdmin, isAdmin ? {} : "skip");
  const users = useQuery(api.auth.listUsersForAdmin, isAdmin ? {} : "skip");
  const reports = useQuery(api.reports.listOpenReports, isAdmin ? {} : "skip");

  const deletePost = useMutation(api.posts.deletePost);
  const updatePost = useMutation(api.posts.updatePost);
  const banUserByAdmin = useMutation(api.auth.banUserByAdmin);
  const deleteComment = useMutation(api.comment.deleteComment);
  const closeReports = useMutation(api.reports.closeReports);

  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  // Posts: the list, or the moderation agent's review of them.
  const [postsView, setPostsView] = useState<"list" | "agent">("list");
  // Read once after mounting (the page is prerendered); the charts don't need to tick.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const stats = useMemo(() => {
    if (!posts || !users || now === null) return null;
    const statusOf = (p: { status?: string }) => p.status || "published";
    const count = (s: string) => posts.filter((p) => statusOf(p) === s).length;
    return {
      published: count("published"),
      draft: count("draft"),
      scheduled: count("scheduled"),
      hidden: count("hidden") + count("flagged"),
      members: users.length,
      banned: users.filter((u) => u.isBanned).length,
      postsPerWeek: perWeek(
        posts.filter((p) => statusOf(p) === "published").map((p) => p.publishAt ?? p._creationTime),
        now
      ),
      membersPerWeek: perWeek(users.map((u) => u.createdAt), now),
      topics: TOPICS.map((topic) => ({ label: topic, value: posts.filter((p) => p.topic === topic).length })),
    };
  }, [posts, users, now]);

  if (!authLoading && !isAuthenticated) notFound();
  if (isAdmin !== undefined && !isAdmin) notFound();
  if (!posts || !users || !stats) return null;

  const q = query.trim().toLowerCase();
  const visiblePosts = posts.filter(
    (p) =>
      (statusFilter === "all" || (p.status || "published") === statusFilter) &&
      (!q || p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q))
  );
  const visibleUsers = users.filter(
    (u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );

  const runConfirm = () => {
    if (!confirm) return;
    startTransition(async () => {
      try {
        await confirm.run();
        showSuccessToast(confirm.done);
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : "Something went wrong");
      } finally {
        setConfirm(null);
      }
    });
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "reports", label: "Reports", count: reports?.length },
    { key: "posts", label: "Posts", count: posts.length },
    { key: "members", label: "Members", count: users.length },
  ];

  return (
    <>
      {confirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => !isPending && setConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm space-y-6 rounded-2xl border bg-white p-6 dark:bg-black"
          >
            <div className="space-y-1">
              <h2 id="confirm-title" className="type-heading">{confirm.title}</h2>
              <p className="type-meta">{confirm.body}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={isPending}>
                Cancel
              </Button>
              <Button
                variant={confirm.destructive ? "destructive" : "default"}
                onClick={runConfirm}
                disabled={isPending}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {confirm.action}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col w-full pt-20 max-w-3xl mx-auto px-4 pb-16">
        <div className="flex items-end justify-between gap-4 py-10">
          <h1 className="type-display">Admin</h1>
          <nav className="flex gap-1" aria-label="Admin sections">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setQuery("");
                }}
                aria-current={tab === t.key ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                  tab === t.key
                    ? "bg-black text-white dark:bg-white dark:text-black"
                    : "text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white"
                }`}
              >
                {t.label}
                {t.count !== undefined && <span className="ml-1.5 tabular-nums opacity-60">{t.count}</span>}
              </button>
            ))}
          </nav>
        </div>

        {tab === "overview" && (
          <>
            <dl className="relative divider-fade-top py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[
                { label: "Published", value: stats.published },
                { label: "Drafts", value: stats.draft + stats.scheduled },
                { label: "Members", value: stats.members },
                { label: "Hidden", value: stats.hidden },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <dt className="type-label">{label}</dt>
                  <dd className="type-title tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="relative divider-fade-top py-8 grid gap-10 sm:grid-cols-2">
              <WeeklyColumns title="Posts a week" data={stats.postsPerWeek} />
              <WeeklyColumns title="New members a week" data={stats.membersPerWeek} />
            </section>

            <section className="relative divider-fade-top py-8 grid gap-10 sm:grid-cols-2">
              <HorizontalBars title="Topics" data={stats.topics} />
              <StatusSplit
                title="Status"
                parts={[
                  { label: "published", value: stats.published, dot: "bg-[#3FA35B]" },
                  { label: "scheduled", value: stats.scheduled, dot: "bg-primary" },
                  { label: "draft", value: stats.draft, dot: "bg-[#A0A0A0] dark:bg-[#666666]" },
                  { label: "hidden", value: stats.hidden, dot: "bg-destructive" },
                ]}
              />
            </section>
          </>
        )}

        {tab === "reports" && (
          <ul className="relative divider-fade-top">
            {(reports ?? []).map((item) => {
              const close = (outcome: "resolved" | "dismissed") =>
                closeReports({ targetType: item.targetType, targetId: item.targetId, outcome });
              return (
                <li key={`${item.targetType}:${item.targetId}`} className="relative divider-dashed-fade-bottom space-y-2 py-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="type-heading text-base truncate">{item.title}</p>
                    <span className="type-meta shrink-0 text-xs tabular-nums">
                      {item.count} {item.count === 1 ? "report" : "reports"}
                    </span>
                  </div>
                  {item.excerpt && <p className="type-body text-sm line-clamp-2">“{item.excerpt}”</p>}
                  <p className="type-meta text-xs">
                    {item.author} · {item.reasons.join(", ")}
                  </p>
                  <div className="-ml-3 flex items-center">
                    {item.slug && (
                      <Link
                        href={`/posts/${item.slug}`}
                        className="px-3 py-1 text-sm text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white"
                      >
                        View
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Dismiss these reports?",
                          body: "The item stays as it is.",
                          action: "Dismiss",
                          done: "Reports dismissed",
                          run: () => close("dismissed"),
                        })
                      }
                    >
                      Dismiss
                    </Button>
                    {item.targetType === "post" && item.status !== "hidden" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setConfirm({
                            title: "Hide this post?",
                            body: `"${item.title}". The author gets an e-mail.`,
                            action: "Hide",
                            done: "Post hidden",
                            run: async () => {
                              await updatePost({ postId: item.targetId as Id<"posts">, status: "hidden" });
                              await close("resolved");
                            },
                          })
                        }
                      >
                        Hide
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: item.targetType === "post" ? "Delete this post?" : "Delete this comment?",
                          body: "It is deleted for good.",
                          action: "Delete",
                          destructive: true,
                          done: "Deleted",
                          run: async () => {
                            await close("resolved");
                            if (item.targetType === "post") await deletePost({ postId: item.targetId as Id<"posts"> });
                            else await deleteComment({ commentId: item.targetId as Id<"comments"> });
                          },
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
            {reports && reports.length === 0 && <li className="type-meta py-10 text-center">No open reports.</li>}
          </ul>
        )}

        {(tab === "posts" || tab === "members") && (
          <div className="relative divider-fade-top flex flex-wrap items-center gap-4 py-6">
            <Input
              placeholder={tab === "posts" ? "Search title or author" : "Search name or email"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-xs"
              aria-label="Search"
            />
            {tab === "posts" && (
              <div className="flex gap-1">
                {["all", "published", "scheduled", "draft", "hidden"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    aria-pressed={statusFilter === s}
                    className={`rounded-full px-2.5 py-1 text-xs cursor-pointer ${
                      statusFilter === s
                        ? "bg-black/5 text-black dark:bg-white/10 dark:text-white"
                        : "text-[#666666] dark:text-[#A0A0A0]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "posts" && (
          <div className="flex gap-1 pt-4" role="tablist" aria-label="Posts view">
            {(["list", "agent"] as const).map((view) => (
              <button
                key={view}
                type="button"
                role="tab"
                aria-selected={postsView === view}
                onClick={() => setPostsView(view)}
                className={`cursor-pointer rounded-full px-3 py-1 text-sm ${
                  postsView === view ? "bg-black text-white dark:bg-white dark:text-black" : "text-[#666666] dark:text-[#A0A0A0]"
                }`}
              >
                {view === "list" ? "List" : "Agent review"}
              </button>
            ))}
          </div>
        )}

        {tab === "posts" && postsView === "agent" && <ModerationTab posts={posts} />}

        {tab === "posts" && postsView === "list" && (
          <ul>
            {visiblePosts.map((post) => {
              const status = post.status || "published";
              const isHidden = status === "hidden";
              return (
                <li key={post._id} className="relative divider-fade-top flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="type-heading text-base truncate">{post.title}</p>
                    <p className="type-meta truncate">
                      {post.authorName} · {new Date(post.publishAt ?? post._creationTime).toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                  <div className="flex shrink-0 items-center">
                    {status === "published" && (
                      <Link href={`/posts/${post.slug}`} className="px-2 py-1 text-xs text-[#666666] hover:text-black dark:text-[#A0A0A0] dark:hover:text-white">
                        View
                      </Link>
                    )}
                    {(status === "published" || isHidden) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setConfirm({
                            title: isHidden ? "Show this post?" : "Hide this post?",
                            body: `"${post.title}". The author gets an e-mail.`,
                            action: isHidden ? "Show" : "Hide",
                            done: isHidden ? "Post shown" : "Post hidden",
                            run: () =>
                              updatePost({
                                postId: post._id as Id<"posts">,
                                status: isHidden ? "published" : "hidden",
                              }),
                          })
                        }
                      >
                        {isHidden ? "Show" : "Hide"}
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Delete this post?",
                          body: `"${post.title}" is deleted for good.`,
                          action: "Delete",
                          destructive: true,
                          done: "Post deleted",
                          run: () => deletePost({ postId: post._id as Id<"posts"> }),
                        })
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              );
            })}
            {visiblePosts.length === 0 && <li className="type-meta py-10 text-center">Nothing matches.</li>}
          </ul>
        )}

        {tab === "members" && (
          <ul>
            {visibleUsers.map((user) => (
              <li key={user._id} className="relative divider-fade-top flex items-center gap-4 py-4">
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black/5 text-xs font-medium dark:bg-white/10"
                >
                  {(user.name || user.email).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="type-heading text-base truncate">{user.name || "—"}</p>
                  <p className="type-meta truncate">
                    {user.email} · joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US") : "—"}
                  </p>
                </div>
                <StatusBadge status={user.isAdmin ? "admin" : user.isBanned ? "banned" : "active"} />
                <div className="w-16 shrink-0 text-right">
                  {!user.isAdmin && !user.isBanned && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        setConfirm({
                          title: "Ban this member?",
                          body: `${user.name || user.email} can't sign in or post again.`,
                          action: "Ban",
                          destructive: true,
                          done: `${user.name || user.email} is banned`,
                          run: () =>
                            banUserByAdmin({
                              userId: user._id,
                              email: user.email,
                              reason: "Violation of platform policies",
                            }),
                        })
                      }
                    >
                      Ban
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {visibleUsers.length === 0 && <li className="type-meta py-10 text-center">Nothing matches.</li>}
          </ul>
        )}

        <Footer />
      </div>
    </>
  );
}
