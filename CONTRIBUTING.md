# Contributing

Thanks for your interest. The Web Room is a technical blog platform built by
[AlxPro](https://alxpro.com) and developed in the open. Here's how it accepts help.

## Issues are welcome

- **Found a bug?** Open an issue with the **Fix** template: what happens, where (browser,
  device), and the steps to reproduce it.
- **Have an idea?** Open an issue with the **Feature** template. Explain the problem before
  the solution.
- **Found a security problem?** Don't open an issue. Follow [SECURITY.md](SECURITY.md).
- **A post or comment on the site breaks the rules?** Don't open an issue: see
  [SUPPORT.md](SUPPORT.md). This repository is for the code, not for moderating content.

## Pull requests

Code changes are made by Alex, with AI agents: every change starts as an issue written as a
spec, goes through a pull request that CI checks, and Alex reviews and merges it. Outside
pull requests are accepted for issues labeled `good first issue` or `help wanted`, and only
after you comment on the issue and Alex replies.

The code has no open-source license (see [LICENSE](LICENSE)). By opening a pull request,
you agree that your contribution may be included in the project under the same terms.

If you do open one:

1. Branch from the latest `main`, named after the issue: `fix/18-mobile-menu`.
2. Use [Conventional Commits](https://www.conventionalcommits.org): `fix(comments): keep
   replies when the parent is edited`.
3. Run the checks before pushing:

   ```bash
   npm run typecheck
   npm run lint
   npm run build
   ```

   Changes to `convex/` also need a local Convex deployment (`npx convex dev`) so the
   generated types are up to date.

4. Fill in the pull request template, and add `Closes #18`.

## Conduct

Everyone taking part follows the [code of conduct](CODE_OF_CONDUCT.md).
