export { ProjectBuilder } from "./builder";
export { generateProject, InvalidConfigError, resolveModules, validateConfig } from "./generate";
export type { ResolvedModules } from "./generate";
export { CATEGORIES, getModule, MODULES } from "./modules";
export { generateZip } from "./zip";
export { PACKAGE_MANAGERS } from "./types";
export type {
  EnvVar,
  GeneratedProject,
  ModuleCategory,
  PackageManager,
  ProjectConfig,
  StackModule,
} from "./types";
export { VERSIONS } from "./versions";
