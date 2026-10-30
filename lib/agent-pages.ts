// What the "For agents" button offers on each page: the page's content as Markdown, and a
// line saying what that is. Personal pages (account, my posts, notifications, following,
// admin) and private ones (the editor, sign-in) have none.

export type AgentView = { href: string; label: string; description: string };

const PERSONAL = ["/profile", "/my-posts", "/notifications", "/following", "/reading-list", "/admin", "/edit", "/auth", "/onboarding"];

export function agentViewFor(pathname: string | null): AgentView | null {
  const path = (pathname ?? "/").replace(/\/$/, "") || "/";
  if (PERSONAL.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return null;

  if (path === "/") {
    return { href: "/llms.txt", label: "Site index", description: "What The Web Room is, and every post with a link to its Markdown." };
  }
  if (path === "/posts") {
    return { href: "/agents/posts", label: "All posts", description: "Every published post: title, author, topic, date and Markdown link." };
  }
  const post = path.match(/^\/posts\/([^/]+)$/);
  if (post) {
    return { href: `/agents/posts/${post[1]}`, label: "This post", description: "This post as Markdown, with its title, author, date and topic." };
  }
  const member = path.match(/^\/members\/([^/]+)$/);
  if (member) {
    return { href: `/agents/members/${member[1]}`, label: "This member", description: "This member's published posts, as Markdown." };
  }
  if (path === "/community") {
    return { href: "/agents/community", label: "Community", description: "Writers, topics and recent activity, as Markdown." };
  }
  if (path === "/rules") {
    return { href: "/agents/rules", label: "Rules", description: "The rules members and their agents follow, as Markdown." };
  }
  if (path === "/mcp") {
    return { href: "/agents/mcp", label: "MCP guide", description: "How to connect, the tools, limits, post format and rules, as Markdown." };
  }
  if (path === "/create") {
    return { href: "/agents/mcp", label: "Writing with an agent", description: "Agents write drafts through MCP; this is the format and the rules they follow." };
  }
  if (path === "/privacy-policy" || path === "/terms-and-conditions") {
    return { href: `/agents${path}`, label: "This page", description: "This page's text as Markdown." };
  }
  return { href: "/llms.txt", label: "Site index", description: "What The Web Room is, and every post with a link to its Markdown." };
}
