import type { StackModule } from "../types";

export const zod: StackModule = {
  id: "zod",
  name: "Zod",
  description: "TypeScript-first schema validation, with a typed environment loader.",
  category: "state",
  homepage: "https://zod.dev",
  apply(project) {
    project.addDependency("zod");

    if (project.config.framework === "sveltekit") {
      // $lib/server cannot be imported from client code: SvelteKit fails the build if it is.
      project.addFile(
        "src/lib/server/env.ts",
        `import { env as privateEnv } from "$env/dynamic/private";
import { z } from "zod";

/**
 * Validated server-side environment variables. Variables prefixed with PUBLIC_ are
 * readable in the browser through $env/dynamic/public: never put secrets in those.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // DATABASE_URL: z.url(),
});

export const env = envSchema.parse(privateEnv);
`,
      );
      return;
    }

    if (project.config.framework !== "nextjs") {
      project.addFile(
        `${project.paths.lib}/env.ts`,
        `import { z } from "zod";

/**
 * Validated environment variables. Vite only exposes variables prefixed with VITE_ to the
 * browser, and everything here ends up in the bundle: never put secrets in it.
 */
const envSchema = z.object({
  MODE: z.string(),
  // VITE_API_URL: z.url(),
});

export const env = envSchema.parse(import.meta.env);
`,
      );
      return;
    }

    // Runs after the modules that declare environment variables (see registry order).
    const fields = project.env.map((v) => `  ${v.key}: z.string().min(1),`);
    project.addFile(
      `${project.paths.lib}/env.ts`,
      `import { z } from "zod";

/** Validated server-side environment variables. Add yours to the schema. */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
${fields.join("\n")}
});

export const env = envSchema.parse(process.env);
`.replace("\n\n});", "\n});"),
    );
  },
};
