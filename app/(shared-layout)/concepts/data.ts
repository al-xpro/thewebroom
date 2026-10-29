// Made-up data for the concept screens. Nothing here is real or stored.

export const people = [
  { handle: "mara", name: "Mara Lind", bio: "Design systems and the CSS that holds them.", posts: 14, online: true },
  { handle: "jonas", name: "Jonas Okafor", bio: "Edge functions, queues, and slow databases.", posts: 9, online: true },
  { handle: "ines", name: "Inês Rocha", bio: "Accessibility first, then everything else.", posts: 21, online: false },
  { handle: "theo", name: "Theo Park", bio: "Writing about Next.js the long way round.", posts: 6, online: false },
  { handle: "sana", name: "Sana Iqbal", bio: "Agents, evals, and the boring parts of AI.", posts: 11, online: true },
];

export const avatar = (handle: string) => `https://avatar.vercel.sh/${handle}`;

export const followingFeed = [
  { author: "mara", title: "Tokens are a contract, not a palette", topic: "UI Engineering", minutes: 6, when: "2h" },
  { author: "sana", title: "Evals before prompts", topic: "AI for Developers", minutes: 8, when: "5h" },
  { author: "jonas", title: "The queue that saved our launch", topic: "Web Architecture", minutes: 11, when: "1d" },
];

export const notifications = [
  { kind: "reply", who: "ines", text: "replied to your comment on “Focus rings that don’t lie”", when: "4m", unread: true },
  { kind: "follow", who: "theo", text: "followed you", when: "1h", unread: true },
  { kind: "post", who: "mara", text: "published “Tokens are a contract, not a palette”", when: "2h", unread: false },
  { kind: "reply", who: "jonas", text: "replied to your post “Caching, honestly”", when: "Yesterday", unread: false },
  { kind: "follow", who: "sana", text: "followed you", when: "3d", unread: false },
];

export const activity = [
  { who: "mara", text: "published", target: "Tokens are a contract, not a palette", when: "2h" },
  { who: "jonas", text: "commented on", target: "Evals before prompts", when: "3h" },
  { who: "sana", text: "started following", target: "Web Architecture", when: "6h" },
  { who: "ines", text: "published", target: "Focus rings that don’t lie", when: "1d" },
];

export const reports = [
  {
    target: "Comment on “Caching, honestly”",
    excerpt: "Buy cheap followers here → link.example",
    reports: 4,
    triage: { label: "spam", confidence: 0.97, reason: "Promotional link, posted on 6 posts in 10 minutes." },
  },
  {
    target: "Post “10 tricks nobody tells you”",
    excerpt: "Copied paragraphs from an existing article without credit.",
    reports: 2,
    triage: { label: "plagiarism", confidence: 0.71, reason: "82% overlap with a public article; author is 2 days old." },
  },
  {
    target: "Comment on “Evals before prompts”",
    excerpt: "This is wrong and you should feel bad.",
    reports: 1,
    triage: { label: "rude", confidence: 0.54, reason: "Harsh tone, no slur or threat. Likely fine with a nudge." },
  },
];

export const mcpTools = [
  { name: "create_draft", text: "Creates a draft from Markdown. Never publishes." },
  { name: "list_drafts", text: "Lists your drafts with their status and dates." },
  { name: "update_draft", text: "Replaces a draft’s title, body or topic." },
  { name: "suggest_schedule", text: "Proposes a publish time; you confirm it here." },
];

export const mcpTokens = [
  { name: "Claude Code — laptop", created: "Oct 12", lastUsed: "2h ago" },
  { name: "Cursor", created: "Sep 30", lastUsed: "12d ago" },
];

export const suggestions = [
  { kind: "Clarity", before: "It is basically kind of like a cache but not really.", after: "It behaves like a cache for reads, but never for writes." },
  { kind: "Code", before: "```js — the snippet uses TypeScript syntax", after: "Change the block’s language to ts." },
  { kind: "Subtitle", before: "(empty)", after: "Why request memoization isn’t the cache you think it is." },
  { kind: "Alt text", before: "(missing on the cover image)", after: "Diagram of four cache layers between the browser and the database." },
];
