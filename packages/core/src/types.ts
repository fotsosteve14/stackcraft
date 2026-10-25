import type { ArchitectureId } from "./architectures";
import type { ProjectBuilder } from "./builder";
import type { ThemeConfig } from "./theme";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export const PACKAGE_MANAGERS: readonly PackageManager[] = ["npm", "pnpm", "yarn", "bun"];

export type FrameworkId = "nextjs" | "vite-react" | "sveltekit";

export interface ProjectConfig {
  /** npm package name, also used as the root folder name. */
  name: string;
  description: string;
  framework: FrameworkId;
  packageManager: PackageManager;
  /** Folder organization of the generated code. */
  architecture: ArchitectureId;
  /** Ids of the selected modules. Required modules are added automatically. */
  modules: string[];
  /** Custom colors for light and dark mode, with a mode switch. Omitted keeps the framework defaults. */
  theme?: ThemeConfig;
}

export type ModuleCategory =
  | "ui"
  | "database"
  | "auth"
  | "state"
  | "performance"
  | "3d"
  | "quality"
  | "testing"
  | "deployment"
  | "ai";

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
  /** Frameworks the module supports. Omitted means every framework. */
  frameworks?: FrameworkId[];
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
