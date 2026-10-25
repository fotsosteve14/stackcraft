import { getArchitecture } from "./architectures";
import { ProjectBuilder } from "./builder";
import { formatFile } from "./format";
import { getFramework } from "./frameworks";
import { getModule, MODULES } from "./modules";
import { validateTheme } from "./theme";
import { PACKAGE_MANAGERS, type FrameworkId, type GeneratedProject, type ProjectConfig, type StackModule } from "./types";

export interface ResolvedModules {
  /** Ordered module ids, including requirements that were added automatically. */
  modules: string[];
  /** Ids added because another selected module requires them. */
  added: string[];
  errors: string[];
}

/** Whether a module can be used with a framework. */
export function supportsFramework(mod: StackModule, framework: FrameworkId): boolean {
  return !mod.frameworks || mod.frameworks.includes(framework);
}

/**
 * Expands requirements, checks conflicts (and framework support when `framework` is given)
 * and returns modules in application order.
 */
export function resolveModules(ids: readonly string[], framework?: FrameworkId): ResolvedModules {
  const errors: string[] = [];
  const selected = new Set<string>();
  const added: string[] = [];

  const visit = (id: string, requiredBy?: string) => {
    if (selected.has(id)) return;
    const mod = getModule(id);
    if (!mod) {
      errors.push(`Unknown module "${id}".`);
      return;
    }
    selected.add(id);
    if (requiredBy && !ids.includes(id)) added.push(id);
    for (const req of mod.requires ?? []) visit(req, id);
  };
  for (const id of ids) visit(id);

  for (const id of selected) {
    for (const other of getModule(id)?.conflicts ?? []) {
      // Report each pair once.
      if (selected.has(other) && id < other) {
        errors.push(`"${getModule(id)!.name}" cannot be used together with "${getModule(other)!.name}".`);
      }
    }
  }

  const frameworkName = framework && getFramework(framework)?.name;
  if (frameworkName) {
    for (const id of selected) {
      const mod = getModule(id)!;
      if (!supportsFramework(mod, framework!)) errors.push(`"${mod.name}" is not available for ${frameworkName}.`);
    }
  }

  const modules = MODULES.filter((m) => selected.has(m.id)).map((m) => m.id);
  return { modules, added, errors };
}

const NAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

/** Error message when the name is not a valid npm package and folder name, undefined otherwise. */
export function validateProjectName(name: string): string | undefined {
  if (NAME_PATTERN.test(name) && name.length <= 214) return undefined;
  return "Project name must be lowercase and contain only letters, digits, '-', '_' or '.' (e.g. my-app).";
}

export function validateConfig(config: ProjectConfig): string[] {
  const errors: string[] = [];
  const nameError = validateProjectName(config.name);
  if (nameError) errors.push(nameError);
  if (!getFramework(config.framework)) {
    errors.push(`Unknown framework "${config.framework}".`);
  }
  if (!getArchitecture(config.architecture)) {
    errors.push(`Unknown architecture "${config.architecture}".`);
  }
  if (!PACKAGE_MANAGERS.includes(config.packageManager)) {
    errors.push(`Unsupported package manager "${config.packageManager}".`);
  }
  errors.push(...resolveModules(config.modules, config.framework).errors);
  if (config.theme) errors.push(...validateTheme(config.theme));
  return errors;
}

export class InvalidConfigError extends Error {
  constructor(readonly errors: string[]) {
    super(errors.join("\n"));
    this.name = "InvalidConfigError";
  }
}

/** Applies the framework and every module to a project model, without formatting the files. */
export function buildProject(config: ProjectConfig): { project: ProjectBuilder; modules: string[] } {
  const errors = validateConfig(config);
  if (errors.length > 0) throw new InvalidConfigError(errors);

  const framework = getFramework(config.framework)!;
  const { modules } = resolveModules(config.modules, config.framework);
  const project = new ProjectBuilder(config, new Set(modules));

  framework.applyBase(project);
  for (const id of modules) getModule(id)!.apply(project);
  framework.finalize(project, modules);
  return { project, modules };
}

/** Generates every file of the project described by `config`, formatted with Prettier. */
export async function generateProject(config: ProjectConfig): Promise<GeneratedProject> {
  const { project, modules } = buildProject(config);

  const entries = [...project.files.entries()].sort(([a], [b]) => a.localeCompare(b));
  const formatted = await Promise.all(
    entries.map(async ([path, content]) => [path, await formatFile(path, content)] as const),
  );
  return { config, modules, files: Object.fromEntries(formatted) };
}
