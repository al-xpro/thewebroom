# AI Copilot Instructions for The Web Room Blog Platform

## Project Overview

**The Web Room** is a Next.js 16 full-stack blog platform enabling community content creation with advanced security, rate limiting, and authentication.

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Convex (real-time database) with better-auth for authentication
- **Validation**: Zod schemas + React Hook Form with field-level error display
- **Auth**: Email/password + GitHub OAuth, OTP-based password reset, user bans
- **UI**: TipTap rich text editor, Sonner toast notifications, Radix UI primitives

---

## Architecture & Data Flow

### Core Service Boundaries

**Frontend Layer** (`app/` + `components/`)
- Server components in `app/` handle auth redirects, permissions, pre-loading
- Client components in `components/` manage form state, error display, mutations
- Pattern: Server component wraps client component wrapper around form component

**Convex Backend** (`convex/`)
- **Queries**: Read-only, fetch posts/comments/user data
- **Mutations**: Write operations with validation, rate limiting checks, ban enforcement
- **Tables**: Posts, comments, users (via better-auth), rateLimits, otpLockouts, bans

**Auth Flow**
- better-auth handles credential/OAuth signup/login
- Convex mutations validate auth state via `authComponent.getAuthUser(ctx)`
- Custom mutations for password reset (OTP + session-based reset)
- Ban system (`bannedUsers` table) enforced at mutation entry points

### Critical Data Flows

1. **Creating a Post**
   - Client form → `createPost` mutation → rate limit check → insert post → update rateLimits table
   - Rate limit: 2 posts per 24-hour rolling window (not cooldown)
   - Returns user-readable message: "You can post again in 18 hours"

2. **OTP Password Reset**
   - Request: Generate OTP → store in `passwordResetOtps` with hash + expiry
   - Verify: Check attempts (3 max) → if failed, lock email for 24h → if success, create reset session
   - Reset: Validate session token → update password via better-auth adapter

3. **Comments with Rate Limiting**
   - Check: User already posted 3 comments in last 6 hours? → throw ConvexError
   - Error shown inline under textarea, not in toast (rate limit context-specific UX)
   - Window-based tracking: if 6+ hours elapsed, reset counter to 1

4. **Account Bans**
   - Ban email or userId → block signup/login/mutations at entry point
   - Pattern: `const ban = await getActiveBanByEmail(ctx, email); if (ban) throw new ConvexError(...)`

---

## Critical Developer Workflows

### Adding a New Convex Mutation with Rate Limiting

1. **Define in schema** (`convex/schema.ts`): Add table if needed with indexes
2. **Write mutation** (`convex/module.ts`):
   ```typescript
   export const actionName = mutation({
     args: { field: v.string() },
     handler: async (ctx, args) => {
       const user = await authComponent.getAuthUser(ctx);
       if (!user) throw new ConvexError("Not authenticated");
       
       // Ban check
       await assertUserNotBanned(ctx, { _id: user._id, email: user.email });
       
       // Rate limit check (if needed)
       const rateLimit = await ctx.db
         .query("rateLimits")
         .withIndex("by_userId", (q) => q.eq("userId", user._id))
         .first();
       
       // Your business logic
       return result;
     },
   });
   ```
3. **Use in UI** (`app/` or `components/`):
   ```typescript
   const mutation = useMutation(api.module.actionName);
   try {
     await mutation(args);
     showSuccessToast("Action completed");
   } catch (error) {
     // Error already user-friendly from server
     showErrorToast(error instanceof Error ? error.message : "Failed");
   }
   ```

### Form Error Handling Pattern

Component pattern for validation + server errors:

```typescript
const { body: commentBody } = useForm<z.infer<typeof commentSchema>>({
  resolver: zodResolver(commentSchema), // Client-side validation
  mode: "onChange", // Validate on change, not just submit
});

async function onSubmit(values: typeof commentSchema) {
  try {
    await mutation(values);
  } catch (error) {
    // Rate limit errors show inline
    if (error.message.includes("rate limit")) {
      setVisibleErrors({ body: error.message });
    } else {
      showErrorToast(error.message);
    }
  }
}
```

Key pattern: **Errors only visible after submit attempt, cleared on user input**

### Running Development Server

```bash
npm run dev
# Next.js: http://localhost:3000
# Convex dashboard: npx convex dev (separate terminal)
```

### Building for Production

```bash
npm run build
# Compiles Next.js + validates Convex mutations
# Fails if TypeScript errors or Convex types mismatch
```

---

## Project-Specific Conventions

### Error Handling
- **Convex errors** → user-friendly message via `error.message` (set in mutation throw)
- **Form validation** → Zod schema message
- **Toast vs inline**: Rate limits inline (under textarea), auth errors in toast notifications
- **Never show**: Stack traces, file paths, request IDs, "ConvexError" prefix

### Rate Limiting Constants
Located at top of relevant files, **modify here for changes**:
- `convex/posts.ts`: `POST_RATE_LIMIT = 2`, `POST_WINDOW_MS = 24 * 60 * 60 * 1000`
- `convex/comment.ts`: `COMMENT_RATE_LIMIT = 3`, `COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000`
- `convex/passwordReset.ts`: `OTP_MAX_ATTEMPTS = 3`, `OTP_LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000`
- `convex/rateLimiting.ts`: `ACCOUNT_CREATION_RATE_LIMIT = 1`

### Database Indexes
All frequently queried fields have indexes:
- User lookups: `.index("by_userId", ["userId"])`
- Email lookups: `.index("by_email", ["email"])`
- Slug lookups: `.index("by_slug", ["slug"])`
Missing index = performance issue for growing data

### Authentication Helpers
- `authComponent.getAuthUser(ctx)` → throws on no auth
- `authComponent.safeGetAuthUser(ctx)` → returns null on no auth
- `isAdminUserRecord(user)` → check admin status
- `assertUserNotBanned(ctx, user)` → throw ConvexError if banned

### Component Patterns
- **Server components** (`app/` files): Auth checks, data fetching, redirects
- **Client components** (`components/`): Forms, interactive state, mutations, error display
- **Hooks**: `useMutation` for writes, `useQuery` for reads, `useConvexAuth` for auth state
- **Preloading**: Server fetches data with `preloadQuery`, client uses `usePreloadedQuery` for no loading state

---

## Integration Points & Dependencies

### Convex ↔ Next.js
- better-auth adapter registered in `convex/auth.ts` → auto-syncs user table
- API route handler: `app/api/auth/[...all]/route.ts` uses better-auth middleware
- Environment: `NEXT_PUBLIC_CONVEX_URL` for client, `CONVEX_DEPLOYMENT` for build

### External Services
- **GitHub OAuth**: Configured via `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` in Convex env
- **Email**: Better-auth handles via configured provider (set in env dashboard)
- **Storage**: Convex storage for post images, cleanup on post delete

### Cross-File Dependencies to Know
1. `lib/auth-client.ts` → Initialize better-auth client (don't modify, UI calls this)
2. `convex/schema.ts` → Change here for table structure, then run `npx convex dev` to push
3. `app/schemas/auth.ts` → Zod definitions for signup/login/password reset (strictly enforce 8+ chars, special char, etc.)
4. `components/ui/toast.tsx` → Styling for error/success toasts (red bg for errors, custom width)

---

## Common Patterns & Anti-Patterns

### ✅ DO

- **Throw ConvexError with user message**: `throw new ConvexError("You can only post 2 blogs per day")`
- **Check auth + bans first**: Auth → ban check → business logic
- **Use rolling windows**: Track `windowStart` + `count`, reset when elapsed time > window
- **Show rate limit context**: Inline errors for rate limits (user sees why failed immediately)
- **Validate input shapes**: Zod schemas prevent malformed data reaching mutations
- **Create indexes for queries**: All `.withIndex()` lookups need matching `.index()` in schema
- **Preload server-side data**: Avoid N+1 fetches, pass preloaded data to client components

### ❌ DON'T

- **Hardcode rate limits in UI**: Source of truth is convex mutations only
- **Expose banned user emails**: Return generic "email not found" for security
- **Trust client-side timestamps**: Use `Date.now()` on server only
- **Make unindexed queries**: Will timeout with large datasets
- **Return sensitive data in queries**: Filter out passwords, session tokens, OTP hashes before return
- **Skip ban/auth checks**: Every mutation touching user data needs validation
- **Mix Convex queries + mutations in UI**: Use `useQuery` (subscribe) or `useMutation` (one-off), not both for same data

---

## Debugging Tips

### Database State
```bash
npx convex dashboard  # View live data, run ad-hoc queries
```

### Type Safety
- Convex auto-generates `_generated/api.d.ts` after mutation definition
- If you see "api.module.mutationName is not defined", run `npx convex dev` to regenerate
- TypeScript errors on API calls = mutation signature mismatch

### Rate Limit Not Working?
1. Check constant at top of file is correct
2. Verify `windowStart` is being stored in rateLimits table
3. Ensure `now - windowStart > windowMs` logic is window-based, not cooldown-based
4. Test: Post twice, check rateLimits table shows count=2

### OTP Lockout Not Triggering?
1. Verify `OTP_MAX_ATTEMPTS = 3` in `convex/passwordReset.ts`
2. Check `otpLockouts` table has entry after 3rd wrong attempt
3. Ensure `verifyOTPAndCreateSession` checks `otpLockouts` table for any email-matching locked record
4. Test: 3 wrong codes → see 24h message, not "attempt 4"

---

## Testing Checklist for New Features

When adding mutations or auth flows:

1. **Auth**: Unauthenticated request returns clear error
2. **Ban**: Banned user can't post/comment/signup
3. **Rate Limit**: N+1 request shows countdown message (if applicable)
4. **Schema**: Server accepts valid input, rejects invalid input with Zod error
5. **Error Display**: User sees friendly message not stack trace
6. **Performance**: Query has index on `.withIndex("field", q => q.eq("field", value))`
7. **Type Safety**: No `as never` or `any` casts in Convex handlers

---

## Quick Reference: Key Files

| Task | File | Key Function |
|------|------|--------------|
| View/edit auth system | `convex/auth.ts` | `createAuth`, `getCurrentUser`, ban helpers |
| Add rate limit | `convex/{posts,comment,passwordReset}.ts` | `rateLimit` check at handler top |
| Auth form validation | `app/schemas/auth.ts` | `signUpSchema`, `loginSchema` |
| Post creation form | `app/(shared-layout)/create/CreatePostClient.tsx` | Rich text editor + image upload |
| Comment display + form | `components/web/CommentSection.tsx` | Rate limit inline error pattern |
| UI components | `components/ui/*.tsx` | shadcn/Radix UI primatives |
| Convex schema | `convex/schema.ts` | Table definitions + indexes |
| Toast system | `components/ui/toast.tsx` | `showErrorToast`, `showSuccessToast` |
| Environment setup | `.env.local` | `NEXT_PUBLIC_CONVEX_URL`, OAuth keys |

---

## Next Large Task Ideas

1. **Email verification on signup**: Toggle `requireEmailVerification` in `betterAuth()` config
2. **CAPTCHA after N failed logins**: Add `reCAPTCHA` check after 2nd failed OTP attempt
3. **Post draft autosave**: Mutation to save partial post state, UI checks before navigate
4. **Comment threading**: Add `parentCommentId` to schema, display nested replies
5. **Search improvements**: Add full-text search index on post body, integrate with UI filter
6. **Analytics**: Track post views, track rate limit violations for abuse patterns
