import { getArchitecture } from "../architectures";
import type { ProjectBuilder } from "../builder";
import type { Framework } from "./index";
import { brefPalette } from "../theme";
import { applyThemeFiles, finalizeCommon, plainCss, themeScriptTag, themeTogglePath } from "./shared";

// Same TypeScript as the Vite + React base; bref-ui and svelte-check 4.6 are tested with it.
const TYPESCRIPT = "~6.0.2";

/** Plugins that must run after sveltekit() in vite.config.ts. */
const AFTER_SVELTEKIT = ["svelteTesting()"];

export const sveltekit: Framework = {
  id: "sveltekit",
  name: "SvelteKit",
  description: "Full-stack Svelte 5 with file-based routing, server-side rendering and load functions.",
  homepage: "https://svelte.dev/docs/kit",
  stackNote: "with Svelte 5 (runes) and TypeScript",
  devUrl: "http://localhost:5173",
  packageType: "module",

  applyBase(project) {
    project
      .addDevDependency("@sveltejs/kit", "@sveltejs/vite-plugin-svelte", "svelte", "svelte-check", "vite")
      .addScript("dev", "vite dev")
      .addScript("build", "vite build")
      .addScript("preview", "vite preview")
      // Generates ./.svelte-kit/tsconfig.json, which tsconfig.json extends.
      .addScript("prepare", "svelte-kit sync || echo ''")
      .addScript("typecheck", "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json");
    project.devDependencies.typescript = TYPESCRIPT;

    // Like `sv create`: SvelteKit writes the paths, the $lib alias and the includes.
    project.addFile(
      "tsconfig.json",
      JSON.stringify(
        {
          extends: "./.svelte-kit/tsconfig.json",
          compilerOptions: {
            rewriteRelativeImportExtensions: true,
            allowJs: true,
            checkJs: true,
            esModuleInterop: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            skipLibCheck: true,
            sourceMap: true,
            strict: true,
            moduleResolution: "bundler",
          },
        },
        null,
        2,
      ),
    );

    project.addFile(
      "src/app.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link
      rel="icon"
      type="image/svg+xml"
      href="%sveltekit.assets%/favicon.svg"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />${project.config.theme ? themeScriptTag("    ") : ""}
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
`,
    );

    project.addFile(
      "src/app.d.ts",
      `// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
`,
    );

    project.addFile(
      "static/favicon.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path d="M9 21l7-11 7 11z" fill="#fff"/></svg>`,
    );

    project.addFile(project.paths.css, plainCss(project));

    project.addGitignore("dependencies", "node_modules");
    project.addGitignore("output", ".output", ".vercel", ".netlify", ".wrangler", "/.svelte-kit", "/build");
    project.addGitignore("testing", "coverage");
    project.addGitignore("os", ".DS_Store", "Thumbs.db");
    project.addGitignore("env files", ".env*", "!.env.example");
    project.addGitignore("vite", "vite.config.js.timestamp-*", "vite.config.ts.timestamp-*");
  },

  finalize(project, moduleIds) {
    project.applyArchitectureExample();

    // adapter-auto picks the right output on Vercel, Netlify or Cloudflare; Docker needs a Node server.
    const adapter = project.has("docker") ? "@sveltejs/adapter-node" : "@sveltejs/adapter-auto";
    project.addDevDependency(adapter);
    project.addFile("svelte.config.js", renderSvelteConfig(adapter));
    project.addFile("vite.config.ts", renderViteConfig(project));
    project.addFile(`${project.paths.app}/+layout.svelte`, renderLayout(project));
    project.addFile(`${project.paths.app}/+page.svelte`, renderPage(project));
    applyThemeFiles(project);
    finalizeCommon(project, this, moduleIds);
  },
};

/** Escapes text for Svelte markup, where braces start expressions. */
function escapeSvelte(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/{/g, "&#123;")
    .replace(/}/g, "&#125;");
}

function renderSvelteConfig(adapter: string): string {
  return `import adapter from "${adapter}";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    // Force runes mode for the project, except for libraries. Can be removed in Svelte 6.
    runes: ({ filename }) => (filename.split(/[/\\\\]/).includes("node_modules") ? undefined : true),
  },
  kit: {
    // See https://svelte.dev/docs/kit/adapters to deploy elsewhere.
    adapter: adapter(),
  },
};

export default config;
`;
}

function renderViteConfig(project: ProjectBuilder): string {
  const { imports, plugins, config } = project.vite;
  const before = plugins.filter((p) => !AFTER_SVELTEKIT.includes(p));
  const after = plugins.filter((p) => AFTER_SVELTEKIT.includes(p));
  const allImports = ['import { sveltekit } from "@sveltejs/kit/vite";', 'import { defineConfig } from "vite";', ...imports];
  const extra = Object.entries(config).map(([key, value]) => `  ${key}: ${value},`);

  return `${project.has("vitest") ? '/// <reference types="vitest/config" />\n' : ""}${allImports.join("\n")}

// https://vite.dev/config/
export default defineConfig({
  plugins: [${[...before, "sveltekit()", ...after].join(", ")}],
${extra.join("\n")}
});
`;
}

function renderLayout(project: ProjectBuilder): string {
  const { name, description, theme } = project.config;
  const bref = project.has("bref-ui");
  const meta = description ? `\n  <meta name="description" content="${escapeSvelte(description)}" />` : "";
  const imports = [
    'import "../app.css";',
    ...(bref ? ['import { Theme } from "bref-ui";'] : []),
    ...(theme ? [`import ThemeToggle from "${project.importPath(themeTogglePath(project))}";`] : []),
  ];
  // Written inline so the colors are checked against bref-ui's hex palette type.
  const palette = theme ? ` palette={${JSON.stringify(brefPalette(theme))}}` : "";
  const brefTheme = bref ? `\n<!-- Palette, reset and fonts of bref-ui components. -->\n<Theme${palette} />\n` : "";

  return `<script lang="ts">
  ${imports.join("\n  ")}

  let { children } = $props();
</script>

<svelte:head>
  <title>${escapeSvelte(name)}</title>${meta}
</svelte:head>
${brefTheme}${theme ? "\n<ThemeToggle />\n" : ""}
{@render children()}
`;
}

/** Home page: title, description, the bref-ui button and a link to the example feature. */
function renderPage(project: ProjectBuilder): string {
  const { name, description } = project.config;
  const editPath = `${project.paths.app}/+page.svelte`;
  const hasExample = !!getArchitecture(project.config.architecture)!.applyExample;
  const bref = project.has("bref-ui");
  const tw = project.has("tailwind");
  const title = escapeSvelte(name);
  const subtitle = description ? escapeSvelte(description) : "Your project is ready.";
  const muted = project.mutedTextClass;

  // Internal links go through resolve() so they keep working under a base path.
  const imports = [
    ...(hasExample ? ['import { resolve } from "$app/paths";'] : []),
    ...(bref ? ['import { Button } from "bref-ui";'] : []),
  ];
  const script = imports.length > 0 ? `<script lang="ts">\n  ${imports.join("\n  ")}\n</script>\n\n` : "";
  const button = bref
    ? `
  <Button
    label="Browse components"
    href="https://feuersteiner.github.io/bref-ui/"
    target="_blank"
    rel="noopener noreferrer"
  />`
    : "";

  if (!tw) {
    const link = hasExample ? `\n  <p>\n    <a href={resolve("/users")}>See the example feature</a>\n  </p>` : "";
    return `${script}<main class="page">
  <h1>${title}</h1>
  <p>${subtitle}</p>${button}
  <p>
    Edit <code>${editPath}</code> to get started.
  </p>${link}
</main>
`;
  }

  const link = hasExample
    ? `\n  <a href={resolve("/users")} class="text-sm font-medium underline underline-offset-4">See the example feature</a>`
    : "";
  return `${script}<main class="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
  <h1 class="text-4xl font-bold tracking-tight">${title}</h1>
  <p class="max-w-md text-lg ${muted}">${subtitle}</p>${button}
  <p class="text-sm ${muted}">
    Edit <code class="font-mono">${editPath}</code> to get started.
  </p>${link}
</main>
`;
}
