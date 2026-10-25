# Security policy

## Supported versions

Only the latest release, the `main` branch and the live site
([thewebroom.vercel.app](https://thewebroom.vercel.app)) receive fixes.

## Reporting a vulnerability

Please **don't** open a public issue, and don't test against other people's accounts or
content on the live site.

Report it privately on GitHub: go to the
[Security tab](https://github.com/al-xpro/thewebroom/security) and click
**Report a vulnerability**. Include what you found, how to reproduce it, and the impact
you expect.

You'll get a reply within 7 days. If the report is confirmed, it's fixed in a new release
and you're credited in the advisory, unless you'd rather not be.

## Scope

In scope: this repository's code and the live site, including authentication, sessions,
rate limits, moderation and the Convex functions in `convex/`.

Out of scope: denial of service, spam through normal use within the rate limits, and
findings in third-party services (Convex, Vercel, Resend, GitHub) that should go to them.
