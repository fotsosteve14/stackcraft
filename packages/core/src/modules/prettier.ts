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

    const { framework } = project.config;
    const svelte = framework === "sveltekit";
    const tailwind = project.has("tailwind");
    if (svelte) project.addDevDependency("prettier-plugin-svelte");
    if (tailwind) project.addDevDependency("prettier-plugin-tailwindcss");
    // The Tailwind plugin must come last: it wraps the other plugins' parsers.
    const plugins = [...(svelte ? ["prettier-plugin-svelte"] : []), ...(tailwind ? ["prettier-plugin-tailwindcss"] : [])];
    const config = {
      plugins: plugins.length > 0 ? plugins : undefined,
      tailwindStylesheet: tailwind ? `./${project.paths.css}` : undefined,
      overrides: svelte ? [{ files: "*.svelte", options: { parser: "svelte" } }] : undefined,
    };
    project.addFile(".prettierrc.json", JSON.stringify(config, null, 2));

    const ignores =
      framework === "nextjs"
        ? ["node_modules", ".next", "out", "build", "coverage"]
        : framework === "sveltekit"
          ? ["node_modules", ".svelte-kit", "build", "coverage"]
          : ["node_modules", "dist", "coverage"];
    if (project.has("prisma")) ignores.push(project.paths.generated);
    if (project.has("drizzle")) ignores.push("drizzle");
    project.addFile(".prettierignore", ignores.join("\n"));
  },
};
