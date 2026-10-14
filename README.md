# StackCraft

**Craft your stack, start coding.** StackCraft is an open-source project initializer. Think [start.spring.io](https://start.spring.io), but for the JavaScript ecosystem.

Pick a framework, add the dependencies you need (Tailwind, shadcn/ui, Prisma, Auth.js, Vitest, Docker…), and download a ready-to-code project where everything is already wired together.

## Features

- 🧩 **Modules, not boilerplates**: every dependency is a small module that adds its packages, config files, scripts, env vars and docs.
- 🔗 **Smart resolution**: requirements are added automatically (shadcn/ui → Tailwind), conflicts are blocked (Prisma ✕ Drizzle).
- 🤝 **Modules know each other**: Prettier sorts Tailwind classes when Tailwind is there, Docker adds a PostgreSQL `docker-compose.yml` when you pick a database, Zod validates the env vars other modules declare.
- 👀 **Explore before downloading**: browse every generated file in the browser.
- 🔗 **Shareable**: the URL holds the whole configuration.
- ⚙️ **API**: `curl` a project directly.

## Available modules

| Category | Modules |
| --- | --- |
| Styling & UI | Tailwind CSS v4, shadcn/ui |
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

`POST /api/generate` accepts the same config as JSON: `{ "name", "description", "packageManager", "modules": [] }`.

## Development

Requirements: Node.js ≥ 20.9.

```bash
npm install
npm run dev        # web UI on http://localhost:3000
npm test           # engine tests
npm run typecheck
npm run lint
```

Generate a project on disk without the UI:

```bash
npm run generate -- --name demo --modules shadcn,prisma,vitest --pm npm --out ../
```

## Project structure

```
apps/web            Next.js UI + /api/generate
packages/core       Generation engine (framework-agnostic TypeScript)
  src/modules/      One file per module, start here to contribute
  src/templates/    Base project templates (Next.js)
  src/versions.ts   Every dependency version, in one place
```

## Roadmap

- [x] Next.js generator, 11 modules, ZIP download, file explorer, shareable links
- [ ] Push to a new GitHub repository (OAuth)
- [ ] CLI: `npx create-stackcraft`
- [ ] More frameworks: Vite + React, Nuxt, SvelteKit
- [ ] More modules: Better Auth, Supabase, tRPC, TanStack Query, Playwright, Storybook, i18n…
- [ ] GitLab export

## Contributing

Contributions are very welcome! Adding a module is usually a single file. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
