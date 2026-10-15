import type { ProjectBuilder } from "../builder";
import type { StackModule } from "../types";

export const betterAuth: StackModule = {
  id: "better-auth",
  name: "Better Auth",
  description: "Framework-agnostic TypeScript auth: email and password with a database, GitHub OAuth, plugins.",
  category: "auth",
  homepage: "https://www.better-auth.com",
  conflicts: ["nextauth"],
  frameworks: ["nextjs"],
  apply(project) {
    const { paths } = project;
    const database = project.has("prisma") ? "prisma" : project.has("drizzle") ? "drizzle" : null;

    project
      .addDependency("better-auth", "server-only")
      .addEnv({
        key: "BETTER_AUTH_SECRET",
        value: "",
        comment: "Generate one with: openssl rand -base64 32",
      })
      .addEnv({ key: "BETTER_AUTH_URL", value: "http://localhost:3000", comment: "Base URL of the app" })
      .addEnv({
        key: "GITHUB_CLIENT_ID",
        value: "",
        comment: "GitHub OAuth app: https://github.com/settings/developers",
      })
      .addEnv({ key: "GITHUB_CLIENT_SECRET", value: "" });

    if (database === "prisma") addPrismaModels(project);
    if (database === "drizzle") addDrizzleTables(project);

    const imports = [
      `import "server-only";`,
      `import { betterAuth } from "better-auth";`,
      ...(database === "prisma" ? [`import { prismaAdapter } from "better-auth/adapters/prisma";`] : []),
      ...(database === "drizzle" ? [`import { drizzleAdapter } from "better-auth/adapters/drizzle";`] : []),
      `import { nextCookies } from "better-auth/next-js";`,
      ...(database === "prisma" ? [`import { prisma } from "${project.importPath(paths.db)}";`] : []),
      ...(database === "drizzle"
        ? [
            `import { db } from "${project.importPath(paths.db)}";`,
            `import * as schema from "${project.importPath(`${paths.db}/schema.ts`)}";`,
          ]
        : []),
    ];

    const databaseOption =
      database === "prisma"
        ? `  database: prismaAdapter(prisma, { provider: "postgresql" }),\n  emailAndPassword: { enabled: true },\n`
        : database === "drizzle"
          ? `  database: drizzleAdapter(db, { provider: "pg", schema }),\n  emailAndPassword: { enabled: true },\n`
          : `  // No database selected: sessions are stateless (stored in an encrypted cookie).\n  // Add Prisma or Drizzle to enable email and password sign-in.\n`;

    project.addFile(
      paths.auth,
      `${imports.join("\n")}

// \`next build\` loads this module without runtime secrets, and Better Auth refuses to start
// in production without one. The placeholder only exists during the build: at runtime the
// real BETTER_AUTH_SECRET is required.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (isBuild ? "next-build-placeholder-secret-not-used-at-runtime-7f3c9a" : undefined),
${databaseOption}  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  // Lets Server Actions set auth cookies.
  plugins: [nextCookies()],
});
`,
    );

    project.addFile(
      `${paths.app}/api/auth/[...all]/route.ts`,
      `import { toNextJsHandler } from "better-auth/next-js";
import { connection } from "next/server";
import { auth } from "${project.importPath(paths.auth)}";

const handler = toNextJsHandler(auth);

export async function GET(request: Request) {
  // Auth depends on runtime secrets and cookies: never prerender it at build time.
  await connection();
  return handler.GET(request);
}

export const { POST } = handler;
`,
    );

    project.addFile(
      `${paths.lib}/auth-client.ts`,
      `import { createAuthClient } from "better-auth/react";

/** Use in Client Components: authClient.signIn.social({ provider: "github" }), authClient.useSession()… */
export const authClient = createAuthClient();
`,
    );

    const steps = [
      "1. Create a GitHub OAuth app with the callback URL `http://localhost:3000/api/auth/callback/github`.",
      "2. Fill `BETTER_AUTH_SECRET`, `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in `.env`.",
      ...(database
        ? [`3. Create the auth tables: \`${project.run("db:push")}\` (they are already in the schema).`]
        : []),
      `${database ? 4 : 3}. Server side: \`await auth.api.getSession({ headers: await headers() })\` (from \`${project.importPath(paths.auth)}\`). Client side: \`authClient\` from \`${project.importPath(`${paths.lib}/auth-client.ts`)}\`.`,
    ];
    project.addReadmeSection(
      "Authentication (Better Auth)",
      `${steps.join("\n")}${database ? "" : "\n\nNo database was selected, so sessions are stateless and only GitHub sign-in is enabled. Add Prisma or Drizzle for email and password."}

Docs: https://www.better-auth.com/docs/integrations/next`,
    );
  },
};

/** Better Auth core schema (user, session, account, verification) for Prisma. */
function addPrismaModels(project: ProjectBuilder): void {
  project.editFile("prisma/schema.prisma", (schema) =>
    schema.replace(
      /model User \{[\s\S]*?\n\}\n/,
      `model User {
  id            String    @id
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]

  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}
`,
    ),
  );
}

/** Better Auth core schema (user, session, account, verification) for Drizzle. */
function addDrizzleTables(project: ProjectBuilder): void {
  project.addFile(
    `${project.paths.db}/schema.ts`,
    `import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Tables required by Better Auth. Add your own tables below.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export type User = typeof user.$inferSelect;
`,
  );
}
