// Converts terminal commands between npm, pnpm, yarn and bun, so a terminal block is
// written once and its other tabs follow (#104). Lines it doesn't recognise (cd, git,
// comments, unknown subcommands) are returned unchanged.

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

type Intent =
  | { kind: "install"; frozen: boolean }
  | { kind: "add"; packages: string[]; dev: boolean; global: boolean; exact: boolean; rest: string[] }
  | { kind: "remove"; packages: string[]; global: boolean; rest: string[] }
  | { kind: "run"; script: string; args: string[] }
  | { kind: "exec"; args: string[] }
  | { kind: "create"; args: string[] }
  | { kind: "update"; packages: string[] };

const DEV_FLAGS = new Set(["-D", "-d", "--save-dev", "--dev"]);
const GLOBAL_FLAGS = new Set(["-g", "--global"]);
const EXACT_FLAGS = new Set(["-E", "--save-exact", "--exact"]);
const FROZEN_FLAGS = new Set(["--frozen-lockfile", "--immutable"]);

// npm's built-in scripts; for the others, `<pm> <name>` runs a script of that name.
const NPM_SCRIPT_SHORTCUTS = new Set(["test", "start", "stop", "restart"]);

function tokenize(command: string): string[] {
  return command.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
}

function splitFlags(tokens: string[]) {
  const packages: string[] = [];
  const rest: string[] = [];
  let dev = false;
  let global = false;
  let exact = false;
  for (const token of tokens) {
    if (DEV_FLAGS.has(token)) dev = true;
    else if (GLOBAL_FLAGS.has(token)) global = true;
    else if (EXACT_FLAGS.has(token)) exact = true;
    else if (token.startsWith("-")) rest.push(token);
    else packages.push(token);
  }
  return { packages, rest, dev, global, exact };
}

// Arguments after an npm `--` separator belong to the script or initializer.
function dropSeparator(args: string[]) {
  return args.filter((arg) => arg !== "--");
}

function parse(tokens: string[], from: PackageManager): Intent | null {
  const [head, sub, ...rest] = tokens;
  const args = tokens.slice(1);

  if (head === "npx" || head === "bunx") return { kind: "exec", args };
  if (head !== from) return null;

  if (sub === undefined) return from === "yarn" ? { kind: "install", frozen: false } : null;

  switch (sub) {
    case "install":
    case "i":
    case "add":
    case "a": {
      const flags = splitFlags(rest);
      if (flags.packages.length === 0) {
        return { kind: "install", frozen: rest.some((flag) => FROZEN_FLAGS.has(flag)) };
      }
      return { kind: "add", ...flags };
    }
    case "ci":
      return from === "npm" ? { kind: "install", frozen: true } : null;
    case "uninstall":
    case "un":
    case "remove":
    case "rm": {
      const { packages, global, rest: flags } = splitFlags(rest);
      return { kind: "remove", packages, global, rest: flags };
    }
    case "run":
    case "run-script":
      return rest[0] ? { kind: "run", script: rest[0], args: dropSeparator(rest.slice(1)) } : null;
    case "exec":
      return from === "npm" ? { kind: "exec", args: dropSeparator(rest) } : null;
    case "dlx":
    case "x":
      return { kind: "exec", args: rest };
    case "create":
      return { kind: "create", args: dropSeparator(rest) };
    case "init":
      return from === "npm" && rest[0] && !rest[0].startsWith("-")
        ? { kind: "create", args: dropSeparator(rest) }
        : null;
    case "update":
    case "up":
    case "upgrade":
      return { kind: "update", packages: rest };
    case "global":
      // yarn classic: `yarn global add <pkg>`
      if (from === "yarn" && rest[0] === "add") {
        return { kind: "add", ...splitFlags(rest.slice(1)), global: true };
      }
      return null;
    default:
      if (from === "npm") {
        return NPM_SCRIPT_SHORTCUTS.has(sub) ? { kind: "run", script: sub, args: dropSeparator(rest) } : null;
      }
      // pnpm, yarn and bun run a script by name; bun only for its own scripts via `run`.
      if (from === "bun") return null;
      return sub.startsWith("-") ? null : { kind: "run", script: sub, args: rest };
  }
}

function join(...parts: (string | false | undefined | string[])[]) {
  return parts.flat().filter(Boolean).join(" ");
}

// npm passes flags to scripts and initializers only after `--`.
function npmPassThrough(args: string[]) {
  const firstFlag = args.findIndex((arg) => arg.startsWith("-"));
  if (firstFlag === -1) return args;
  return [...args.slice(0, firstFlag), "--", ...args.slice(firstFlag)];
}

function print(intent: Intent, to: PackageManager): string {
  switch (intent.kind) {
    case "install":
      if (intent.frozen) {
        return { npm: "npm ci", pnpm: "pnpm install --frozen-lockfile", yarn: "yarn install --frozen-lockfile", bun: "bun install --frozen-lockfile" }[to];
      }
      return `${to} install`;
    case "add": {
      const { packages, dev, global, exact, rest } = intent;
      const devFlag = dev && { npm: "-D", pnpm: "-D", yarn: "-D", bun: "-d" }[to];
      const exactFlag = exact && { npm: "-E", pnpm: "-E", yarn: "-E", bun: "--exact" }[to];
      if (to === "yarn" && global) return join("yarn global add", devFlag, exactFlag, packages, rest);
      const verb = to === "npm" ? "install" : "add";
      return join(to, verb, devFlag, exactFlag, global && "-g", packages, rest);
    }
    case "remove": {
      if (to === "yarn" && intent.global) return join("yarn global remove", intent.packages, intent.rest);
      const verb = to === "npm" ? "uninstall" : "remove";
      return join(to, verb, intent.global && "-g", intent.packages, intent.rest);
    }
    case "run":
      if (to === "npm") {
        return NPM_SCRIPT_SHORTCUTS.has(intent.script) && intent.script !== "stop" && intent.script !== "restart"
          ? join("npm", intent.script, npmPassThrough(intent.args))
          : join("npm run", intent.script, npmPassThrough(intent.args));
      }
      // `bun test` is bun's own test runner, so scripts always go through `bun run`.
      return to === "bun" ? join("bun run", intent.script, intent.args) : join(to, intent.script, intent.args);
    case "exec":
      return join({ npm: "npx", pnpm: "pnpm dlx", yarn: "yarn dlx", bun: "bunx" }[to], intent.args);
    case "create":
      return to === "npm"
        ? join("npm create", npmPassThrough(intent.args))
        : join(to, "create", intent.args);
    case "update":
      return join(to, to === "yarn" ? "upgrade" : "update", intent.packages);
  }
}

export function convertCommandLine(line: string, from: PackageManager, to: PackageManager): string {
  if (from === to) return line;
  const indent = line.match(/^\s*/)?.[0] ?? "";
  const body = line.slice(indent.length);
  // A prompt like "$ " stays in front of the converted command.
  const prompt = body.match(/^\$\s+/)?.[0] ?? "";
  const command = body.slice(prompt.length);
  if (!command || command.startsWith("#")) return line;

  const intent = parse(tokenize(command), from);
  return intent ? indent + prompt + print(intent, to) : line;
}

export function convertCommands(text: string, from: PackageManager, to: PackageManager): string {
  return text
    .split("\n")
    .map((line) => convertCommandLine(line, from, to))
    .join("\n");
}
