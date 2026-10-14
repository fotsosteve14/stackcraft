# StackCraft

**Craft your stack, start coding.** StackCraft is an open-source project initializer. Think [start.spring.io](https://start.spring.io), but for the JavaScript ecosystem.

Pick a framework, add the dependencies you need (Tailwind, shadcn/ui, Prisma, Auth.js, Vitest, Docker…), and download a ready-to-code project where everything is already wired together.

## Features

- 🧩 **Modules, not boilerplates**: every dependency is a small module that adds its packages, config files, scripts, env vars and docs.
- 🔗 **Smart resolution**: requirements are added automatically (shadcn/ui → Tailwind), conflicts are blocked (Prisma ✕ Drizzle).
- 🤝 **Modules know each other**: Prettier sorts Tailwind classes when Tailwind is there, Docker adds a PostgreSQL `docker-compose.yml` when you pick a database, Zod validates the env vars other modules declare.
- 🏗️ **Pick your architecture**: Simple (standard Next.js), Feature-based (`src/features/*`) or Clean Architecture (domain / application / infrastructure). Every module adapts its files to it, and an example feature shows the pattern.
- 👀 **Explore before downloading**: browse every generated file in the browser.
- 🚀 **Push to GitHub**: sign in with GitHub and get a new repository (public or private) with the project as its first commit.
- 🔗 **Shareable**: the URL holds the whole configuration.
- ⚙️ **API**: `curl` a project directly.

## Available modules

| Category | Modules |
| --- | --- |
| Styling & UI | Tailwind CSS v4, shadcn/ui, Animated Icons ([icons-animated](https://icons.lndev.me)) |
| Database | Prisma 7, Drizzle ORM |
| Authentication | Auth.js (NextAuth v5) |
| State & Validation | Zustand, Zod |
| Code Quality | ESLint, Prettier |
| Testing | Vitest + Testing Library |
| Deployment | Docker |

Frameworks: **Next.js** (App Router, TypeScript). Vite, Nuxt and SvelteKit are on the roadmap.

## Use the API

```bash
curl -o my-app.zip "https://<your-instance>/api/generate?name=my-app&pm=pnpm&modules=shadcn,prisma,nextauth"
```

Parameters: `name`, `description`, `pm` (npm, pnpm, yarn, bun), `arch` (simple, feature, clean), `modules`.

`POST /api/generate` accepts the same config as JSON: `{ "name", "description", "packageManager", "architecture", "modules": [] }`.

## Development

Requirements: Node.js ≥ 20.9.

```bash
npm install
npm run dev        # web UI on http://localhost:3000
npm test           # engine tests
npm run typecheck
npm run lint
```

### Enable "Push to GitHub"

1. Create an OAuth App on https://github.com/settings/developers with the callback URL `http://localhost:3000/api/github/callback` (in production: `https://<your-domain>/api/github/callback`).
2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` and `SESSION_SECRET` (`openssl rand -base64 32`).
3. On Vercel, add the same three variables in Project Settings → Environment Variables.

The GitHub token is stored only in an encrypted, `httpOnly` cookie and never reaches the browser's JavaScript. The `repo` scope is requested so private repositories can be created.

Generate a project on disk without the UI:

```bash
npm run generate -- --name demo --modules shadcn,prisma,vitest --pm npm --arch feature --out ../
```

## Project structure

```
apps/web            Next.js UI + /api/generate
packages/core       Generation engine (framework-agnostic TypeScript)
  src/modules/      One file per module, start here to contribute
  src/architectures.ts  Folder layouts (Simple, Feature-based, Clean) and their examples
  src/templates/    Base project templates (Next.js)
  src/versions.ts   Every dependency version, in one place
```

## Roadmap

- [x] Next.js generator, 12 modules, ZIP download, file explorer, shareable links
- [x] Architectures: Simple, Feature-based, Clean Architecture
- [x] Push to a new GitHub repository (OAuth)
- [ ] CLI: `npx create-stackcraft`
- [ ] More frameworks: Vite + React, Nuxt, SvelteKit
- [ ] More modules: Better Auth, Supabase, tRPC, TanStack Query, Playwright, Storybook, i18n…
- [ ] GitLab export

## Contributing

Contributions are very welcome! Adding a module is usually a single file. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
