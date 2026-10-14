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
  architecture: "simple",
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

  test("follows create-next-app 16.4 defaults", async () => {
    const { files } = await generateProject(base);
    expect(files["next.config.ts"]).toContain("cacheComponents: true");
    expect(files["next.config.ts"]).toContain("partialPrefetching: true");
    expect(files["AGENTS.md"]).toContain("<!-- BEGIN:nextjs-agent-rules -->");
    expect(pkg(files).scripts.typecheck).toBe("next typegen && tsc --noEmit");
  });

  test("server code is guarded with server-only", async () => {
    for (const db of ["prisma", "drizzle"]) {
      const { files } = await generateProject({ ...base, modules: [db, "nextauth"] });
      expect(files["db/index.ts"]).toMatch(/^import "server-only";/);
      expect(files["auth.ts"]).toMatch(/^import "server-only";/);
      expect(pkg(files).dependencies["server-only"]).toBeDefined();
    }
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

test("animated icons register their shadcn registry and pin motion", async () => {
  const { files, modules } = await generateProject({ ...base, modules: ["animated-icons"] });
  expect(modules).toEqual(["tailwind", "shadcn", "animated-icons"]);
  expect(JSON.parse(files["components.json"]!).registries["@icons-animated"]).toBe("https://icons.lndev.me/r/{name}.json");
  expect(pkg(files).dependencies.motion).toBe("13.1.1");
  expect(files["README.md"]).toContain("shadcn@latest add @icons-animated/tabler-heart");
});

describe("architectures", () => {
  const all = MODULES.map((m) => m.id).filter((id) => id !== "drizzle");

  test("rejects unknown architectures", () => {
    expect(validateConfig({ ...base, architecture: "mvc" as never })).toEqual(['Unknown architecture "mvc".']);
  });

  test("simple keeps the standard Next.js layout and no example", async () => {
    const { files } = await generateProject({ ...base, modules: ["shadcn", "prisma", "nextauth"] });
    expect(files["db/index.ts"]).toContain('from "@/generated/prisma/client"');
    expect(files["auth.ts"]).toBeDefined();
    expect(files["app/api/auth/[...nextauth]/route.ts"]).toContain('from "@/auth"');
    expect(files["components/ui/button.tsx"]).toContain('from "@/lib/utils"');
    expect(Object.keys(files).some((f) => f.startsWith("src/"))).toBe(false);
  });

  test("feature-based moves code under src/ and adds the users feature", async () => {
    const { files } = await generateProject({ ...base, architecture: "feature", modules: all });
    expect(JSON.parse(files["tsconfig.json"]!).compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
    expect(files["src/app/page.tsx"]).toContain('from "@/shared/ui/button"');
    expect(files["src/shared/ui/button.tsx"]).toContain('from "@/shared/lib/utils"');
    expect(JSON.parse(files["components.json"]!).aliases.ui).toBe("@/shared/ui");
    expect(files["src/server/db/index.ts"]).toContain('from "@/generated/prisma/client"');
    expect(files["prisma/schema.prisma"]).toContain('output   = "../src/generated/prisma"');
    expect(files[".gitignore"]).toContain("/src/generated/prisma");
    expect(files["src/app/api/auth/[...nextauth]/route.ts"]).toContain('from "@/server/auth"');
    expect(files["src/features/users/queries.ts"]).toBeDefined();
    expect(files["src/features/users/schema.ts"]).toContain("z.email()");
    expect(files["src/app/users/page.tsx"]).toContain('from "@/features/users/queries"');
    expect(files[".prettierrc.json"]).toContain("./src/app/globals.css");
    expect(files["README.md"]).toContain("Feature-based");
    expect(Object.keys(files).some((f) => f.startsWith("app/") || f.startsWith("lib/"))).toBe(false);
  });

  test("clean architecture adds domain, application and infrastructure layers", async () => {
    const { files } = await generateProject({ ...base, architecture: "clean", modules: ["drizzle", "tailwind"] });
    expect(files["src/domain/repositories/user-repository.ts"]).toContain("interface UserRepository");
    expect(files["src/application/use-cases/list-users.ts"]).toContain("export function listUsers");
    expect(files["src/infrastructure/container.ts"]).toContain("InMemoryUserRepository");
    expect(files["src/infrastructure/database/schema.ts"]).toBeDefined();
    expect(files["drizzle.config.ts"]).toContain('"./src/infrastructure/database/schema.ts"');
    expect(files["src/app/page.tsx"]).toContain('href="/users"');
  });
});

describe("generateZip", () => {
  test("packs files inside a folder named after the project", async () => {
    const zip = await JSZip.loadAsync(await generateZip(base));
    expect(zip.file("my-app/package.json")).not.toBeNull();
  });
});
