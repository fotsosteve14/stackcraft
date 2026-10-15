import {
  getArchitecture,
  getFramework,
  PACKAGE_MANAGERS,
  type ArchitectureId,
  type FrameworkId,
  type PackageManager,
  type ProjectConfig,
} from "@stackcraft/core";

export const DEFAULT_CONFIG: ProjectConfig = {
  name: "my-app",
  description: "",
  framework: "nextjs",
  packageManager: "npm",
  architecture: "simple",
  modules: [],
};

interface ParamsLike {
  get(key: string): string | null;
}

function asPackageManager(value: unknown): PackageManager {
  return PACKAGE_MANAGERS.includes(value as PackageManager) ? (value as PackageManager) : DEFAULT_CONFIG.packageManager;
}

function asArchitecture(value: unknown): ArchitectureId {
  return typeof value === "string" && getArchitecture(value) ? (value as ArchitectureId) : DEFAULT_CONFIG.architecture;
}

function asFramework(value: unknown): FrameworkId {
  return typeof value === "string" && getFramework(value) ? (value as FrameworkId) : DEFAULT_CONFIG.framework;
}

/** Reads a config from URL params: ?name=my-app&fw=vite-react&pm=pnpm&arch=feature&modules=tailwind,zod */
export function configFromParams(params: ParamsLike): ProjectConfig {
  return {
    name: params.get("name") ?? DEFAULT_CONFIG.name,
    description: params.get("description") ?? DEFAULT_CONFIG.description,
    framework: asFramework(params.get("fw")),
    packageManager: asPackageManager(params.get("pm")),
    architecture: asArchitecture(params.get("arch")),
    modules: (params.get("modules") ?? "").split(",").filter(Boolean),
  };
}

export function configToParams(config: ProjectConfig): URLSearchParams {
  const params = new URLSearchParams({
    name: config.name,
    fw: config.framework,
    pm: config.packageManager,
    arch: config.architecture,
  });
  if (config.description) params.set("description", config.description);
  if (config.modules.length > 0) params.set("modules", config.modules.join(","));
  return params;
}

/** Coerces an untrusted JSON body into a config (validation happens in the core). */
export function configFromJson(body: unknown): ProjectConfig {
  const value = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  return {
    name: typeof value.name === "string" ? value.name : DEFAULT_CONFIG.name,
    description: typeof value.description === "string" ? value.description : "",
    framework: asFramework(value.framework),
    packageManager: asPackageManager(value.packageManager),
    architecture: asArchitecture(value.architecture),
    modules: Array.isArray(value.modules) ? value.modules.filter((m): m is string => typeof m === "string") : [],
  };
}
