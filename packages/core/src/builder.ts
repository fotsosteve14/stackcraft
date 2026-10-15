import { getArchitecture, type ProjectPaths } from "./architectures";
import type { EnvVar, ProjectConfig } from "./types";
import { VERSIONS, type KnownPackage } from "./versions";

export interface ReadmeSection {
  title: string;
  body: string;
}

/**
 * Mutable project model that modules write into.
 * The base template renders the shared files (package.json, README, .env.example…)
 * from this model once every module has been applied.
 */
export class ProjectBuilder {
  readonly files = new Map<string, string>();
  readonly dependencies: Record<string, string> = {};
  readonly devDependencies: Record<string, string> = {};
  readonly scripts: Record<string, string> = {};
  readonly env: EnvVar[] = [];
  readonly gitignore: string[] = [];
  /** next.config.ts entries: key → TypeScript expression. */
  readonly nextConfig: Record<string, string> = {};
  /** vite.config.ts: import lines, plugin calls and extra top-level entries (key → expression). */
  readonly vite = { imports: [] as string[], plugins: [] as string[], config: {} as Record<string, string> };
  /** Vite only: components rendered on the home page (SPAs have no file-based routes). */
  readonly homeSections: { importLine: string; element: string }[] = [];
  readonly readmeSections: ReadmeSection[] = [];
  /** Where each kind of file goes, according to the chosen architecture. */
  readonly paths: ProjectPaths;

  constructor(
    readonly config: ProjectConfig,
    private readonly moduleIds: ReadonlySet<string>,
  ) {
    const architecture = getArchitecture(config.architecture);
    if (!architecture) throw new Error(`Unknown architecture "${config.architecture}"`);
    this.paths = architecture.paths[config.framework];
  }

  /** '"use client";' + blank line for Next.js Client Components, nothing for client-only frameworks. */
  get useClient(): string {
    return this.config.framework === "nextjs" ? '"use client";\n\n' : "";
  }

  /** Font stacks: Geist via next/font with Next.js, system fonts elsewhere. */
  get fonts(): { sans: string; mono: string } {
    return this.config.framework === "nextjs"
      ? { sans: "var(--font-geist-sans), Arial, Helvetica, sans-serif", mono: "var(--font-geist-mono), monospace" }
      : { sans: "ui-sans-serif, system-ui, sans-serif", mono: "ui-monospace, SFMono-Regular, Menlo, monospace" };
  }

  /** Writes the example feature of the chosen architecture, if it has one. */
  applyArchitectureExample(): void {
    getArchitecture(this.config.architecture)!.applyExample?.(this);
  }

  addVitePlugin(importLine: string, call: string): this {
    if (!this.vite.imports.includes(importLine)) this.vite.imports.push(importLine);
    this.vite.plugins.push(call);
    return this;
  }

  setViteConfig(key: string, expression: string): this {
    this.vite.config[key] = expression;
    return this;
  }

  addHomeSection(importLine: string, element: string): this {
    this.homeSections.push({ importLine, element });
    return this;
  }

  /** Import specifier for a project file or folder: "src/shared/lib/utils.ts" → "@/shared/lib/utils". */
  importPath(path: string): string {
    const { srcDir } = this.paths;
    const relative = srcDir && path.startsWith(srcDir) ? path.slice(srcDir.length) : path;
    return `@/${relative.replace(/(\/index)?\.(tsx?|mts)$/, "")}`;
  }

  /** Whether a module is part of the project. */
  has(moduleId: string): boolean {
    return this.moduleIds.has(moduleId);
  }

  addFile(path: string, content: string): this {
    this.files.set(path, content.endsWith("\n") ? content : `${content}\n`);
    return this;
  }

  editFile(path: string, edit: (content: string) => string): this {
    const current = this.files.get(path);
    if (current === undefined) throw new Error(`Cannot edit missing file: ${path}`);
    return this.addFile(path, edit(current));
  }

  addDependency(...names: KnownPackage[]): this {
    for (const name of names) this.dependencies[name] = VERSIONS[name];
    return this;
  }

  addDevDependency(...names: KnownPackage[]): this {
    for (const name of names) this.devDependencies[name] = VERSIONS[name];
    return this;
  }

  addScript(name: string, command: string): this {
    this.scripts[name] = command;
    return this;
  }

  addEnv(variable: EnvVar): this {
    if (!this.env.some((e) => e.key === variable.key)) this.env.push(variable);
    return this;
  }

  addGitignore(title: string, ...patterns: string[]): this {
    this.gitignore.push("", `# ${title}`, ...patterns);
    return this;
  }

  setNextConfig(key: string, expression: string): this {
    this.nextConfig[key] = expression;
    return this;
  }

  addReadmeSection(title: string, body: string): this {
    this.readmeSections.push({ title, body: body.trim() });
    return this;
  }

  /** Command that runs a package.json script with the chosen package manager. */
  run(script: string): string {
    switch (this.config.packageManager) {
      case "npm":
        return `npm run ${script}`;
      case "bun":
        return `bun run ${script}`;
      default:
        return `${this.config.packageManager} ${script}`;
    }
  }

  /** Command that runs a package binary (npx / pnpm exec / yarn / bunx). */
  exec(binary: string): string {
    switch (this.config.packageManager) {
      case "npm":
        return `npx ${binary}`;
      case "pnpm":
        return `pnpm exec ${binary}`;
      case "yarn":
        return `yarn ${binary}`;
      case "bun":
        return `bunx ${binary}`;
    }
  }

  installCommand(): string {
    return `${this.config.packageManager} install`;
  }
}
