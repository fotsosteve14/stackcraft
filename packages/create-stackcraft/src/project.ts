import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** True when the folder is missing or empty, so the project can be written there. */
export function isEmptyDir(dir: string): boolean {
  return !existsSync(dir) || readdirSync(dir).length === 0;
}

export function writeProject(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

const SHELL_SCRIPTS = new Set(["npm", "pnpm", "yarn"]);

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Runs a command without a shell (arguments are passed as-is). On Windows, npm, pnpm and yarn
 * are .cmd scripts, which Node only starts through a shell: for them the command line is built
 * here, with each argument quoted. Their arguments are fixed (install, --version).
 */
export function run(command: string, args: string[], cwd: string, inherit = false): Promise<RunResult> {
  const stdio = inherit ? "inherit" : "pipe";
  return new Promise((resolve) => {
    const child =
      process.platform === "win32" && SHELL_SCRIPTS.has(command)
        ? spawn([command, ...args.map(quoteWindows)].join(" "), { cwd, shell: true, stdio })
        : spawn(command, args, { cwd, stdio });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => resolve({ code: -1, stdout, stderr: error.message }));
    child.on("close", (code) => resolve({ code: code ?? -1, stdout, stderr }));
  });
}

export async function commandExists(command: string): Promise<boolean> {
  return (await run(command, ["--version"], process.cwd())).code === 0;
}

/** git init on main and a first commit. Returns an error message, or undefined on success. */
export async function initGit(root: string): Promise<string | undefined> {
  const steps: string[][] = [
    ["init", "--initial-branch=main"],
    ["add", "--all"],
    ["commit", "--message", "Initial commit from StackCraft"],
  ];
  for (const args of steps) {
    const result = await run("git", args, root);
    if (result.code !== 0) return (result.stderr || result.stdout).trim() || `git ${args[0]} failed.`;
  }
  return undefined;
}

export type GitHubStatus = "ready" | "missing" | "signed-out";

/** Whether the GitHub CLI is installed and signed in. */
export async function gitHubCliStatus(root: string): Promise<GitHubStatus> {
  if (!(await commandExists("gh"))) return "missing";
  return (await run("gh", ["auth", "status"], root)).code === 0 ? "ready" : "signed-out";
}

/**
 * Creates the repository on the signed-in account with the GitHub CLI and pushes main.
 * Returns the repository URL, or throws with gh's message.
 */
export async function publishToGitHub(
  root: string,
  name: string,
  visibility: "public" | "private",
  description: string,
): Promise<string> {
  const args = ["repo", "create", name, `--${visibility}`, "--source", ".", "--remote", "origin", "--push"];
  if (description) args.push("--description", description);
  const created = await run("gh", args, root);
  if (created.code !== 0) throw new Error((created.stderr || created.stdout).trim() || "gh repo create failed.");
  const view = await run("gh", ["repo", "view", "--json", "url", "--jq", ".url"], root);
  return view.stdout.trim() || created.stdout.trim();
}

/** Quotes an argument for cmd.exe when it contains spaces or special characters. */
function quoteWindows(arg: string): string {
  return /^[\w./:=@,+-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`;
}

/** Opens a URL in the default browser. Returns false when no browser could be started. */
export async function openUrl(url: string): Promise<boolean> {
  // rundll32 opens the URL as is: going through cmd's `start` would interpret % and &.
  const [command, ...args] =
    process.platform === "win32"
      ? ["rundll32", "url.dll,FileProtocolHandler", url]
      : process.platform === "darwin"
        ? ["open", url]
        : ["xdg-open", url];
  return (await run(command!, args, process.cwd())).code === 0;
}
