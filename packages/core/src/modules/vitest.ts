import type { StackModule } from "../types";

export const vitest: StackModule = {
  id: "vitest",
  name: "Vitest",
  description: "Fast unit testing with Testing Library and jsdom.",
  category: "testing",
  homepage: "https://vitest.dev",
  apply(project) {
    const { config, paths } = project;
    project.addDevDependency("vitest", "jsdom").addScript("test", "vitest");
    const heading = `screen.getByRole("heading", { level: 1, name: ${JSON.stringify(config.name)} })`;

    if (config.framework === "sveltekit") {
      // svelteTesting() resolves Svelte's browser build in tests and unmounts components after each one.
      const bref = project.has("bref-ui");
      project
        .addDevDependency("@testing-library/svelte")
        .addVitePlugin('import { svelteTesting } from "@testing-library/svelte/vite";', "svelteTesting()")
        .setViteConfig(
          "test",
          `{\n    environment: "jsdom",${bref ? '\n    setupFiles: ["./src/vitest-setup.ts"],' : ""}\n  }`,
        );
      if (bref) {
        project.addFile(
          "src/vitest-setup.ts",
          `// jsdom does not implement matchMedia, which bref-ui reads to respect prefers-reduced-motion.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
`,
        );
      }
      project.addFile(
        `${paths.app}/page.test.ts`,
        `import { render, screen } from "@testing-library/svelte";
import { expect, test } from "vitest";
import Page from "./+page.svelte";

test("renders the project name", () => {
  render(Page);
  expect(${heading}).toBeDefined();
});
`,
      );
      return;
    }

    project.addDevDependency("@testing-library/react", "@testing-library/dom");

    if (config.framework === "nextjs") {
      project.addDevDependency("@vitejs/plugin-react");
      project.addFile(
        "vitest.config.mts",
        `import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
  },
});
`,
      );

      project.addFile(
        "__tests__/page.test.tsx",
        `import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "${project.importPath(`${paths.app}/page.tsx`)}";

test("renders the project name", () => {
  render(<Page />);
  expect(${heading}).toBeDefined();
});
`,
      );
      return;
    }

    // Vite projects reuse vite.config.ts: same plugins and "@" alias in tests.
    project.setViteConfig("test", `{\n    environment: "jsdom",\n  }`);

    // WebGL is not available in jsdom: replace the 3D scene in tests.
    const sceneMock = project.has("three")
      ? `\nvi.mock("${project.importPath(`${paths.components}/scene`)}", () => ({ Scene: () => null }));\n`
      : "";
    project.addFile(
      "src/__tests__/app.test.tsx",
      `import { render, screen } from "@testing-library/react";
import { expect, test${sceneMock ? ", vi" : ""} } from "vitest";
import App from "${project.importPath(`${paths.app}/App.tsx`)}";
${sceneMock}
test("renders the project name", () => {
  render(<App />);
  expect(${heading}).toBeDefined();
});
`,
    );
  },
};
