import type { StackModule } from "../types";

export const prisma: StackModule = {
  id: "prisma",
  name: "Prisma",
  description: "Type-safe ORM with schema-first data modeling (PostgreSQL).",
  category: "database",
  homepage: "https://www.prisma.io",
  conflicts: ["drizzle"],
  apply(project) {
    project
      .addDependency("@prisma/client", "@prisma/adapter-pg")
      .addDevDependency("prisma", "dotenv")
      .addScript("postinstall", "prisma generate")
      .addScript("db:push", "prisma db push")
      .addScript("db:migrate", "prisma migrate dev")
      .addScript("db:studio", "prisma studio")
      .addEnv({
        key: "DATABASE_URL",
        value: "postgresql://postgres:postgres@localhost:5432/app",
        comment: "PostgreSQL connection string",
      })
      .addGitignore("prisma", "/generated/prisma");

    project.addFile(
      "prisma.config.ts",
      `import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Optional here so "prisma generate" (postinstall) works before .env exists.
    url: process.env.DATABASE_URL ?? "",
  },
});
`,
    );

    project.addFile(
      "prisma/schema.prisma",
      `generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`,
    );

    project.addFile(
      "lib/prisma.ts",
      `import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
`,
    );

    project.addReadmeSection(
      "Database (Prisma)",
      `1. Start a PostgreSQL database and set \`DATABASE_URL\` in \`.env\`.
2. Push the schema: \`${project.run("db:push")}\` (or create a migration with \`${project.run("db:migrate")}\`).
3. Import the client with \`import { prisma } from "@/lib/prisma"\`.

The schema lives in \`prisma/schema.prisma\`; the client is generated into \`generated/prisma\` on install.`,
    );
  },
};
