import type { ProjectBuilder } from "../builder";
import type { PackageManager, StackModule } from "../types";

const INSTALL: Record<PackageManager, { lockfile: string; setup: string; install: string; build: string }> = {
  npm: { lockfile: "package-lock.json", setup: "", install: "npm ci", build: "npm run build" },
  pnpm: {
    lockfile: "pnpm-lock.yaml",
    setup: "RUN corepack enable pnpm\n",
    install: "pnpm install --frozen-lockfile",
    build: "pnpm run build",
  },
  yarn: {
    lockfile: "yarn.lock",
    setup: "RUN corepack enable\n",
    install: "yarn install --frozen-lockfile",
    build: "yarn build",
  },
  bun: {
    lockfile: "bun.lock",
    setup: "RUN npm install -g bun\n",
    install: "bun install --frozen-lockfile",
    build: "bun run build",
  },
};

export const docker: StackModule = {
  id: "docker",
  name: "Docker",
  description: "Production Dockerfile (standalone output) and docker-compose for local services.",
  category: "deployment",
  homepage: "https://nextjs.org/docs/app/getting-started/deploying#docker",
  apply(project) {
    project.setNextConfig("output", '"standalone"');

    const pm = INSTALL[project.config.packageManager];
    const extraPmFiles = project.config.packageManager === "pnpm" && project.has("prisma") ? " pnpm-workspace.yaml" : "";
    // Prisma generates its client on postinstall, so the schema must be there before installing.
    const prismaFiles = project.has("prisma") ? "COPY prisma ./prisma\nCOPY prisma.config.ts ./\n" : "";

    project.addFile(
      "Dockerfile",
      `# syntax=docker/dockerfile:1
FROM node:24-alpine AS base

# Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
${pm.setup}COPY package.json ${pm.lockfile}${extraPmFiles} ./
${prismaFiles}RUN ${pm.install}

# Build the app
FROM base AS builder
WORKDIR /app
${pm.setup}COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN ${pm.build}

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
`,
    );

    project.addFile(
      ".dockerignore",
      ["node_modules", ".next", ".git", "Dockerfile", ".dockerignore", ".env*", "!.env.example", "coverage"].join("\n"),
    );

    const usesPostgres = project.has("prisma") || project.has("drizzle");
    if (usesPostgres) project.addFile("docker-compose.yml", composeFile());

    project.addReadmeSection("Docker", dockerReadme(project, usesPostgres, pm.lockfile));
  },
};

function composeFile(): string {
  return `services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    ports:
      - "5432:5432"
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:
`;
}

function dockerReadme(project: ProjectBuilder, usesPostgres: boolean, lockfile: string): string {
  const lines = [
    `Build and run the production image (run \`${project.installCommand()}\` first so \`${lockfile}\` exists):`,
    "",
    "```bash",
    `docker build -t ${project.config.name} .`,
    `docker run -p 3000:3000 ${project.config.name}`,
    "```",
  ];
  if (usesPostgres) {
    lines.push("", "Start a local PostgreSQL matching `.env.example`:", "", "```bash", "docker compose up -d db", "```");
  }
  return lines.join("\n");
}
