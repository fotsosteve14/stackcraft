import type { StackModule } from "../types";

export const drizzle: StackModule = {
  id: "drizzle",
  name: "Drizzle ORM",
  description: "Lightweight, SQL-like TypeScript ORM (PostgreSQL).",
  category: "database",
  homepage: "https://orm.drizzle.team",
  conflicts: ["prisma"],
  apply(project) {
    const { paths } = project;
    project
      .addDependency("drizzle-orm", "postgres")
      .addDevDependency("drizzle-kit", "dotenv")
      .addScript("db:generate", "drizzle-kit generate")
      .addScript("db:migrate", "drizzle-kit migrate")
      .addScript("db:push", "drizzle-kit push")
      .addScript("db:studio", "drizzle-kit studio")
      .addEnv({
        key: "DATABASE_URL",
        value: "postgresql://postgres:postgres@localhost:5432/app",
        comment: "PostgreSQL connection string",
      });

    project.addFile(
      "drizzle.config.ts",
      `import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./${paths.db}/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`,
    );

    project.addFile(
      `${paths.db}/schema.ts`,
      `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`,
    );

    project.addFile(
      `${paths.db}/index.ts`,
      `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { client?: postgres.Sql };

const client = globalForDb.client ?? postgres(process.env.DATABASE_URL!);
if (process.env.NODE_ENV !== "production") globalForDb.client = client;

export const db = drizzle(client, { schema });
`,
    );

    project.addReadmeSection(
      "Database (Drizzle)",
      `1. Start a PostgreSQL database and set \`DATABASE_URL\` in \`.env\`.
2. Push the schema: \`${project.run("db:push")}\` (or \`${project.run("db:generate")}\` + \`${project.run("db:migrate")}\` for migrations).
3. Query with \`import { db } from "${project.importPath(paths.db)}"\`.`,
    );
  },
};
