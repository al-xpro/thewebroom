# The Web Room | Technical Blog Platform

[![CI](https://github.com/al-xpro/thewebroom/actions/workflows/ci.yml/badge.svg)](https://github.com/al-xpro/thewebroom/actions/workflows/ci.yml)

A blog platform for developers, designed and developed by [AlxPro](https://alxpro.com):
members write posts in a rich-text editor built for code, readers get statically
prerendered pages, and comments and presence update in real time.

**Live:** [thewebroom.alxpro.com](https://thewebroom.alxpro.com)

## What it does

- **Writing:** a TipTap editor with syntax-highlighted code blocks (Shiki, with file names
  and highlighted lines), terminal blocks with npm/pnpm/yarn tabs, callouts, badges, tables,
  captions, alignment and keyboard shortcuts. Posts can be saved as drafts and published
  later.
- **Reading:** posts grouped in four topics (Web Architecture, UI Engineering, AI for
  Developers, Productivity) with topic filters and pagination, a dock with search (⌘K) and a
  reading-progress minimap of the post's headings, and copy buttons on code blocks.
- **Real time:** threaded comments with replies, and presence showing who else is reading a
  post, both over Convex subscriptions.
- **Accounts:** e-mail and password with e-mail verification, GitHub sign-in, password reset
  with a one-time code, a display name chosen at onboarding, and account deletion that asks
  you to sign in again first.
- **Moderation:** an admin dashboard to hide or delete posts and comments, ban accounts and
  IP addresses, and e-mail authors when their post is hidden, restored or removed.
- **Abuse limits:** posts, comments, account creation, password-reset requests and one-time
  code attempts are rate-limited in the database, so limits survive restarts and apply across
  instances.
- **Rendering:** Partial Prerendering with Cache Components. A post's page is static HTML,
  comments stream in, and edits invalidate exactly the cached post by tag.
- **Security headers:** a Content Security Policy, HSTS, `X-Frame-Options`,
  `Referrer-Policy` and `Permissions-Policy` on every route.
- **SEO:** per-post metadata and Open Graph images, a sitemap built from published posts,
  and `robots.txt`.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) and React 19
- TypeScript, Tailwind CSS 4 and [shadcn/ui](https://ui.shadcn.com)
- [Convex](https://convex.dev): database, file storage, real-time queries, server functions,
  and the presence component
- [better-auth](https://better-auth.com) through `@convex-dev/better-auth`
- [TipTap](https://tiptap.dev) 3 with custom extensions, and [Shiki](https://shiki.style)
- [Resend](https://resend.com) for transactional e-mail
- Zod and React Hook Form for validation
- Hosted on [Vercel](https://vercel.com)

## Architecture

```text
app/
  (shared-layout)/   home, posts, post page, create, edit, my posts, profile, legal pages
  auth/              sign in, sign up, verify e-mail, forgot and reset password, one-time code
  onboarding/        profile completion after the first sign-in
  admin/             moderation dashboard
  api/auth/          better-auth handlers, account-creation limit
  schemas/           Zod schemas shared by forms and server actions
  actions.ts         server actions: create, update and delete posts, with cache invalidation
components/
  web/               feature components: comments, post content, dock navigation, presence
  ui/                shadcn/ui primitives, code and terminal blocks, the editor shell
convex/
  schema.ts          every table
  auth.ts            better-auth setup, bans, onboarding, account deletion
  posts.ts           posts, search, moderation e-mails
  comment.ts         comments and replies
  rateLimiting.ts    database-backed limits
  passwordReset.ts   hashed one-time codes, lockouts, reset sessions
  http.ts            HTTP endpoints for the proxy, sitemap and metadata
lib/
  get-post.ts        "use cache" data fetchers with cache tags
  extension/         custom TipTap extensions
  sanitize.ts        DOMPurify allow-lists for post HTML
proxy.ts             request gate: bot and AI-scraper blocking, IP bans, a first-line rate limit
```

**Two backends.** Convex is the source of truth: data, authorization and limits are enforced
in its functions, never trusted from the browser. Next.js renders pages, runs the server
actions that create and edit posts, and reads Convex with `fetchQuery`/`preloadQuery`.

**Caching.** Post pages prerender with `"use cache"`, `cacheLife` and `cacheTag`
(`post-${slug}`, `comments-${postId}`, `blog`). Server actions call `updateTag` after a
write, so a change refreshes only the pages it affects.

**Request gate.** `proxy.ts` runs before auth routes and the editor: it blocks known bots
and AI scrapers, checks the IP against the ban list (cached, fails open), and applies an
in-memory limit to obvious hammering. It reads the client IP only from Vercel's
`x-vercel-forwarded-for` in production. The authoritative limits are in Convex.

**Sign-ups.** The auth route forwards the client IP to Convex with an HMAC signature
(`AUTH_PROXY_SECRET`). Before better-auth creates any user, Convex verifies it and checks
bans and the per-IP limit in one transaction, so sign-ups that bypass the website are
refused.

**Secrets at rest.** E-mail verification tokens, one-time codes, reset sessions and
re-authentication challenges are stored only as SHA-256 hashes, with an expiry and
single use.

## Getting started

Requires Node.js 20.9 or later and a free [Convex](https://convex.dev) account.

```bash
npm install
npx convex dev     # creates a dev deployment, writes CONVEX_DEPLOYMENT and NEXT_PUBLIC_CONVEX_URL to .env.local, and pushes the functions
npm run dev        # http://localhost:3000, in a second terminal
npm run lint
npm run build
```

### Environment variables

Names only here. Never commit values.

**Next.js** (`.env.local`):

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | The Convex deployment URL (`*.convex.cloud`). Written by `npx convex dev`. |
| `CONVEX_SITE_URL` | The deployment's HTTP actions URL (`*.convex.site`), for the sitemap and post metadata. |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | The same `*.convex.site` URL, for the auth route and server-side tokens. Set by `npx convex deploy` during production builds. |
| `AUTH_PROXY_SECRET` | Signs the client IP the auth route forwards to Convex. Same value as the Convex deployment it talks to: one value for local and Preview (dev), another for Production. Generate with `openssl rand -base64 32`. |
| `CONVEX_DEPLOY_KEY` | Vercel Production only. The production build runs `npx convex deploy` with it; previews build against the dev deployment without it. |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for the sitemap. Defaults to `https://thewebroom.alxpro.com`. |

**Convex** (set with `npx convex env set NAME value`):

| Name | Purpose |
| --- | --- |
| `SITE_URL` | The site's URL, for auth callbacks and links in e-mails. |
| `BETTER_AUTH_SECRET` | Signs sessions. Generate with `openssl rand -base64 32`. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth app. Without them, GitHub sign-in is hidden. |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Resend, for verification, reset and moderation e-mails. The sender must be on a domain verified in Resend, e.g. `The Web Room <noreply@thewebroom.alxpro.com>`. |
| `ADMIN_USER_ID`, `ADMIN_EMAIL` | The admin accounts, as comma-separated lists. |
| `AUTH_PROXY_SECRET` | Same value as in Next.js. Without it, sign-ups are refused. |
| `TRUSTED_ORIGINS` | Optional. Other origins allowed to call auth, comma-separated, wildcards allowed. On the dev deployment: `https://the-web-room-*-alxpro.vercel.app`, so sign-in works on Vercel previews. |

## How this was built

I'm the developer on this project, working with AI coding agents
([Claude Code](https://claude.com/claude-code)) the way a lead works with a pair
programmer. I own the architecture, the specs and the code that ships.

The first version was built privately from February to April 2026 and published as `v1.0`
in October 2026. Before publishing, a review found security issues that are tracked and
fixed in the open in the [`v1.1 — Ready to publish`](https://github.com/al-xpro/thewebroom/milestone/1)
milestone.

Since then, every change goes through the same loop:

1. **Spec.** An issue with context, a goal and acceptance criteria.
2. **Implement on a branch.** Typecheck, lint and the build run before I see it.
3. **Review.** I read the diff, run it, and change the code myself where it needs it.
4. **Pull request.** What, Why and How to test, linked to its issue. CI has to pass, and I
   merge.

Commits drafted with an agent carry a `Co-Authored-By` trailer, so the history is honest
about how the work was done.

## Roadmap

The [milestones](https://github.com/al-xpro/thewebroom/milestones):

- **v1.1 — Ready to publish:** security fixes, dependency updates, CI and community files.
- **v1.2 — Foundations:** tests, indexed and paginated queries, upload limits, an RSS feed.
- **v2.0 — Community:** public profiles, following people and topics, a Following feed,
  notifications, and block and report.
- **v2.1 — Writing assistant:** agents that help members write and review posts, never
  publish for them.

## Contributing

Issues are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md), the
[code of conduct](CODE_OF_CONDUCT.md) and the [security policy](SECURITY.md).

## License

© AlxPro. All rights reserved. The code is public so it can be read and reviewed.
It is not licensed for reuse or redistribution. See [LICENSE](LICENSE).
