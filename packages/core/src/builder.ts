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
  readonly readmeSections: ReadmeSection[] = [];
  /** Where each kind of file goes, according to the chosen architecture. */
  readonly paths: ProjectPaths;

  constructor(
    readonly config: ProjectConfig,
    private readonly moduleIds: ReadonlySet<string>,
  ) {
    const architecture = getArchitecture(config.architecture);
    if (!architecture) throw new Error(`Unknown architecture "${config.architecture}"`);
    this.paths = architecture.paths;
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
