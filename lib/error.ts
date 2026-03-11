const SAFE_PASSTHROUGH_PATTERNS = [
  // Rate limit messages are intentional user feedback
  /you can only (post|publish|comment)/i,
  /please try again in \d+ minutes/i,
  /too many (failed )?attempts/i,
  /invalid code/i,
  /code expired/i,
  /\d+ attempt\(s\) remaining/i,
  /account is (now )?locked/i,
  /incorrect password/i,
  /password is required/i,
  /passwords? do not match/i,
  /not authenticated/i,
  /github reauthentication/i,
  /otp verified/i,
];

export function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Allow intentional user-facing messages through
  if (SAFE_PASSTHROUGH_PATTERNS.some((pattern) => pattern.test(message))) {
    return message;
  }

  // Block anything that looks like an internal error
  console.error("[sanitizeError] Suppressed internal error:", message);
  return "Something went wrong. Please try again.";
}