import { getArchitecture } from "../architectures";
import type { ProjectBuilder } from "../builder";
import { MODULES } from "../modules";

/** Static files of a fresh Next.js (App Router, TypeScript) project. */
export function applyNextjsBase(project: ProjectBuilder): void {
  const { config, paths } = project;

  project
    .addDependency("next", "react", "react-dom")
    .addDevDependency("typescript", "@types/node", "@types/react", "@types/react-dom")
    .addScript("dev", "next dev")
    .addScript("build", "next build")
    .addScript("start", "next start");

  project.addFile(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2017",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "react-jsx",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": [`./${paths.srcDir}*`] },
        },
        include: [
          "next-env.d.ts",
          "**/*.ts",
          "**/*.tsx",
          ".next/types/**/*.ts",
          ".next/dev/types/**/*.ts",
          "**/*.mts",
        ],
        exclude: ["node_modules"],
      },
      null,
      2,
    ),
  );

  project.addFile(
    `${paths.app}/layout.tsx`,
    `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: ${JSON.stringify(config.name)},
  description: ${JSON.stringify(config.description)},
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={\`\${geistSans.variable} \${geistMono.variable} h-full antialiased\`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
`,
  );

  project.addFile(
    `${paths.app}/globals.css`,
    `:root {
  --background: #ffffff;
  --foreground: #171717;
  --muted: #666666;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
    --muted: #a1a1a1;
  }
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif;
}

.page {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
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
  color: var(--muted);
}

.page code {
  font-family: var(--font-geist-mono), monospace;
}
`,
  );

  project.addFile(
    `${paths.app}/icon.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path d="M9 21l7-11 7 11z" fill="#fff"/></svg>`,
  );

  project.addFile(
    "public/.gitkeep",
    "",
  );

  project.addGitignore(
    "dependencies",
    "/node_modules",
    "/.pnp",
    ".pnp.*",
    ".yarn/*",
    "!.yarn/patches",
    "!.yarn/plugins",
    "!.yarn/releases",
    "!.yarn/versions",
  );
  project.addGitignore("testing", "/coverage");
  project.addGitignore("next.js", "/.next/", "/out/");
  project.addGitignore("production", "/build");
  project.addGitignore("misc", ".DS_Store", "*.pem");
  project.addGitignore(
    "debug",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".pnpm-debug.log*",
  );
  project.addGitignore("env files", ".env*", "!.env.example");
  project.addGitignore("vercel", ".vercel");
  project.addGitignore("typescript", "*.tsbuildinfo", "next-env.d.ts");
}

/** Renders the files that depend on what every module contributed. */
export function finalizeNextjsBase(project: ProjectBuilder, moduleIds: string[]): void {
  const { config } = project;

  getArchitecture(config.architecture)!.applyExample?.(project);

  project.addFile("package.json", renderPackageJson(project));
  project.addFile("next.config.ts", renderNextConfig(project));
  project.addFile(`${project.paths.app}/page.tsx`, renderPage(project));
  project.addFile(".gitignore", project.gitignore.join("\n").trimStart());
  project.addFile("README.md", renderReadme(project, moduleIds));

  if (project.env.length > 0) {
    const lines = project.env.flatMap((v) => [
      ...(v.comment ? [`# ${v.comment}`] : []),
      `${v.key}=${JSON.stringify(v.value)}`,
      "",
    ]);
    project.addFile(".env.example", lines.join("\n").trimEnd());
  }

  if (config.packageManager === "pnpm" && project.has("prisma")) {
    // pnpm 10 skips dependency build scripts unless allowed.
    project.addFile(
      "pnpm-workspace.yaml",
      `onlyBuiltDependencies:\n  - "@prisma/engines"\n  - prisma\n`,
    );
  }
}

function sortKeys(record: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

function renderPackageJson(project: ProjectBuilder): string {
  const pkg = {
    name: project.config.name,
    version: "0.1.0",
    description: project.config.description || undefined,
    private: true,
    scripts: project.scripts,
    dependencies: sortKeys(project.dependencies),
    devDependencies: sortKeys(project.devDependencies),
  };
  return JSON.stringify(pkg, null, 2);
}

function renderNextConfig(project: ProjectBuilder): string {
  const entries = Object.entries(project.nextConfig);
  const body =
    entries.length === 0
      ? "  /* config options here */"
      : entries.map(([key, value]) => `  ${key}: ${value},`).join("\n");
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
${body}
};

export default nextConfig;
`;
}

function renderPage(project: ProjectBuilder): string {
  const { name, description, architecture } = project.config;
  const title = `{${JSON.stringify(name)}}`;
  const subtitle = description ? `{${JSON.stringify(description)}}` : "Your project is ready.";
  const pagePath = `${project.paths.app}/page.tsx`;
  const hasExample = !!getArchitecture(architecture)!.applyExample;
  const imports: string[] = [];
  if (hasExample) imports.push(`import Link from "next/link";`);
  if (project.has("shadcn")) {
    imports.push(`import { Button } from "${project.importPath(`${project.paths.ui}/button.tsx`)}";`);
  }
  const header = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";

  if (!project.has("tailwind")) {
    return `${header}export default function Home() {
  return (
    <main className="page">
      <h1>${title}</h1>
      <p>${subtitle}</p>
      <p>
        Edit <code>${pagePath}</code> to get started.
      </p>${
        hasExample
          ? `
      <p>
        <Link href="/users">See the example feature</Link>
      </p>`
          : ""
      }
    </main>
  );
}
`;
  }

  const shadcn = project.has("shadcn");
  const muted = shadcn ? "text-muted-foreground" : "text-zinc-600 dark:text-zinc-400";
  return `${header}export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
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
        Edit <code className="font-mono">${pagePath}</code> to get started.
      </p>${
        hasExample
          ? `
      <Link href="/users" className="text-sm font-medium underline underline-offset-4">
        See the example feature
      </Link>`
          : ""
      }
    </main>
  );
}
`;
}

function renderReadme(project: ProjectBuilder, moduleIds: string[]): string {
  const { config } = project;
  const architecture = getArchitecture(config.architecture)!;
  const modules = moduleIds
    .map((id) => MODULES.find((m) => m.id === id))
    .filter((m) => m !== undefined);

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
    "Open [http://localhost:3000](http://localhost:3000) in your browser.",
    "",
    "## Stack",
    "",
    "- [Next.js](https://nextjs.org) (App Router, TypeScript)",
    ...modules.map((m) => `- [${m.name}](${m.homepage}): ${m.description}`),
    "",
    "## Project structure",
    "",
    `Architecture: **${architecture.name}**. ${architecture.description}`,
    "",
    "```",
    architecture.tree,
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
