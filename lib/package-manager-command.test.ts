import { describe, expect, test } from "vitest";
import { convertCommands } from "./package-manager-command";

describe("convertCommands", () => {
  test.each([
    ["npm install", "pnpm", "pnpm install"],
    ["npm install -D vitest", "yarn", "yarn add -D vitest"],
    ["npm install react", "bun", "bun add react"],
    ["npm run dev", "pnpm", "pnpm dev"],
    ["cd app && git status", "pnpm", "cd app && git status"],
  ])("%j → %s: %j", (command, to, expected) => {
    expect(convertCommands(command, "npm", to as "pnpm" | "yarn" | "bun")).toBe(expected);
  });
});
