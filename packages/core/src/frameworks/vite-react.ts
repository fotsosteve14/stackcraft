import type { ProjectBuilder } from "../builder";
import type { Framework } from "./index";
import { applyThemeFiles, finalizeCommon, homeContent, plainCss, themeScriptTag, themeTogglePath } from "./shared";

// TypeScript 6 is what create-vite 9.2 ships; Next.js projects stay on TypeScript 5.
const TYPESCRIPT = "~6.0.2";

const COMPILER_OPTIONS = {
  target: "es2023",
  module: "esnext",
  types: [] as string[],
  skipLibCheck: true,
  moduleResolution: "bundler",
  allowImportingTsExtensions: true,
  verbatimModuleSyntax: true,
  moduleDetection: "force",
  noEmit: true,
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  erasableSyntaxOnly: true,
  noFallthroughCasesInSwitch: true,
};

export const viteReact: Framework = {
  id: "vite-react",
  name: "Vite + React",
  description: "Fast single-page React apps with Vite. No server: deploy it as static files anywhere.",
  homepage: "https://vite.dev",
  stackNote: "with React and TypeScript",
  devUrl: "http://localhost:5173",
  packageType: "module",

  applyBase(project) {
    const { config, paths } = project;

    project
      .addDependency("react", "react-dom")
      .addDevDependency("vite", "@vitejs/plugin-react", "@types/node", "@types/react", "@types/react-dom")
      .addScript("dev", "vite")
      .addScript("build", "tsc -b && vite build")
      .addScript("preview", "vite preview")
      .addScript("typecheck", "tsc -b");
    project.devDependencies.typescript = TYPESCRIPT;

    // Project references, like create-vite. "paths" is repeated in the root file so tools
    // such as the shadcn CLI can resolve the "@/*" alias.
    project.addFile(
      "tsconfig.json",
      JSON.stringify(
        {
          files: [],
          references: [{ path: "./tsconfig.app.json" }, { path: "./tsconfig.node.json" }],
          compilerOptions: { paths: { "@/*": ["./src/*"] } },
        },
        null,
        2,
      ),
    );
    project.addFile(
      "tsconfig.app.json",
      JSON.stringify(
        {
          compilerOptions: {
            tsBuildInfoFile: "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
            ...COMPILER_OPTIONS,
            lib: ["ES2023", "DOM", "DOM.Iterable"],
            types: ["vite/client"],
            jsx: "react-jsx",
            paths: { "@/*": ["./src/*"] },
          },
          include: ["src"],
        },
        null,
        2,
      ),
    );
    project.addFile(
      "tsconfig.node.json",
      JSON.stringify(
        {
          compilerOptions: {
            tsBuildInfoFile: "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
            ...COMPILER_OPTIONS,
            lib: ["ES2023"],
            types: ["node"],
          },
          include: ["vite.config.ts"],
        },
        null,
        2,
      ),
    );

    project.addFile(
      "index.html",
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(config.description)}" />
    <title>${escapeHtml(config.name)}</title>${config.theme ? themeScriptTag("    ") : ""}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    );

    project.addFile(
      "public/favicon.svg",
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#171717"/><path d="M9 21l7-11 7 11z" fill="#fff"/></svg>`,
    );

    project.addFile(
      "src/main.tsx",
      `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "${project.importPath(paths.css)}";
import App from "${project.importPath(`${paths.app}/App.tsx`)}";${
        config.theme ? `\nimport { ThemeToggle } from "${project.importPath(themeTogglePath(project))}";` : ""
      }

createRoot(document.getElementById("root")!).render(
  <StrictMode>${config.theme ? "\n    <ThemeToggle />" : ""}
    <App />
  </StrictMode>,
);
`,
    );

    project.addFile(paths.css, plainCss(project));

    project.addGitignore("logs", "logs", "*.log", "npm-debug.log*", "yarn-debug.log*", "yarn-error.log*", "pnpm-debug.log*");
    project.addGitignore("dependencies", "node_modules");
    project.addGitignore("build", "dist", "dist-ssr", "*.local", "*.tsbuildinfo");
    project.addGitignore("testing", "coverage");
    project.addGitignore("env files", ".env*", "!.env.example");
    project.addGitignore("editor", ".vscode/*", "!.vscode/extensions.json", ".idea", ".DS_Store");
  },

  finalize(project, moduleIds) {
    // Architecture examples register home sections, so they run before App.tsx is rendered.
    project.applyArchitectureExample();
    project.addFile("vite.config.ts", renderViteConfig(project));
    project.addFile(`${project.paths.app}/App.tsx`, renderApp(project));
    applyThemeFiles(project);
    finalizeCommon(project, this, moduleIds);
  },
};

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderViteConfig(project: ProjectBuilder): string {
  const { imports, plugins, config } = project.vite;
  const presetImport = 'import { reactCompilerPreset } from "@vitejs/plugin-react";';
  const reactImport = imports.includes(presetImport)
    ? 'import react, { reactCompilerPreset } from "@vitejs/plugin-react";'
    : 'import react from "@vitejs/plugin-react";';
  const allImports = [
    reactImport,
    'import { fileURLToPath, URL } from "node:url";',
    'import { defineConfig } from "vite";',
    ...imports.filter((line) => line !== presetImport),
  ];
  const extra = Object.entries(config).map(([key, value]) => `  ${key}: ${value},`);

  return `${project.has("vitest") ? '/// <reference types="vitest/config" />\n' : ""}${allImports.join("\n")}

// https://vite.dev/config/
export default defineConfig({
  plugins: [${["react()", ...plugins].join(", ")}],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
${extra.join("\n")}
});
`;
}

function renderApp(project: ProjectBuilder): string {
  const imports = [
    ...(project.has("shadcn") ? [`import { Button } from "${project.importPath(`${project.paths.ui}/button.tsx`)}";`] : []),
    ...project.homeSections.map((s) => s.importLine),
  ];
  const header = imports.length > 0 ? `${imports.join("\n")}\n\n` : "";
  const sections = project.homeSections.map((s) => `\n      ${s.element}`).join("");
  // A SPA has no layout filling the viewport: the page itself takes the full height.
  const content = homeContent(project, `${project.paths.app}/App.tsx`, sections)
    .replace('className="flex flex-1 flex-col', 'className="flex min-h-screen flex-col');

  return `${header}export default function App() {
  return (
    ${content}
  );
}
`;
}
