export const PENDING_NAME_PREFIX = "";

type OnboardingUser = {
  name?: string | null;
  displayUsername?: string | null;
  onboardingCompleted?: boolean;
} | null | undefined;

export function createPendingName() {
  return `${PENDING_NAME_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function isNameComplete(name: string | null | undefined) {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && !trimmed.startsWith(PENDING_NAME_PREFIX);
}

export function isOnboardingComplete(user: OnboardingUser) {
  if (typeof user?.onboardingCompleted === "boolean") {
    return user.onboardingCompleted;
  }
  return isNameComplete(user?.displayUsername);
}
