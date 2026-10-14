import type { ProjectBuilder } from "./builder";

export type ArchitectureId = "simple" | "feature" | "clean";

/**
 * Where each kind of file lives. Modules never hardcode folders: they ask
 * `project.paths` so the same module fits every architecture.
 */
export interface ProjectPaths {
  /** "src/" when code lives under src, "" otherwise. Drives the "@/*" alias. */
  srcDir: "" | "src/";
  /** Next.js App Router folder. */
  app: string;
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
  /** Database client and schema. */
  db: string;
  /** Auth.js configuration file. */
  auth: string;
  /** Generated code (Prisma client). */
  generated: string;
}

export interface Architecture {
  id: ArchitectureId;
  name: string;
  description: string;
  paths: ProjectPaths;
  /** Folder overview for the generated README. */
  tree: string;
  /** Example code showing how to organize a feature in this architecture. */
  applyExample?(project: ProjectBuilder): void;
}

const simple: Architecture = {
  id: "simple",
  name: "Simple",
  description: "Standard Next.js layout. Great for small apps and prototypes.",
  paths: {
    srcDir: "",
    app: "app",
    components: "components",
    ui: "components/ui",
    lib: "lib",
    hooks: "hooks",
    stores: "stores",
    db: "db",
    auth: "auth.ts",
    generated: "generated",
  },
  tree: `app/            Routes, layouts and pages
components/     React components (ui/ for primitives)
lib/            Utilities
db/             Database client and schema
stores/         Client state`,
};

const feature: Architecture = {
  id: "feature",
  name: "Feature-based",
  description: "Code grouped by business feature. Scales well for medium and large apps.",
  paths: {
    srcDir: "src/",
    app: "src/app",
    components: "src/shared/components",
    ui: "src/shared/ui",
    lib: "src/shared/lib",
    hooks: "src/shared/hooks",
    stores: "src/shared/stores",
    db: "src/server/db",
    auth: "src/server/auth.ts",
    generated: "src/generated",
  },
  tree: `src/
  app/                Routes only: thin pages that compose features
  features/
    users/            One folder per feature
      components/     UI of the feature
      queries.ts      Data access of the feature
      types.ts
  shared/             Code used by several features (ui/, lib/, stores/)
  server/             Server-only infrastructure (db/, auth.ts)

Rule of thumb: a feature may import from shared/ and server/, never from another feature.`,
  applyExample(project) {
    const tw = project.has("tailwind");
    const muted = project.has("shadcn") ? "text-muted-foreground" : "text-zinc-600 dark:text-zinc-400";

    project.addFile(
      "src/features/users/types.ts",
      `export interface User {
  id: string;
  name: string;
  email: string;
}
`,
    );

    project.addFile(
      "src/features/users/queries.ts",
      `import { cacheLife } from "next/cache";
import type { User } from "./types";

/**
 * Data access for the users feature, cached with Cache Components.
 * Replace the in-memory list with your database${project.has("prisma") || project.has("drizzle") ? ` (see ${project.importPath(project.paths.db)})` : ""}.
 */
export async function getUsers(): Promise<User[]> {
  "use cache";
  cacheLife("hours");
  return [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Alan Turing", email: "alan@example.com" },
  ];
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

    project.addFile("src/features/users/components/user-list.tsx", userListComponent(tw, muted, "../types"));

    project.addFile(
      "src/app/users/page.tsx",
      `import { UserList } from "@/features/users/components/user-list";
import { getUsers } from "@/features/users/queries";

export default async function UsersPage() {
  const users = await getUsers();
  return ${usersPageBody(tw)};
}
`,
    );
  },
};

const clean: Architecture = {
  id: "clean",
  name: "Clean Architecture",
  description: "Layered domain / application / infrastructure. Familiar if you come from Spring or .NET.",
  paths: {
    srcDir: "src/",
    app: "src/app",
    components: "src/components",
    ui: "src/components/ui",
    lib: "src/lib",
    hooks: "src/hooks",
    stores: "src/stores",
    db: "src/infrastructure/database",
    auth: "src/infrastructure/auth.ts",
    generated: "src/generated",
  },
  tree: `src/
  domain/             Entities and repository interfaces. Pure TypeScript, no framework.
  application/        Use cases: the business rules, depending only on domain/
  infrastructure/     Implementations: database, auth, external services
    container.ts      Composition root: wires implementations into use cases
  app/                Presentation: Next.js routes call use cases from the container
  components/         Presentation: React components

Dependencies point inward: app → application → domain, infrastructure → domain.`,
  applyExample(project) {
    const tw = project.has("tailwind");
    const muted = project.has("shadcn") ? "text-muted-foreground" : "text-zinc-600 dark:text-zinc-400";

    project.addFile(
      "src/domain/entities/user.ts",
      `export interface User {
  id: string;
  name: string;
  email: string;
}
`,
    );

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

    project.addFile(
      "src/infrastructure/repositories/in-memory-user-repository.ts",
      `import type { User } from "@/domain/entities/user";
import type { UserRepository } from "@/domain/repositories/user-repository";

/** Replace with a database-backed implementation${project.has("prisma") || project.has("drizzle") ? ` using ${project.importPath(project.paths.db)}` : ""}. */
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

    project.addFile("src/components/user-list.tsx", userListComponent(tw, muted, "@/domain/entities/user"));

    project.addFile(
      "src/app/users/page.tsx",
      `import { cacheLife } from "next/cache";
import { UserList } from "@/components/user-list";
import { useCases } from "@/infrastructure/container";

export default async function UsersPage() {
  "use cache";
  cacheLife("hours");
  const users = await useCases.listUsers();
  return ${usersPageBody(tw)};
}
`,
    );
  },
};

function userListComponent(tw: boolean, muted: string, typesImport: string): string {
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

function usersPageBody(tw: boolean): string {
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

export const ARCHITECTURES: readonly Architecture[] = [simple, feature, clean];

export function getArchitecture(id: string): Architecture | undefined {
  return ARCHITECTURES.find((a) => a.id === id);
}
