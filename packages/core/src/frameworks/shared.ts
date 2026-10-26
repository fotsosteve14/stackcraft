import { getArchitecture } from "../architectures";
import type { ProjectBuilder } from "../builder";
import { MODULES } from "../modules";
import {
  reactThemeToggle,
  svelteThemeToggle,
  THEME_SCRIPT,
  THEME_TOGGLE_CSS,
  themeReadme,
  themeVariablesCss,
} from "../theme";
import type { Framework } from "./index";

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

/** Files every framework shares, rendered once all modules have been applied. */
export function finalizeCommon(project: ProjectBuilder, framework: Framework, moduleIds: string[]): void {
  const { config } = project;

  project.addFile(
    "package.json",
    JSON.stringify(
      {
        name: config.name,
        version: "0.1.0",
        description: config.description || undefined,
        private: true,
        type: framework.packageType,
        scripts: project.scripts,
        dependencies: sortKeys(project.dependencies),
        devDependencies: sortKeys(project.devDependencies),
        ...renderOverrides(project),
      },
      null,
      2,
    ),
  );

  project.addFile(".gitignore", project.gitignore.join("\n").trimStart());
  project.addFile("README.md", renderReadme(project, framework, moduleIds));

  if (project.env.length > 0) {
    const lines = project.env.flatMap((v) => [
      ...(v.comment ? [`# ${v.comment}`] : []),
      `${v.key}=${JSON.stringify(v.value)}`,
      "",
    ]);
    project.addFile(".env.example", lines.join("\n").trimEnd());
  }

  if (project.hasPnpmWorkspace) {
    const lines: string[] = [];
    if (project.has("prisma")) {
      // pnpm 10 skips dependency build scripts unless allowed.
      lines.push("onlyBuiltDependencies:", '  - "@prisma/engines"', "  - prisma");
    }
    const overrides = Object.entries(project.overrides);
    if (overrides.length > 0) {
      lines.push("overrides:", ...overrides.map(([path, version]) => `  ${JSON.stringify(path)}: ${JSON.stringify(version)}`));
    }
    project.addFile("pnpm-workspace.yaml", lines.join("\n"));
  }
}

/** package.json field that forces transitive versions (pnpm reads them from pnpm-workspace.yaml). */
function renderOverrides(project: ProjectBuilder): Record<string, unknown> {
  const overrides = Object.entries(project.overrides);
  if (overrides.length === 0) return {};
  switch (project.config.packageManager) {
    case "npm": {
      // npm nests overrides: { parent: { pkg: version } }.
      const npm: Record<string, string | Record<string, string>> = {};
      for (const [path, version] of overrides) {
        const [parent, name] = path.split(">") as [string, string?];
        npm[parent] = name === undefined ? version : { ...(npm[parent] as Record<string, string>), [name]: version };
      }
      return { overrides: npm };
    }
    case "yarn":
      return { resolutions: Object.fromEntries(overrides.map(([path, version]) => [`**/${path.replace(">", "/")}`, version])) };
    case "bun":
      // Bun only supports top-level overrides.
      return { overrides: Object.fromEntries(overrides.filter(([path]) => !path.includes(">"))) };
    case "pnpm":
      return {};
  }
}

function renderReadme(project: ProjectBuilder, framework: Framework, moduleIds: string[]): string {
  const { config } = project;
  const architecture = getArchitecture(config.architecture)!;
  const modules = moduleIds.map((id) => MODULES.find((m) => m.id === id)).filter((m) => m !== undefined);

  const parts: string[] = [`# ${config.name}`, ""];
  if (config.description) parts.push(config.description, "");

  parts.push(
    "## Getting started",
    "",
    "```bash",
    project.installCommand(),
    ...(project.env.length > 0 ? ["cp .env.example .env   # then fill in the values"] : []),
    project.run("dev"),
    "```",
    "",
    `Open [${framework.devUrl}](${framework.devUrl}) in your browser.`,
    "",
    "## Stack",
    "",
    `- [${framework.name}](${framework.homepage}) ${framework.stackNote}`,
    ...modules.map((m) => `- [${m.name}](${m.homepage}): ${m.description}`),
    "",
    "## Project structure",
    "",
    `Architecture: **${architecture.name}**. ${architecture.description}`,
    "",
    "```",
    architecture.tree[config.framework],
    "```",
    "",
    "## Scripts",
    "",
    "| Command | Description |",
    "| --- | --- |",
    ...Object.entries(project.scripts).map(([name, cmd]) => `| \`${project.run(name)}\` | \`${cmd}\` |`),
    "",
  );

  for (const section of project.readmeSections) {
    parts.push(`## ${section.title}`, "", section.body, "");
  }

  parts.push("---", "", "Generated with [StackCraft](https://github.com/fotsosteve14/stackcraft).");
  return parts.join("\n");
}

/** Home page content shared by frameworks: title, description, optional shadcn button. */
export function homeContent(project: ProjectBuilder, editPath: string, extra: string): string {
  const { name, description } = project.config;
  const title = `{${JSON.stringify(name)}}`;
  const subtitle = description ? `{${JSON.stringify(description)}}` : "Your project is ready.";

  if (!project.has("tailwind")) {
    return `<main className="page">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <p>
        Edit <code>${editPath}</code> to get started.
      </p>${extra}
    </main>`;
  }

  const shadcn = project.has("shadcn");
  const muted = project.mutedTextClass;
  return `<main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight">${title}</h1>
      <p className="max-w-md text-lg ${muted}">${subtitle}</p>${
        shadcn
          ? `
      <Button asChild>
        <a href="https://ui.shadcn.com/docs/components" target="_blank" rel="noopener noreferrer">
          Browse components
        </a>
      </Button>`
          : ""
      }
      <p className="text-sm ${muted}">
        Edit <code className="font-mono">${editPath}</code> to get started.
      </p>${extra}
    </main>`;
}

/** Base stylesheet used when Tailwind is not selected. */
export function plainCss(project: ProjectBuilder): string {
  const { sans, mono } = project.fonts;
  const { theme } = project.config;
  // Muted text is --muted-foreground, as in shadcn/ui: with a theme, --muted is a surface color.
  const variables = theme
    ? themeVariablesCss(theme)
    : `:root {
  --background: #ffffff;
  --foreground: #171717;
  --muted-foreground: #666666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --muted-foreground: #a1a1a1;
  }
}`;
  return `${variables}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: ${sans};
}

.page {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
}

.page h1 {
  margin: 0;
  font-size: 2.5rem;
  letter-spacing: -0.025em;
}

.page p {
  margin: 0;
  max-width: 28rem;
  color: var(--muted-foreground);
}

.page code {
  font-family: ${mono};
}

.section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
}
`;
}

/** Theme switch component and README section, once the stylesheet is final. No-op without a theme. */
export function applyThemeFiles(project: ProjectBuilder): void {
  const { theme, framework } = project.config;
  if (!theme) return;
  const file = themeTogglePath(project);
  if (framework === "sveltekit") {
    project.addFile(file, svelteThemeToggle());
  } else {
    project.addFile(file, reactThemeToggle(project.useClient));
    project.editFile(project.paths.css, (css) => `${css.trimEnd()}\n\n${THEME_TOGGLE_CSS}`);
  }
  project.addReadmeSection("Theme", themeReadme(theme, project.paths.css, file));
}

/** Where the theme switch lives; layouts import it from there. */
export function themeTogglePath(project: ProjectBuilder): string {
  return `${project.paths.components}/theme-toggle.${project.config.framework === "sveltekit" ? "svelte" : "tsx"}`;
}

/** Inline <script> for index.html / app.html: sets data-theme before the first paint. */
export function themeScriptTag(indent: string): string {
  const body = THEME_SCRIPT.split("\n")
    .map((line) => `${indent}  ${line}`)
    .join("\n");
  return `\n${indent}<script>\n${body}\n${indent}</script>`;
}
