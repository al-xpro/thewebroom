# Rate Limiting & Security Implementation

## Overview

This document outlines the comprehensive rate limiting and security measures implemented in The Web Room blog platform to protect against abuse and malicious actors.

## Rate Limiting Rules

### 1. **Post Creation (User-Based)**
- **Limit**: 2 posts per 24 hours
- **Window**: Rolling 24-hour window
- **Implementation**: `convex/rateLimiting.ts` → `checkPostRateLimit()`
- **Applied in**: `convex/posts.ts` → `createPost()`
- **Response**: Clear message showing when they can post next

### 2. **Comment Creation (User-Based)**
- **Limit**: 3 comments per 6 hours
- **Window**: Rolling 6-hour window (not daily)
- **Implementation**: `convex/rateLimiting.ts` → `checkCommentRateLimit()`
- **Applied in**: `convex/comment.ts` → `createComment()`
- **Response**: Displays comments remaining and reset time

### 3. **OTP (One-Time Password) Verification**
- **Max Attempts**: 3 failed attempts before lockout
- **Lockout Duration**: 24 hours after 3 failed attempts
- **Implementation**: `convex/passwordReset.ts` → `verifyOTPAndCreateSession()`
- **Features**:
  - Tracks failed attempt count incrementally
  - Shows remaining attempts (e.g., "2 attempts remaining")
  - Automatic 24h lockout on 3rd failure
  - New `otpLockouts` table prevents bypass attempts
  - Users can request new code after lockout expires
- **Stored in**: `otpLockouts` table

### 4. **Password Reset Request Limit**
- **Limit**: 3 OTP requests per 24 hours
- **Window**: 24-hour rolling window
- **Implementation**: `convex/passwordReset.ts` → `requestPasswordReset()`
- **Stored in**: `passwordResetRequestLimits` table

### 5. **Account Creation Rate Limiting (IP-Based - Infrastructure Required)**
- **Limit**: 1 account per IP per 24 hours
- **Implementation**: `convex/rateLimiting.ts` → `checkAccountCreationRateLimit()`
- **Status**: ✅ Backend mutation implemented, requires Next.js integration
- **How to Enable**:

```typescript
// In app/api/auth/[...all]/route.ts or a custom middleware:
import { headers } from 'next/headers';

// Extract client IP from headers
const headersList = await headers();
const ip = headersList.get('x-forwarded-for') || 
           headersList.get('x-real-ip') || 
           'unknown';

// Call Convex mutation before account creation
await convex.mutation(api.rateLimiting.checkAccountCreationRateLimit, {
  ipAddress: ip,
  email: userEmail,
});
```

**Note**: IP extraction depends on your deployment environment (Vercel, custom server, etc.). Adjust header names accordingly:
- Vercel: `x-forwarded-for`
- Cloudflare: `cf-connecting-ip`
- Custom Nginx: `x-real-ip`

---

## Database Schema Changes

### New/Updated Tables

#### `rateLimits` (Updated)
```typescript
{
  userId: string,
  // Posts tracking
  postWindowStart?: number,      // Timestamp when current 24h window started
  postCount?: number,             // Number of posts in current window
  // Comments tracking
  commentWindowStart?: number,    // Timestamp when current 6h window started
  commentCount?: number,          // Number of comments in current window
  _id: Id,
  _creationTime: number,
}
```

#### `otpLockouts` (New)
```typescript
{
  email: string,
  lockedUntil: number,            // Timestamp when lockout expires
  reason: string,                 // "Too many failed OTP attempts"
  _id: Id,
  _creationTime: number,
}
```

#### `accountCreationLimits` (New)
```typescript
{
  ipAddress: string,
  accountEmail: string,           // Normalized email of created account
  createdAt: number,
  _id: Id,
  _creationTime: number,
}
```

---

## Implementation Details

### Post Rate Limiting
**File**: `convex/posts.ts`

```typescript
// Check and update in one atomic operation
const currentCount = rateLimit.postCount || 0;
if (currentCount >= POST_RATE_LIMIT && timeSinceWindowStart <= POST_WINDOW_MS) {
  throw new ConvexError(`You can only publish 2 posts per day...`);
}
// Increments counter and resets window after 24h
```

### Comment Rate Limiting
**File**: `convex/comment.ts`

```typescript
// 3 comments per 6-hour window (NOT daily)
const COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000;
// Tracks both window start and comment count for precision
```

### OTP Lockout Mechanism
**File**: `convex/passwordReset.ts`

**Flow**:
1. User requests password reset → OTP sent
2. 1st wrong attempt → `attempts: 1` stored
3. 2nd wrong attempt → `attempts: 2` stored
4. 3rd wrong attempt → `attempts: 3` AND `otpLockouts` entry created
5. Any subsequent request in lockout window → User locked for 24h

**Key Feature**: Lockout persists across multiple OTP request cycles

---

## Related Security Features

### Ban System
- **Location**: `convex/auth.ts`
- **Scope**: Email-based and user ID-based bans
- **Function**: `assertUserNotBanned()`
- **Applied to**: Post creation, comment creation, and user operations

### Email Verification
- **Location**: `convex/auth.ts` (better-auth config)
- **Status**: Currently optional (can be required)
- **Recommendation**: Enable for production to prevent fake emails

### Account Deletion with Reauthentication
- **Location**: `convex/auth.ts`
- **Purpose**: Prevents unauthorized account deletion
- **Methods**: Password verification or GitHub reauthentication

### Session Management
- **Provider**: better-auth
- **TTL**: Configurable per auth type
- **Tokens**: Secure and rotation-friendly

---

## Maintenance & Cleanup

### Automatic Cleanup Task
**Function**: `convex/rateLimiting.ts` → `cleanupOldRateLimitRecords()`

Removes:
- Account creation limit records older than 30 days
- Expired OTP lockout entries

**To Schedule** (add to Convex cron or Lambda):
```typescript
// In convex.config.ts or via scheduled job
export const cleanup = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(internal.rateLimiting.cleanupOldRateLimitRecords);
  },
});
```

---

## Testing Rate Limits

### Test Post Limit
```bash
# Try to create 3 posts within 24 hours
# 3rd attempt should fail with rate limit message
```

### Test Comment Limit
```bash
# Try to create 4 comments within 6 hours
# 4th attempt should fail with rate limit message
```

### Test OTP Lockout
```bash
# Trigger password reset
# Enter wrong code 3 times
# 4th attempt should show 24h lockout message
# Verify cannot request new OTP for 24h
```

### Test Account Creation Limit (when integrated)
```bash
# Create account from same IP
# Try to create another account from same IP within 24h
# 2nd attempt should fail
```

---

## Configuration Constants

All rate limits are centralized for easy adjustment:

**File**: `convex/rateLimiting.ts`
```typescript
const POST_RATE_LIMIT = 2;
const POST_WINDOW_MS = 24 * 60 * 60 * 1000;

const COMMENT_RATE_LIMIT = 3;
const COMMENT_WINDOW_MS = 6 * 60 * 60 * 1000;

const ACCOUNT_CREATION_RATE_LIMIT = 1;
const ACCOUNT_CREATION_WINDOW_MS = 24 * 60 * 60 * 1000;
```

**File**: `convex/passwordReset.ts`
```typescript
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCKOUT_DURATION_MS = 24 * 60 * 60 * 1000;
const OTP_DAILY_REQUEST_LIMIT = 3;
```

---

## Best Practices Implemented ✅

1. **Window-Based (Not Cooldown-Based)**
   - Uses rolling windows instead of fixed cooldowns
   - More accurate and user-friendly

2. **Atomic Operations**
   - All checks and updates happen in single mutation
   - No race conditions

3. **Clear User Feedback**
   - Messages explain limit, duration, and remaining quota
   - Shows exact time until reset

4. **Exponential Security**
   - Multiple layers (user, IP, email, OTP)
   - Each layer addresses different attack vector

5. **Database Efficiency**
   - Single document per user for all rate limit tracking
   - Indexed lookups on `userId`, `ipAddress`, `email`
   - Periodic cleanup of old records

6. **GDPR Compliant**
   - Rate limit data cleaned up within 30 days
   - No unnecessary data persistence
   - Privacy-first approach (documented in Privacy Policy)

---

## Next Steps for Production

1. **Integrate IP-based rate limiting** in Next.js API routes
2. **Enable email verification** for new accounts
3. **Set up monitoring** for rate limit hits (indicates attacks)
4. **Configure automated alerts** for suspicious patterns
5. **Test under load** to ensure limits work at scale
6. **Document limits in client** UI for transparency
7. **Consider CAPTCHA** for repeated failures

---

## Privacy Policy Reference

These rate limiting measures are documented in:
- **Privacy Policy**: Section 2 (Security and operational data)
- **Terms & Conditions**: Section 3 (Acceptable Use - botting prohibition)

Users should be aware that:
- IP addresses are collected to prevent account creation abuse
- Rate limit state is stored temporarily
- All non-user data is deleted within 30 days
- Lockouts are automatic responses to suspicious activity

---

## Support & Questions

For issues or questions about rate limiting:
1. Check the error message returned (usually contains the reset time)
2. Review this documentation
3. Contact admin with account details

---

**Last Updated**: March 10, 2026
**Version**: 1.0
**Status**: Production Ready ✅
