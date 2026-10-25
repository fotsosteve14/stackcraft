import { parseArgs } from "node:util";

export const HELP = `Usage: npm create stackcraft@latest [name] [options]

Without options, every choice is asked interactively.

Options:
  --framework <id>     nextjs, vite-react or sveltekit
  --arch <id>          simple, feature or clean
  --modules <ids>      Comma-separated modules, e.g. tailwind,shadcn,vitest
  --theme <id>         Color theme: a preset (neutral, bref…) or "none"
  --pm <name>          npm, pnpm, yarn or bun (default: the one running this command)
  --description <text> Project description
  --github <mode>      Publish to GitHub: public, private or no
  --no-install         Do not install dependencies
  -y, --yes            Accept the defaults for every question not given as an option
  -h, --help           Show this help
  -v, --version        Show the version`;

export interface CliArgs {
  name?: string;
  framework?: string;
  architecture?: string;
  modules?: string[];
  theme?: string;
  packageManager?: string;
  description?: string;
  github?: "public" | "private" | "no";
  install: boolean;
  yes: boolean;
  help: boolean;
  version: boolean;
}

export function parseCliArgs(argv: string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    options: {
      framework: { type: "string" },
      arch: { type: "string" },
      modules: { type: "string" },
      theme: { type: "string" },
      pm: { type: "string" },
      description: { type: "string" },
      github: { type: "string" },
      install: { type: "boolean", default: true },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  const github = values.github;
  if (github !== undefined && github !== "public" && github !== "private" && github !== "no") {
    throw new Error(`--github must be public, private or no (got "${github}").`);
  }

  return {
    name: positionals[0],
    framework: values.framework,
    architecture: values.arch,
    modules: values.modules?.split(",").map((m) => m.trim()).filter(Boolean),
    theme: values.theme,
    packageManager: values.pm,
    description: values.description,
    github,
    install: values.install,
    yes: values.yes,
    help: values.help,
    version: values.version,
  };
}

/** The package manager running `npm create` / `pnpm create`…, from npm_config_user_agent. */
export function detectPackageManager(userAgent = process.env.npm_config_user_agent ?? ""): "npm" | "pnpm" | "yarn" | "bun" {
  const name = userAgent.split("/")[0];
  return name === "pnpm" || name === "yarn" || name === "bun" ? name : "npm";
}
