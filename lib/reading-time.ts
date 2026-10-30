// Minutes to read a post, from its text: about 220 words a minute, between 1 and 30 (the
// limits the post schema allows).
export function estimateMinRead(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(30, Math.max(1, Math.round(words / 220)));
}
