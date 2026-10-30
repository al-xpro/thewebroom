// Limits for agents connected through the MCP server (/api/mcp). Shared by Convex, the
// MCP endpoint and the pages that explain them, so the numbers never disagree.
export const AGENT_LIMITS = {
  // Active tokens per account.
  tokensPerAccount: 3,
  // A token stops working this long after it was created.
  tokenLifetimeDays: 90,
  // Calls to the MCP server, per token.
  requestsPerHour: 120,
  // New drafts written by agents, per account.
  draftsPerDay: 10,
  // Changes to existing drafts by agents, per account.
  draftUpdatesPerDay: 60,
  titleMin: 6,
  titleMax: 50,
  subtitleMin: 20,
  subtitleMax: 80,
  // The same body length a person gets in the editor.
  bodyMin: 5000,
  bodyMax: 30000,
} as const;
