export const PENDING_NAME_PREFIX = "pending-name-";

export function createPendingName() {
  return `${PENDING_NAME_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function isNameComplete(name: string | null | undefined) {
  if (!name) return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && !trimmed.startsWith(PENDING_NAME_PREFIX);
}
