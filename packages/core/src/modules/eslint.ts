import type { StackModule } from "../types";

export const eslint: StackModule = {
  id: "eslint",
  name: "ESLint",
  description: "Linting with the framework's recommended rules (TypeScript, React Hooks…).",
  category: "quality",
  homepage: "https://eslint.org",
  apply(project) {
    project.addScript("lint", "eslint");

    if (project.config.framework === "nextjs") {
      project.addDevDependency("eslint", "eslint-config-next");
      const extraIgnores = project.has("prisma") ? `\n    "${project.paths.generated}/**",` : "";
      project.addFile(
        "eslint.config.mjs",
        `import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",${extraIgnores}
  ]),
]);

export default eslintConfig;
`,
      );
      return;
    }

    // Same rules as the create-vite React template: recommended JS + TypeScript, React Hooks,
    // and React Refresh so components keep their state on hot reload.
    project.addDevDependency(
      "eslint",
      "@eslint/js",
      "typescript-eslint",
      "eslint-plugin-react-hooks",
      "eslint-plugin-react-refresh",
      "globals",
    );
    // shadcn/ui files export helpers (buttonVariants…) next to components by design.
    const uiOverride = project.has("shadcn")
      ? `
  {
    files: ["${project.paths.ui}/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },`
      : "";
    project.addFile(
      "eslint.config.js",
      `import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["dist", "coverage"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },${uiOverride}
]);
`,
    );
  },
};
