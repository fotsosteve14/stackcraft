import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  generateProject,
  generateZip,
  InvalidConfigError,
  MODULES,
  resolveModules,
  validateConfig,
  type ProjectConfig,
} from "../src";

const base: ProjectConfig = {
  name: "my-app",
  description: "A test app",
  packageManager: "npm",
  modules: [],
};

const pkg = (files: Record<string, string>) => JSON.parse(files["package.json"]!);

describe("resolveModules", () => {
  test("adds required modules automatically", async () => {
    const result = resolveModules(["shadcn"]);
    expect(result.modules).toEqual(["tailwind", "shadcn"]);
    expect(result.added).toEqual(["tailwind"]);
    expect(result.errors).toEqual([]);
  });

  test("reports conflicts once", async () => {
    const result = resolveModules(["prisma", "drizzle"]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("cannot be used together");
  });

  test("reports unknown modules", async () => {
    expect(resolveModules(["nope"]).errors).toEqual(['Unknown module "nope".']);
  });

  test("returns modules in registry order", async () => {
    expect(resolveModules(["docker", "eslint", "tailwind"]).modules).toEqual(["tailwind", "eslint", "docker"]);
  });
});

describe("validateConfig", () => {
  test.each(["My-App", "-app", "app-", "my app", ""])("rejects invalid name %j", (name) => {
    expect(validateConfig({ ...base, name })).not.toEqual([]);
  });

  test("accepts a valid config", async () => {
    expect(validateConfig(base)).toEqual([]);
  });
});

describe("generateProject", () => {
  test("generates a bare Next.js project", async () => {
    const { files } = await generateProject(base);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining(["package.json", "tsconfig.json", "next.config.ts", "app/layout.tsx", "app/page.tsx", "README.md", ".gitignore"]),
    );
    const json = pkg(files);
    expect(json.name).toBe("my-app");
    expect(json.dependencies.next).toBeDefined();
    expect(files[".env.example"]).toBeUndefined();
    expect(files["app/page.tsx"]).toContain('className="page"');
  });

  test("throws on invalid config", async () => {
    await expect(generateProject({ ...base, modules: ["prisma", "drizzle"] })).rejects.toThrow(InvalidConfigError);
  });

  test("escapes user text in generated code", async () => {
    const { files } = await generateProject({ ...base, description: 'Say "hi" {now} <b>' });
    expect(files["app/page.tsx"]).toContain(`<p>{'Say "hi" {now} <b>'}</p>`);
  });

  test("tailwind + shadcn use the button and Tailwind classes", async () => {
    const { files } = await generateProject({ ...base, modules: ["shadcn"] });
    expect(files["postcss.config.mjs"]).toBeDefined();
    expect(files["app/globals.css"]).toContain('@import "tw-animate-css"');
    expect(files["app/page.tsx"]).toContain("<Button asChild>");
  });

  test("prisma adds scripts, env and gitignore entries", async () => {
    const { files } = await generateProject({ ...base, modules: ["prisma"] });
    expect(pkg(files).scripts.postinstall).toBe("prisma generate");
    expect(files[".env.example"]).toContain("DATABASE_URL=");
    expect(files[".gitignore"]).toContain("/generated/prisma");
  });

  test("zod picks up env vars declared by other modules", async () => {
    const { files } = await generateProject({ ...base, modules: ["zod", "nextauth", "drizzle"] });
    expect(files["lib/env.ts"]).toContain("DATABASE_URL: z.string()");
    expect(files["lib/env.ts"]).toContain("AUTH_SECRET: z.string()");
  });

  test("docker enables standalone output and adds compose for databases", async () => {
    const { files } = await generateProject({ ...base, packageManager: "pnpm", modules: ["docker", "prisma"] });
    expect(files["next.config.ts"]).toContain('output: "standalone"');
    expect(files["docker-compose.yml"]).toContain("postgres");
    expect(files["Dockerfile"]).toContain("pnpm install --frozen-lockfile");
    expect(files["Dockerfile"]).toContain("COPY prisma ./prisma");
  });

  test("README uses the selected package manager", async () => {
    const { files } = await generateProject({ ...base, packageManager: "pnpm" });
    expect(files["README.md"]).toContain("pnpm install");
    expect(files["README.md"]).toContain("pnpm dev");
  });

  test("every module generates without errors alongside the others", async () => {
    const all = MODULES.map((m) => m.id).filter((id) => id !== "drizzle");
    const { modules } = await generateProject({ ...base, modules: all });
    expect(modules).toHaveLength(all.length);
  });
});

describe("generateZip", () => {
  test("packs files inside a folder named after the project", async () => {
    const zip = await JSZip.loadAsync(await generateZip(base));
    expect(zip.file("my-app/package.json")).not.toBeNull();
  });
});
