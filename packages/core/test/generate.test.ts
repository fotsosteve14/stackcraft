import JSZip from "jszip";
import { describe, expect, test } from "vitest";
import {
  generateProject,
  generateZip,
  InvalidConfigError,
  MODULES,
  resolveModules,
  supportsFramework,
  validateConfig,
  type ProjectConfig,
} from "../src";

const base: ProjectConfig = {
  name: "my-app",
  description: "A test app",
  framework: "nextjs",
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
    const all = MODULES.filter((m) => supportsFramework(m, "nextjs"))
      .map((m) => m.id)
      .filter((id) => id !== "drizzle" && id !== "better-auth");
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

describe("vite + react", () => {
  const vite: ProjectConfig = { ...base, framework: "vite-react" };

  test("server-side modules are not available", () => {
    expect(validateConfig({ ...vite, modules: ["prisma", "better-auth"] })).toEqual([
      '"Prisma" is not available for Vite + React.',
      '"Better Auth" is not available for Vite + React.',
    ]);
  });

  test("generates a Vite project with the @ alias", async () => {
    const { files } = await generateProject(vite);
    const json = pkg(files);
    expect(json.type).toBe("module");
    expect(json.scripts.build).toBe("tsc -b && vite build");
    expect(json.devDependencies.typescript).toBe("~6.0.2");
    expect(files["index.html"]).toContain("<title>my-app</title>");
    expect(files["vite.config.ts"]).toContain('"@": fileURLToPath(new URL("./src", import.meta.url))');
    expect(files["src/main.tsx"]).toContain('import App from "@/App"');
    expect(files["src/App.tsx"]).toContain('className="page"');
    expect(files["next.config.ts"]).toBeUndefined();
  });

  test("modules switch to their Vite setup", async () => {
    const { files } = await generateProject({
      ...vite,
      modules: ["shadcn", "react-compiler", "zod", "docker", "prettier", "eslint"],
    });
    expect(files["vite.config.ts"]).toContain('import react, { reactCompilerPreset } from "@vitejs/plugin-react"');
    expect(files["vite.config.ts"]).toContain("tailwindcss()");
    expect(files["postcss.config.mjs"]).toBeUndefined();
    expect(JSON.parse(files["components.json"]!).rsc).toBe(false);
    expect(JSON.parse(files["components.json"]!).tailwind.css).toBe("src/index.css");
    expect(files["src/index.css"]).not.toContain("--font-geist-sans");
    expect(files["src/lib/env.ts"]).toContain("import.meta.env");
    expect(files["Dockerfile"]).toContain("FROM nginx");
    expect(files["nginx.conf"]).toContain("try_files $uri $uri/ /index.html");
    expect(files[".prettierignore"]).toContain("dist");
    expect(files["eslint.config.js"]).toContain("reactRefresh.configs.vite");
    expect(files["eslint.config.js"]).toContain('files: ["src/components/ui/**"]');
  });

  test("examples and the 3D scene render on the home page", async () => {
    const { files } = await generateProject({ ...vite, architecture: "clean", modules: ["three", "vitest"] });
    expect(files["src/components/users-section.tsx"]).toContain("use(usersPromise)");
    expect(files["src/app/App.tsx"]).toContain("<UsersSection />");
    expect(files["src/app/App.tsx"]).toContain("<Scene />");
    expect(files["src/components/scene/index.tsx"]).toContain("lazy(() => import(");
    expect(files["src/components/scene/scene-canvas.tsx"]).not.toContain('"use client"');
    expect(files["src/__tests__/app.test.tsx"]).toContain('vi.mock("@/components/scene"');
    expect(files["src/app/error.tsx"]).toBeUndefined();
  });
});

describe("sveltekit", () => {
  const kit: ProjectConfig = { ...base, framework: "sveltekit" };

  test("React and server-side modules are not available", () => {
    expect(validateConfig({ ...kit, modules: ["shadcn", "prisma"] })).toEqual([
      '"shadcn/ui" is not available for SvelteKit.',
      '"Prisma" is not available for SvelteKit.',
    ]);
    expect(validateConfig({ ...base, modules: ["bref-ui"] })).toEqual(['"bref-ui" is not available for Next.js.']);
  });

  test("generates a SvelteKit project with runes and adapter-auto", async () => {
    const { files } = await generateProject(kit);
    const json = pkg(files);
    expect(json.type).toBe("module");
    expect(json.scripts.typecheck).toBe("svelte-kit sync && svelte-check --tsconfig ./tsconfig.json");
    expect(json.devDependencies["@sveltejs/adapter-auto"]).toBeDefined();
    expect(json.dependencies).toEqual({});
    expect(JSON.parse(files["tsconfig.json"]!).extends).toBe("./.svelte-kit/tsconfig.json");
    expect(files["svelte.config.js"]).toContain('import adapter from "@sveltejs/adapter-auto"');
    expect(files["svelte.config.js"]).toContain("runes:");
    expect(files["vite.config.ts"]).toContain("plugins: [sveltekit()]");
    expect(files["src/app.html"]).toContain("%sveltekit.body%");
    expect(files["src/routes/+layout.svelte"]).toContain('import "../app.css"');
    expect(files["src/routes/+page.svelte"]).toContain('<main class="page">');
    expect(files[".gitignore"]).toContain("/.svelte-kit");
  });

  test("bref-ui renders its Theme in the layout and a Button on the home page", async () => {
    const { files } = await generateProject({ ...kit, modules: ["bref-ui"] });
    expect(pkg(files).dependencies["bref-ui"]).toBe("^2.2.3");
    expect(files["src/routes/+layout.svelte"]).toContain('import { Theme } from "bref-ui"');
    expect(files["src/routes/+layout.svelte"]).toContain("<Theme />");
    expect(files["src/routes/+page.svelte"]).toContain('import { Button } from "bref-ui"');
    expect(files["src/app.css"]).not.toContain("--background");
    expect(files["README.md"]).toContain("bunx bref-ui add button");
  });

  test("svelte-ai-tools sets up the Svelte plugin and MCP server for each client", async () => {
    expect(validateConfig({ ...base, modules: ["svelte-ai-tools"] })).toEqual([
      '"Svelte AI tools" is not available for Next.js.',
    ]);
    const { files } = await generateProject({ ...kit, modules: ["svelte-ai-tools"] });
    expect(files["AGENTS.md"]).toContain("### 3. svelte-autofixer");
    expect(files["GEMINI.md"]).toBe(files["AGENTS.md"]);
    expect(files[".claude/CLAUDE.md"]).toBe("@../AGENTS.md\n");
    expect(JSON.parse(files[".claude/settings.json"]!).enabledPlugins).toEqual({ "svelte@svelte": true });
    expect(JSON.parse(files[".opencode/opencode.json"]!).plugin).toEqual(["@sveltejs/opencode"]);
    expect(JSON.parse(files[".cursor/mcp.json"]!).mcpServers.svelte.url).toBe("https://mcp.svelte.dev/mcp");
    expect(JSON.parse(files[".vscode/mcp.json"]!).servers.svelte.url).toBe("https://mcp.svelte.dev/mcp");
    expect(JSON.parse(files[".gemini/settings.json"]!).mcpServers.svelte.url).toBe("https://mcp.svelte.dev/mcp");
    expect(files["README.md"]).toContain("## Svelte AI tools");
  });

  test("escapes the description in Svelte markup and formats .svelte files", async () => {
    const { files } = await generateProject({ ...kit, description: 'Use {braces} & "quotes"' });
    expect(files["src/routes/+page.svelte"]).toContain("Use &#123;braces&#125; &amp; &quot;quotes&quot;");
    expect(files["src/routes/+layout.svelte"]).toContain('content="Use &#123;braces&#125;');
    expect(files["src/routes/+page.svelte"]).toContain('<main class="page">\n');
  });

  test("vitest stubs matchMedia for bref-ui", async () => {
    const { files } = await generateProject({ ...kit, modules: ["bref-ui", "vitest"] });
    expect(files["vite.config.ts"]).toContain('setupFiles: ["./src/vitest-setup.ts"]');
    expect(files["src/vitest-setup.ts"]).toContain("window.matchMedia");
  });

  test("modules switch to their SvelteKit setup", async () => {
    const { files } = await generateProject({
      ...kit,
      modules: ["bref-ui", "tailwind", "zod", "eslint", "prettier", "vitest", "docker"],
    });
    const json = pkg(files);
    expect(files["vite.config.ts"]).toContain("plugins: [tailwindcss(), sveltekit(), svelteTesting()]");
    expect(files["vite.config.ts"]).toContain('environment: "jsdom"');
    expect(files["src/routes/page.test.ts"]).toContain('import Page from "./+page.svelte"');
    expect(json.devDependencies["@testing-library/svelte"]).toBeDefined();
    expect(json.devDependencies["@testing-library/react"]).toBeUndefined();
    expect(files["src/lib/server/env.ts"]).toContain("$env/dynamic/private");
    expect(files["eslint.config.js"]).toContain("svelte.configs.recommended");
    expect(JSON.parse(files[".prettierrc.json"]!).plugins).toEqual(["prettier-plugin-svelte", "prettier-plugin-tailwindcss"]);
    expect(files[".prettierignore"]).toContain(".svelte-kit");
    expect(files["svelte.config.js"]).toContain('import adapter from "@sveltejs/adapter-node"');
    expect(json.devDependencies["@sveltejs/adapter-auto"]).toBeUndefined();
    expect(files["Dockerfile"]).toContain('CMD ["node", "build"]');
    expect(files["src/routes/+page.svelte"]).toContain('class="flex min-h-screen');
  });

  test("feature-based example lives under $lib with a load function", async () => {
    const { files } = await generateProject({ ...kit, architecture: "feature", modules: ["zod"] });
    expect(files["src/lib/features/users/queries.ts"]).toContain("export async function getUsers");
    expect(files["src/lib/features/users/schema.ts"]).toContain("z.email()");
    expect(files["src/lib/features/users/components/user-list.svelte"]).toContain("{#each users as user (user.id)}");
    expect(files["src/routes/users/+page.server.ts"]).toContain('from "$lib/features/users/queries"');
    expect(files["src/routes/users/+page.svelte"]).toContain("let { data }: PageProps = $props()");
    expect(files["src/routes/+error.svelte"]).toContain('import { page } from "$app/state"');
    expect(files["src/routes/+page.svelte"]).toContain('href={resolve("/users")}');
    expect(Object.keys(files).some((f) => f.startsWith("src/features/"))).toBe(false);
  });

  test("clean architecture imports its layers through $lib", async () => {
    const { files } = await generateProject({ ...kit, architecture: "clean" });
    expect(files["src/lib/application/use-cases/list-users.ts"]).toContain('from "$lib/domain/entities/user"');
    expect(files["src/lib/infrastructure/container.ts"]).toContain('from "$lib/application/use-cases/list-users"');
    expect(files["src/routes/users/+page.server.ts"]).toContain("useCases.listUsers()");
    expect(files["README.md"]).toContain("load functions call use cases");
  });
});

describe("motion and three", () => {
  test("motion uses the standalone version, or the icons' exact pin when both are selected", async () => {
    const alone = await generateProject({ ...base, modules: ["motion"] });
    expect(pkg(alone.files).dependencies.motion).toBe("^13.5.1");
    expect(alone.files["components/fade-in.tsx"]).toContain('reducedMotion="user"');
    const withIcons = await generateProject({ ...base, modules: ["motion", "animated-icons"] });
    expect(pkg(withIcons.files).dependencies.motion).toBe("13.1.1");
  });

  test("three adds React Three Fiber, a client-only scene and a /scene page", async () => {
    const { files } = await generateProject({ ...base, architecture: "feature", modules: ["three", "tailwind"] });
    expect(pkg(files).dependencies["@react-three/fiber"]).toBeDefined();
    expect(files["src/shared/components/scene/index.tsx"]).toContain("ssr: false");
    expect(files["src/app/scene/page.tsx"]).toContain('from "@/shared/components/scene"');
  });
});

describe("better auth", () => {
  test("conflicts with Auth.js", () => {
    expect(resolveModules(["better-auth", "nextauth"]).errors).toHaveLength(1);
  });

  test("is stateless and GitHub-only without a database", async () => {
    const { files } = await generateProject({ ...base, modules: ["better-auth"] });
    expect(files["auth.ts"]).toContain("No database selected");
    expect(files["auth.ts"]).not.toContain("emailAndPassword");
    expect(files["app/api/auth/[...all]/route.ts"]).toContain("toNextJsHandler(auth)");
    expect(files["lib/auth-client.ts"]).toContain("createAuthClient");
  });

  test("uses the Prisma adapter and replaces the User model", async () => {
    const { files } = await generateProject({ ...base, modules: ["better-auth", "prisma"] });
    expect(files["auth.ts"]).toContain('prismaAdapter(prisma, { provider: "postgresql" })');
    expect(files["prisma/schema.prisma"]).toContain('@@map("verification")');
    expect(files["prisma/schema.prisma"].match(/model User {/g)).toHaveLength(1);
  });

  test("uses the Drizzle adapter with the auth tables", async () => {
    const { files } = await generateProject({ ...base, architecture: "clean", modules: ["better-auth", "drizzle"] });
    expect(files["src/infrastructure/auth.ts"]).toContain('drizzleAdapter(db, { provider: "pg", schema })');
    expect(files["src/infrastructure/database/schema.ts"]).toContain("export const session = pgTable(");
  });
});

test("react compiler enables reactCompiler in next.config", async () => {
  const { files } = await generateProject({ ...base, modules: ["react-compiler"] });
  expect(files["next.config.ts"]).toContain("reactCompiler: true");
  expect(pkg(files).devDependencies["babel-plugin-react-compiler"]).toBe("1.0.0");
});

describe("architectures", () => {
  const all = MODULES.filter((m) => supportsFramework(m, "nextjs"))
    .map((m) => m.id)
    .filter((id) => id !== "drizzle" && id !== "better-auth");

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
    expect(files["src/app/error.tsx"]).toContain("retry: () => void");
    expect(files["src/app/not-found.tsx"]).toBeDefined();
    expect(files["src/app/users/loading.tsx"]).toBeDefined();
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
