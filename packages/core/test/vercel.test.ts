import { describe, expect, test } from "vitest";
import { vercelDeployment, vercelImportUrl, type ProjectConfig } from "../src";

const base: ProjectConfig = {
  name: "my-app",
  description: "",
  framework: "nextjs",
  packageManager: "npm",
  architecture: "simple",
  modules: [],
};

describe("vercelDeployment", () => {
  test("a plain project deploys as is", () => {
    expect(vercelDeployment(base)).toEqual({ supported: true, reason: undefined, env: [], needsDatabase: false });
  });

  test("lists the variables to set, and flags the database", () => {
    const deployment = vercelDeployment({ ...base, modules: ["prisma", "nextauth"] });
    expect(deployment.supported).toBe(true);
    expect(deployment.needsDatabase).toBe(true);
    expect(deployment.env.map((v) => v.key)).toEqual(expect.arrayContaining(["DATABASE_URL", "AUTH_SECRET"]));
  });

  test("SvelteKit with Docker uses adapter-node, which Vercel cannot run", () => {
    const deployment = vercelDeployment({ ...base, framework: "sveltekit", modules: ["docker"] });
    expect(deployment.supported).toBe(false);
    expect(deployment.reason).toContain("adapter-node");
  });

  test("Next.js with Docker still deploys on Vercel", () => {
    expect(vercelDeployment({ ...base, modules: ["docker"] }).supported).toBe(true);
  });
});

test("vercelImportUrl points at the import page of the repository", () => {
  expect(vercelImportUrl("https://github.com/octocat/my-app")).toBe(
    "https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2Foctocat%2Fmy-app",
  );
});
