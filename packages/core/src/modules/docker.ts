import type { ProjectBuilder } from "../builder";
import type { PackageManager, StackModule } from "../types";

const INSTALL: Record<
  PackageManager,
  { lockfile: string; setup: string; install: string; prodInstall: string; build: string }
> = {
  npm: { lockfile: "package-lock.json", setup: "", install: "npm ci", prodInstall: "npm ci --omit=dev", build: "npm run build" },
  pnpm: {
    lockfile: "pnpm-lock.yaml",
    setup: "RUN corepack enable pnpm\n",
    install: "pnpm install --frozen-lockfile",
    prodInstall: "pnpm install --frozen-lockfile --prod",
    build: "pnpm run build",
  },
  yarn: {
    lockfile: "yarn.lock",
    setup: "RUN corepack enable\n",
    install: "yarn install --frozen-lockfile",
    prodInstall: "yarn install --frozen-lockfile --production",
    build: "yarn build",
  },
  bun: {
    lockfile: "bun.lock",
    setup: "RUN npm install -g bun\n",
    install: "bun install --frozen-lockfile",
    prodInstall: "bun install --frozen-lockfile --production",
    build: "bun run build",
  },
};

export const docker: StackModule = {
  id: "docker",
  name: "Docker",
  description:
    "Production Dockerfile (Node server for Next.js and SvelteKit, nginx for SPAs) and docker-compose for local services.",
  category: "deployment",
  homepage: "https://nextjs.org/docs/app/getting-started/deploying#docker",
  apply(project) {
    const pm = INSTALL[project.config.packageManager];

    if (project.config.framework === "sveltekit") {
      // svelte.config.js switches to adapter-node when Docker is selected: `node build` starts the server.
      project.addFile(
        "Dockerfile",
        `# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
${pm.setup}COPY package.json ${pm.lockfile} ./
RUN ${pm.install}
COPY . .
RUN ${pm.build}

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
${pm.setup}COPY package.json ${pm.lockfile} ./
RUN ${pm.prodInstall}
COPY --from=builder /app/build ./build

USER node
EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "build"]
`,
      );
      project.addFile(
        ".dockerignore",
        ["node_modules", ".svelte-kit", "build", ".git", "Dockerfile", ".dockerignore", ".env*", "!.env.example", "coverage"].join(
          "\n",
        ),
      );
      project.addReadmeSection("Docker", dockerReadme(project, false, pm.lockfile));
      return;
    }

    if (project.config.framework !== "nextjs") {
      // A SPA is static files: build with Node, serve with nginx.
      project.addFile(
        "Dockerfile",
        `# syntax=docker/dockerfile:1
FROM node:24-alpine AS builder
WORKDIR /app
${pm.setup}COPY package.json ${pm.lockfile} ./
RUN ${pm.install}
COPY . .
RUN ${pm.build}

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
`,
      );
      project.addFile(
        "nginx.conf",
        `server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Hashed assets never change: cache them for a year.
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Single-page app: unknown paths fall back to index.html.
  location / {
    try_files $uri $uri/ /index.html;
  }
}
`,
      );
      project.addFile(
        ".dockerignore",
        ["node_modules", "dist", ".git", "Dockerfile", ".dockerignore", ".env*", "!.env.example", "coverage"].join("\n"),
      );
      project.addReadmeSection("Docker", dockerReadme(project, false, pm.lockfile, "8080:80"));
      return;
    }

    project.setNextConfig("output", '"standalone"');
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

    const usesPostgres = project.has("prisma") || project.has("drizzle") || project.has("payload");
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

function dockerReadme(project: ProjectBuilder, usesPostgres: boolean, lockfile: string, ports = "3000:3000"): string {
  const lines = [
    `Build and run the production image (run \`${project.installCommand()}\` first so \`${lockfile}\` exists):`,
    "",
    "```bash",
    `docker build -t ${project.config.name} .`,
    `docker run -p ${ports} ${project.config.name}`,
    "```",
  ];
  if (usesPostgres) {
    lines.push("", "Start a local PostgreSQL matching `.env.example`:", "", "```bash", "docker compose up -d db", "```");
  }
  return lines.join("\n");
}
