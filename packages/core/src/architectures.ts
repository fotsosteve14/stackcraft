import type { ProjectBuilder } from "./builder";
import type { FrameworkId } from "./types";

export type ArchitectureId = "simple" | "feature" | "clean";

/**
 * Where each kind of file lives. Modules never hardcode folders: they ask
 * `project.paths` so the same module fits every architecture and framework.
 */
export interface ProjectPaths {
  /** "src/" when code lives under src, "" otherwise. Drives the "@/*" alias. */
  srcDir: "" | "src/";
  /** Next.js App Router folder, or the folder holding App.tsx with Vite. */
  app: string;
  /** Global stylesheet. */
  css: string;
  /** Shared React components. */
  components: string;
  /** UI primitives (shadcn/ui). */
  ui: string;
  /** Shared utilities (cn, env…). */
  lib: string;
  /** Shared React hooks. */
  hooks: string;
  /** Client state stores. */
  stores: string;
  /** Database client and schema (server frameworks only). */
  db: string;
  /** Auth configuration file (server frameworks only). */
  auth: string;
  /** Generated code (Prisma client). */
  generated: string;
}

export interface Architecture {
  id: ArchitectureId;
  name: string;
  description: string;
  paths: Record<FrameworkId, ProjectPaths>;
  /** Folder overview for the generated README. */
  tree: Record<FrameworkId, string>;
  /** Example code showing how to organize a feature in this architecture. */
  applyExample?(project: ProjectBuilder): void;
}

const simple: Architecture = {
  id: "simple",
  name: "Simple",
  description: "The framework's standard layout. Great for small apps and prototypes.",
  paths: {
    nextjs: {
      srcDir: "",
      app: "app",
      css: "app/globals.css",
      components: "components",
      ui: "components/ui",
      lib: "lib",
      hooks: "hooks",
      stores: "stores",
      db: "db",
      auth: "auth.ts",
      generated: "generated",
    },
    "vite-react": {
      srcDir: "src/",
      app: "src",
      css: "src/index.css",
      components: "src/components",
      ui: "src/components/ui",
      lib: "src/lib",
      hooks: "src/hooks",
      stores: "src/stores",
      db: "src/db",
      auth: "src/auth.ts",
      generated: "src/generated",
    },
  },
  tree: {
    nextjs: `app/            Routes, layouts and pages
components/     React components (ui/ for primitives)
lib/            Utilities
db/             Database client and schema
stores/         Client state`,
    "vite-react": `src/
  main.tsx        Entry point
  App.tsx         Root component
  components/     React components (ui/ for primitives)
  lib/            Utilities
  stores/         Client state`,
  },
};

const feature: Architecture = {
  id: "feature",
  name: "Feature-based",
  description: "Code grouped by business feature. Scales well for medium and large apps.",
  paths: {
    nextjs: {
      srcDir: "src/",
      app: "src/app",
      css: "src/app/globals.css",
      components: "src/shared/components",
      ui: "src/shared/ui",
      lib: "src/shared/lib",
      hooks: "src/shared/hooks",
      stores: "src/shared/stores",
      db: "src/server/db",
      auth: "src/server/auth.ts",
      generated: "src/generated",
    },
    "vite-react": {
      srcDir: "src/",
      app: "src/app",
      css: "src/app/index.css",
      components: "src/shared/components",
      ui: "src/shared/ui",
      lib: "src/shared/lib",
      hooks: "src/shared/hooks",
      stores: "src/shared/stores",
      db: "src/server/db",
      auth: "src/server/auth.ts",
      generated: "src/generated",
    },
  },
  tree: {
    nextjs: `src/
  app/                Routes only: thin pages that compose features
  features/
    users/            One folder per feature
      components/     UI of the feature
      queries.ts      Data access of the feature
      types.ts
  shared/             Code used by several features (ui/, lib/, stores/)
  server/             Server-only infrastructure (db/, auth.ts)

Rule of thumb: a feature may import from shared/ and server/, never from another feature.`,
    "vite-react": `src/
  main.tsx            Entry point
  app/                App.tsx, global styles and providers: composes features
  features/
    users/            One folder per feature
      components/     UI of the feature
      queries.ts      Data access of the feature
      types.ts
  shared/             Code used by several features (ui/, lib/, stores/)

Rule of thumb: a feature may import from shared/, never from another feature.`,
  },
  applyExample(project) {
    const ctx = exampleContext(project);
    const next = project.config.framework === "nextjs";
    if (next) addRouteBoundaries(project, ctx);

    project.addFile("src/features/users/types.ts", USER_TYPE);

    const dbHint = project.has("prisma") || project.has("drizzle") ? ` (see ${project.importPath(project.paths.db)})` : "";
    project.addFile(
      "src/features/users/queries.ts",
      next
        ? `import { cacheLife } from "next/cache";
import type { User } from "./types";

/**
 * Data access for the users feature, cached with Cache Components.
 * Replace the in-memory list with your database${dbHint}.
 */
export async function getUsers(): Promise<User[]> {
  "use cache";
  cacheLife("hours");
  return ${USERS};
}
`
        : `import type { User } from "./types";

/** Data access for the users feature. Replace the in-memory list with a call to your API. */
export async function getUsers(): Promise<User[]> {
  return ${USERS};
}
`,
    );

    if (project.has("zod")) {
      project.addFile(
        "src/features/users/schema.ts",
        `import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
`,
      );
    }

    project.addFile("src/features/users/components/user-list.tsx", userListComponent(ctx, "../types"));

    if (next) {
      project.addFile(
        "src/app/users/page.tsx",
        `import { UserList } from "@/features/users/components/user-list";
import { getUsers } from "@/features/users/queries";

export default async function UsersPage() {
  const users = await getUsers();
  return ${usersPageBody(ctx)};
}
`,
      );
    } else {
      project.addFile(
        "src/features/users/components/users-section.tsx",
        usersSection(ctx, `import { getUsers } from "../queries";\nimport { UserList } from "./user-list";`, "getUsers()"),
      );
      project.addHomeSection(`import { UsersSection } from "@/features/users/components/users-section";`, "<UsersSection />");
    }
  },
};

const clean: Architecture = {
  id: "clean",
  name: "Clean Architecture",
  description: "Layered domain / application / infrastructure. Familiar if you come from Spring or .NET.",
  paths: {
    nextjs: {
      srcDir: "src/",
      app: "src/app",
      css: "src/app/globals.css",
      components: "src/components",
      ui: "src/components/ui",
      lib: "src/lib",
      hooks: "src/hooks",
      stores: "src/stores",
      db: "src/infrastructure/database",
      auth: "src/infrastructure/auth.ts",
      generated: "src/generated",
    },
    "vite-react": {
      srcDir: "src/",
      app: "src/app",
      css: "src/app/index.css",
      components: "src/components",
      ui: "src/components/ui",
      lib: "src/lib",
      hooks: "src/hooks",
      stores: "src/stores",
      db: "src/infrastructure/database",
      auth: "src/infrastructure/auth.ts",
      generated: "src/generated",
    },
  },
  tree: {
    nextjs: `src/
  domain/             Entities and repository interfaces. Pure TypeScript, no framework.
  application/        Use cases: the business rules, depending only on domain/
  infrastructure/     Implementations: database, auth, external services
    container.ts      Composition root: wires implementations into use cases
  app/                Presentation: Next.js routes call use cases from the container
  components/         Presentation: React components

Dependencies point inward: app → application → domain, infrastructure → domain.`,
    "vite-react": `src/
  domain/             Entities and repository interfaces. Pure TypeScript, no framework.
  application/        Use cases: the business rules, depending only on domain/
  infrastructure/     Implementations: API clients, storage, external services
    container.ts      Composition root: wires implementations into use cases
  app/                Presentation: App.tsx and global styles
  components/         Presentation: React components call use cases from the container

Dependencies point inward: components → application → domain, infrastructure → domain.`,
  },
  applyExample(project) {
    const ctx = exampleContext(project);
    const next = project.config.framework === "nextjs";
    if (next) addRouteBoundaries(project, ctx);

    project.addFile("src/domain/entities/user.ts", USER_TYPE);

    project.addFile(
      "src/domain/repositories/user-repository.ts",
      `import type { User } from "../entities/user";

export interface UserRepository {
  findAll(): Promise<User[]>;
}
`,
    );

    project.addFile(
      "src/application/use-cases/list-users.ts",
      `import type { User } from "@/domain/entities/user";
import type { UserRepository } from "@/domain/repositories/user-repository";

/** Lists users sorted by name. */
export function listUsers(users: UserRepository) {
  return async (): Promise<User[]> => {
    const all = await users.findAll();
    return all.sort((a, b) => a.name.localeCompare(b.name));
  };
}
`,
    );

    const hint = project.has("prisma") || project.has("drizzle")
      ? `a database-backed implementation using ${project.importPath(project.paths.db)}`
      : next
        ? "a database-backed implementation"
        : "an implementation that calls your API";
    project.addFile(
      "src/infrastructure/repositories/in-memory-user-repository.ts",
      `import type { User } from "@/domain/entities/user";
import type { UserRepository } from "@/domain/repositories/user-repository";

/** Replace with ${hint}. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users: User[] = [
    { id: "1", name: "Alan Turing", email: "alan@example.com" },
    { id: "2", name: "Ada Lovelace", email: "ada@example.com" },
  ];

  async findAll(): Promise<User[]> {
    return [...this.users];
  }
}
`,
    );

    project.addFile(
      "src/infrastructure/container.ts",
      `import { listUsers } from "@/application/use-cases/list-users";
import { InMemoryUserRepository } from "./repositories/in-memory-user-repository";

const userRepository = new InMemoryUserRepository();

/** Use cases wired with their implementations. */
export const useCases = {
  listUsers: listUsers(userRepository),
};
`,
    );

    project.addFile("src/components/user-list.tsx", userListComponent(ctx, "@/domain/entities/user"));

    if (next) {
      project.addFile(
        "src/app/users/page.tsx",
        `import { cacheLife } from "next/cache";
import { UserList } from "@/components/user-list";
import { useCases } from "@/infrastructure/container";

export default async function UsersPage() {
  "use cache";
  cacheLife("hours");
  const users = await useCases.listUsers();
  return ${usersPageBody(ctx)};
}
`,
      );
    } else {
      project.addFile(
        "src/components/users-section.tsx",
        usersSection(
          ctx,
          `import { useCases } from "@/infrastructure/container";\nimport { UserList } from "./user-list";`,
          "useCases.listUsers()",
        ),
      );
      project.addHomeSection(`import { UsersSection } from "@/components/users-section";`, "<UsersSection />");
    }
  },
};

interface ExampleContext {
  tw: boolean;
  muted: string;
}

function exampleContext(project: ProjectBuilder): ExampleContext {
  return {
    tw: project.has("tailwind"),
    muted: project.has("shadcn") ? "text-muted-foreground" : "text-zinc-600 dark:text-zinc-400",
  };
}

const USER_TYPE = `export interface User {
  id: string;
  name: string;
  email: string;
}
`;

const USERS = `[
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Alan Turing", email: "alan@example.com" },
  ]`;

/** error.tsx, not-found.tsx and a loading state: the App Router conventions for resilient routes. */
function addRouteBoundaries(project: ProjectBuilder, { tw, muted }: ExampleContext): void {
  const { app, ui } = project.paths;
  const shadcn = project.has("shadcn");
  const main = tw
    ? ' className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center"'
    : ' className="page"';
  const title = tw ? ' className="text-2xl font-bold"' : "";
  const text = tw ? ` className="${muted}"` : "";
  const button = shadcn ? "Button" : "button";
  const buttonImport = shadcn ? `import { Button } from "${project.importPath(`${ui}/button.tsx`)}";\n` : "";
  const buttonClass = !shadcn && tw ? ' className="rounded-md border px-4 py-2 text-sm font-medium"' : "";

  project.addFile(
    `${app}/error.tsx`,
    `"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
${buttonImport}
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Report the error to your monitoring service here.
    console.error(error);
  }, [error]);

  return (
    <main${main}>
      <h1${title}>Something went wrong</h1>
      <p${text}>{error.digest ? "Error reference: " + error.digest : "An unexpected error occurred."}</p>
      <${button} type="button"${buttonClass} onClick={() => retry()}>
        Try again
      </${button}>
    </main>
  );
}
`,
  );

  project.addFile(
    `${app}/not-found.tsx`,
    `import Link from "next/link";

export default function NotFound() {
  return (
    <main${main}>
      <h1${title}>Page not found</h1>
      <p${text}>The page you are looking for does not exist.</p>
      <Link href="/"${tw ? ' className="text-sm font-medium underline underline-offset-4"' : ""}>
        Back to home
      </Link>
    </main>
  );
}
`,
  );

  project.addFile(
    `${app}/users/loading.tsx`,
    `export default function Loading() {
  return (
    <main${main}>
      <p${text}>Loading users…</p>
    </main>
  );
}
`,
  );
}

function userListComponent({ tw, muted }: ExampleContext, typesImport: string): string {
  return `import type { User } from "${typesImport}";

export function UserList({ users }: { users: User[] }) {
  return (
    <ul${tw ? ' className="w-full max-w-md divide-y rounded-lg border"' : ""}>
      {users.map((user) => (
        <li key={user.id}${tw ? ' className="flex flex-col p-4 text-left"' : ""}>
          <span${tw ? ' className="font-medium"' : ""}>{user.name}</span>
          <span${tw ? ` className="text-sm ${muted}"` : ""}>{user.email}</span>
        </li>
      ))}
    </ul>
  );
}
`;
}

function usersPageBody({ tw }: ExampleContext): string {
  return tw
    ? `(
    <main className="flex flex-1 flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Users</h1>
      <UserList users={users} />
    </main>
  )`
    : `(
    <main className="page">
      <h1>Users</h1>
      <UserList users={users} />
    </main>
  )`;
}

/** Client-side data loading for SPAs: React 19's use() suspends until the promise resolves. */
function usersSection({ tw, muted }: ExampleContext, imports: string, load: string): string {
  return `import { Suspense, use } from "react";
${imports}

// Started once when the module loads; use() suspends until it resolves.
const usersPromise = ${load};

function Users() {
  const users = use(usersPromise);
  return <UserList users={users} />;
}

export function UsersSection() {
  return (
    <section${tw ? ' className="flex w-full flex-col items-center gap-4"' : ' className="section"'}>
      <h2${tw ? ' className="text-xl font-semibold"' : ""}>Users</h2>
      <Suspense fallback={<p${tw ? ` className="${muted}"` : ""}>Loading users…</p>}>
        <Users />
      </Suspense>
    </section>
  );
}
`;
}

export const ARCHITECTURES: readonly Architecture[] = [simple, feature, clean];

export function getArchitecture(id: string): Architecture | undefined {
  return ARCHITECTURES.find((a) => a.id === id);
}
