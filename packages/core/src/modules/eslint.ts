import type { StackModule } from "../types";

export const eslint: StackModule = {
  id: "eslint",
  name: "ESLint",
  description: "Linting with the official Next.js rules (Core Web Vitals + TypeScript).",
  category: "quality",
  homepage: "https://eslint.org",
  apply(project) {
    project.addDevDependency("eslint", "eslint-config-next").addScript("lint", "eslint");

    const extraIgnores = project.has("prisma") ? `\n    "generated/**",` : "";
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
  },
};
