/**
 * Generates a project on disk, handy to try modules locally.
 *
 *   npm run generate -- --name my-app --modules tailwind,shadcn,prisma --pm npm --arch feature --out ../../tmp
 *   --theme accepts a preset (neutral, orange, bref) or the encoded colors of a shared link.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { decodeTheme, generateProject, type ArchitectureId, type FrameworkId, type PackageManager } from "../src";

const { values } = parseArgs({
  options: {
    name: { type: "string", default: "my-app" },
    description: { type: "string", default: "" },
    modules: { type: "string", default: "" },
    pm: { type: "string", default: "npm" },
    arch: { type: "string", default: "simple" },
    framework: { type: "string", default: "nextjs" },
    theme: { type: "string" },
    out: { type: "string", default: "." },
  },
});

const theme = values.theme ? decodeTheme(values.theme) : undefined;
if (values.theme && !theme) throw new Error(`Unknown theme "${values.theme}".`);

const project = await generateProject({
  name: values.name,
  description: values.description,
  packageManager: values.pm as PackageManager,
  architecture: values.arch as ArchitectureId,
  framework: values.framework as FrameworkId,
  modules: values.modules.split(",").filter(Boolean),
  theme,
});

const root = resolve(values.out, values.name);
for (const [path, content] of Object.entries(project.files)) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
}
console.log(`Generated ${Object.keys(project.files).length} files in ${root}`);
console.log(`Modules: ${project.modules.join(", ") || "(none)"}`);
