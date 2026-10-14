import type { StackModule } from "../types";

export const prettier: StackModule = {
  id: "prettier",
  name: "Prettier",
  description: "Opinionated code formatter (sorts Tailwind classes when Tailwind is selected).",
  category: "quality",
  homepage: "https://prettier.io",
  apply(project) {
    project
      .addDevDependency("prettier")
      .addScript("format", "prettier --write .")
      .addScript("format:check", "prettier --check .");

    const config: Record<string, unknown> = {};
    if (project.has("tailwind")) {
      project.addDevDependency("prettier-plugin-tailwindcss");
      config.plugins = ["prettier-plugin-tailwindcss"];
      config.tailwindStylesheet = `./${project.paths.app}/globals.css`;
    }
    project.addFile(".prettierrc.json", JSON.stringify(config, null, 2));

    const ignores = ["node_modules", ".next", "out", "build", "coverage"];
    if (project.has("prisma")) ignores.push(project.paths.generated);
    if (project.has("drizzle")) ignores.push("drizzle");
    project.addFile(".prettierignore", ignores.join("\n"));
  },
};
