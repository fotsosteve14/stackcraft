import { PACKAGE_MANAGERS, type PackageManager, type ProjectConfig } from "@stackcraft/core";

export const DEFAULT_CONFIG: ProjectConfig = {
  name: "my-app",
  description: "",
  packageManager: "npm",
  modules: [],
};

interface ParamsLike {
  get(key: string): string | null;
}

function asPackageManager(value: unknown): PackageManager {
  return PACKAGE_MANAGERS.includes(value as PackageManager) ? (value as PackageManager) : DEFAULT_CONFIG.packageManager;
}

/** Reads a config from URL params: ?name=my-app&description=…&pm=pnpm&modules=tailwind,prisma */
export function configFromParams(params: ParamsLike): ProjectConfig {
  return {
    name: params.get("name") ?? DEFAULT_CONFIG.name,
    description: params.get("description") ?? DEFAULT_CONFIG.description,
    packageManager: asPackageManager(params.get("pm")),
    modules: (params.get("modules") ?? "").split(",").filter(Boolean),
  };
}

export function configToParams(config: ProjectConfig): URLSearchParams {
  const params = new URLSearchParams({ name: config.name, pm: config.packageManager });
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
    packageManager: asPackageManager(value.packageManager),
    modules: Array.isArray(value.modules) ? value.modules.filter((m): m is string => typeof m === "string") : [],
  };
}
