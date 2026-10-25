import { getArchitecture } from "../architectures";
import type { ProjectBuilder } from "../builder";
import type { Framework } from "./index";
import { THEME_SCRIPT } from "../theme";
import { applyThemeFiles, finalizeCommon, homeContent, plainCss, themeTogglePath } from "./shared";

const NEXT_AGENT_RULES = `<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes \u2014 APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in \`node_modules/next/dist/docs/\` (resolved from this file's directory; in monorepos the \`next\` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by \`next dev\` \u2014 verify at \`node_modules/next/dist/server/lib/generate-agent-files.js\`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
`;

export const nextjs: Framework = {
  id: "nextjs",
  name: "Next.js",
  description: "Full-stack React with the App Router, Server Components and Cache Components.",
  homepage: "https://nextjs.org",
  stackNote: "(App Router, TypeScript)",
  devUrl: "http://localhost:3000",

  applyBase(project) {
    const { config, paths } = project;

    project
      .addDependency("next", "react", "react-dom")
      .addDevDependency("typescript", "@types/node", "@types/react", "@types/react-dom")
      .addScript("dev", "next dev")
      .addScript("build", "next build")
      .addScript("start", "next start")
      // next typegen creates route types (LayoutProps, PageProps…) that tsc needs.
      .addScript("typecheck", "next typegen && tsc --noEmit")
      // Defaults of create-next-app 16.4: the Cache Components model with Partial Prefetching.
      .setNextConfig("cacheComponents", "true")
      .setNextConfig("partialPrefetching", "true");

    // Same block that create-next-app writes and `next dev` keeps up to date. Keep it verbatim:
    // any difference makes `next dev` rewrite the file.
    project.addFile("AGENTS.md", NEXT_AGENT_RULES);

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
          include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
          exclude: ["node_modules"],
        },
        null,
        2,
      ),
    );

    project.addFile(`${paths.app}/layout.tsx`, renderLayout(project));

    project.addFile(paths.css, plainCss(project));
    project.addFile(
      `${paths.app}/icon.svg`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path d="M9 21l7-11 7 11z" fill="#fff"/></svg>`,
    );
    project.addFile("public/.gitkeep", "");

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
    project.addGitignore("debug", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*", ".pnpm-debug.log*");
    project.addGitignore("env files", ".env*", "!.env.example");
    project.addGitignore("vercel", ".vercel");
    project.addGitignore("typescript", "*.tsbuildinfo", "next-env.d.ts");
  },

  finalize(project, moduleIds) {
    project.applyArchitectureExample();
    project.addFile("next.config.ts", renderNextConfig(project));
    project.addFile(`${project.paths.app}/page.tsx`, renderPage(project));
    applyThemeFiles(project);
    finalizeCommon(project, this, moduleIds);
  },
};

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
  const hasExample = !!getArchitecture(project.config.architecture)!.applyExample;
  const imports: string[] = [];
  if (hasExample) imports.push(`import Link from "next/link";`);
  if (project.has("shadcn")) {
    imports.push(`import { Button } from "${project.importPath(`${project.paths.ui}/button.tsx`)}";`);
  }
  const header = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";
  const tw = project.has("tailwind");
  const link = !hasExample
    ? ""
    : tw
      ? `
      <Link href="/users" className="text-sm font-medium underline underline-offset-4">
        See the example feature
      </Link>`
      : `
      <p>
        <Link href="/users">See the example feature</Link>
      </p>`;

  return `${header}export default function Home() {
  return (
    ${homeContent(project, `${project.paths.app}/page.tsx`, link)}
  );
}
`;
}

function renderLayout(project: ProjectBuilder): string {
  const { config } = project;
  const theme = !!config.theme;
  const toggleImport = theme ? `import { ThemeToggle } from "${project.importPath(themeTogglePath(project))}";\n` : "";
  const script = theme
    ? `
// Sets data-theme on <html> before the first paint, from the saved choice or the system preference.
const themeScript = \`${THEME_SCRIPT}\`;
`
    : "";
  const body = theme
    ? `<head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeToggle />
        {children}
      </body>`
    : `<body className="flex min-h-full flex-col">{children}</body>`;

  return `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
${toggleImport}import "./globals.css";

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
${script}
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={\`\${geistSans.variable} \${geistMono.variable} h-full antialiased\`}${
        theme ? "\n      // The inline script sets data-theme before React hydrates.\n      suppressHydrationWarning" : ""
      }
    >
      ${body}
    </html>
  );
}
`;
}
