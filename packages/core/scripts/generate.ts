/**
 * Generates a project on disk, handy to try modules locally.
 *
 *   npm run generate -- --name my-app --modules tailwind,shadcn,prisma --pm npm --out ../../tmp
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { generateProject, type PackageManager } from "../src";

const { values } = parseArgs({
  options: {
    name: { type: "string", default: "my-app" },
    description: { type: "string", default: "" },
    modules: { type: "string", default: "" },
    pm: { type: "string", default: "npm" },
    out: { type: "string", default: "." },
  },
});

const project = await generateProject({
  name: values.name,
  description: values.description,
  packageManager: values.pm as PackageManager,
  modules: values.modules.split(",").filter(Boolean),
});

const root = resolve(values.out, values.name);
for (const [path, content] of Object.entries(project.files)) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
console.log(`Generated ${Object.keys(project.files).length} files in ${root}`);
console.log(`Modules: ${project.modules.join(", ") || "(none)"}`);
