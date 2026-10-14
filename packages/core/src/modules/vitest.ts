import type { StackModule } from "../types";

export const vitest: StackModule = {
  id: "vitest",
  name: "Vitest",
  description: "Fast unit testing with React Testing Library and jsdom.",
  category: "testing",
  homepage: "https://vitest.dev",
  apply(project) {
    project
      .addDevDependency(
        "vitest",
        "@vitejs/plugin-react",
        "jsdom",
        "@testing-library/react",
        "@testing-library/dom",
      )
      .addScript("test", "vitest");

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
import Page from "../app/page";

test("renders the project name", () => {
  render(<Page />);
  expect(
    screen.getByRole("heading", { level: 1, name: ${JSON.stringify(project.config.name)} }),
  ).toBeDefined();
});
`,
    );
  },
};
