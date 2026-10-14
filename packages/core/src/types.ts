import type { ProjectBuilder } from "./builder";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

export interface ProjectConfig {
  /** npm package name, also used as the root folder name. */
  name: string;
  description: string;
  packageManager: PackageManager;
  /** Ids of the selected modules. Required modules are added automatically. */
  modules: string[];
}

export type ModuleCategory = "ui" | "database" | "auth" | "quality" | "testing" | "state" | "deployment";

export interface StackModule {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  homepage: string;
  /** Modules that must also be selected (added automatically). */
  requires?: string[];
  /** Modules that cannot be selected together with this one. */
  conflicts?: string[];
  apply(project: ProjectBuilder): void;
}

export interface EnvVar {
  key: string;
  value: string;
  comment?: string;
}

export interface GeneratedProject {
  config: ProjectConfig;
  /** Final, ordered list of module ids (including auto-added requirements). */
  modules: string[];
  /** File path (relative to the project root) → content. Sorted by path. */
  files: Record<string, string>;
}
