import type { StackModule } from "../types";

export const zod: StackModule = {
  id: "zod",
  name: "Zod",
  description: "TypeScript-first schema validation, with a typed environment loader.",
  category: "state",
  homepage: "https://zod.dev",
  apply(project) {
    project.addDependency("zod");

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
