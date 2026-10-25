# StackCraft

**Craft your stack, start coding.** StackCraft is an open-source project initializer. Think [start.spring.io](https://start.spring.io), but for the JavaScript ecosystem.

Pick a framework, add the dependencies you need (Tailwind, shadcn/ui, Prisma, Auth.js, Vitest, Docker…), and download a ready-to-code project where everything is already wired together.

## Features

- 🧩 **Modules, not boilerplates**: every dependency is a small module that adds its packages, config files, scripts, env vars and docs.
- 🔗 **Smart resolution**: requirements are added automatically (shadcn/ui → Tailwind), conflicts are blocked (Prisma ✕ Drizzle).
- 🤝 **Modules know each other**: Prettier sorts Tailwind classes when Tailwind is there, Docker adds a PostgreSQL `docker-compose.yml` when you pick a database, Zod validates the env vars other modules declare.
- 🏗️ **Pick your architecture**: Simple (standard Next.js), Feature-based (`src/features/*`) or Clean Architecture (domain / application / infrastructure). Every module adapts its files to it, and an example feature shows the pattern.
- 🎨 **Your colors, light and dark**: pick a preset, type your design system's colors or paste its CSS variables / JSON tokens. You get CSS variables for both modes, readable text on every color, a light / dark / system switch and no flash on load.
- 👀 **Explore before downloading**: browse every generated file in the browser.
- 🚀 **Push to GitHub**: sign in with GitHub and get a new repository (public or private) with the project as its first commit.
- 🔗 **Shareable**: the URL holds the whole configuration.
- ⚙️ **API**: `curl` a project directly.

## Available modules

| Category | Modules |
| --- | --- |
| Styling & UI | Tailwind CSS v4, shadcn/ui, [bref-ui](https://github.com/feuersteiner/bref-ui), Animated Icons ([icons-animated](https://icons.lndev.me)), Motion |
| 3D | Three.js (React Three Fiber + Drei) |
| Database | Prisma 7, Drizzle ORM |
| Authentication | Auth.js (NextAuth v5), Better Auth |
| State & Validation | Zustand, Zod |
| Performance | React Compiler |
| Code Quality | ESLint, Prettier |
| Testing | Vitest + Testing Library |
| Deployment | Docker |
| AI | [Svelte AI tools](https://svelte.dev/docs/ai/overview) (MCP server, skills, `AGENTS.md`) |

Frameworks:

- **Next.js** (App Router, TypeScript): every module.
- **Vite + React** (TypeScript, single-page app): every module that runs in the browser. Prisma, Drizzle, Auth.js and Better Auth need a server, so they are Next.js only.
- **SvelteKit** (Svelte 5, TypeScript): Tailwind CSS, bref-ui, Zod, ESLint, Prettier, Vitest, Docker and Svelte AI tools. bref-ui and Svelte AI tools are SvelteKit only.

Next on the roadmap: NestJS, TanStack Start and Astro.

## Use the API

```bash
curl -o my-app.zip "https://<your-instance>/api/generate?name=my-app&pm=pnpm&modules=shadcn,prisma,nextauth"
```

Parameters: `name`, `description`, `fw` (nextjs, vite-react, sveltekit), `pm` (npm, pnpm, yarn, bun), `arch` (simple, feature, clean), `modules`, `theme` (neutral, orange, bref, or the encoded colors of a shared link).

`POST /api/generate` accepts the same config as JSON: `{ "name", "description", "framework", "packageManager", "architecture", "modules": [], "theme" }`, where `theme` is a preset id or `{ "light": { "primary": "#f16e00", … }, "dark": { … } }`.

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
npm run generate -- --name demo --framework vite-react --modules shadcn,vitest --pm npm --arch feature --out ../
```

## Project structure

```
apps/web            Next.js UI + /api/generate
packages/core       Generation engine (framework-agnostic TypeScript)
  src/modules/      One file per module, start here to contribute
  src/frameworks/   Base templates (Next.js, Vite + React, SvelteKit)
  src/architectures.ts  Folder layouts (Simple, Feature-based, Clean) and their examples
  src/templates/    Base project templates (Next.js)
  src/versions.ts   Every dependency version, in one place
```

## Roadmap

- [x] Next.js generator, 18 modules, ZIP download, file explorer, shareable links
- [x] Architectures: Simple, Feature-based, Clean Architecture
- [x] Push to a new GitHub repository (OAuth)
- [x] Next.js 16.4 best practices: Cache Components, `server-only`, error boundaries, `AGENTS.md`
- [ ] CLI: `npx create-stackcraft`
- [x] Vite + React
- [x] SvelteKit, with bref-ui
- [x] Custom themes: light and dark colors, mode switch, design system import
- [ ] More frameworks: NestJS, TanStack Start, Astro, then Nuxt
- [ ] More modules: Supabase, tRPC, TanStack Query, Playwright, Storybook, i18n…
- [ ] GitLab export

## Contributing

Contributions are very welcome! Adding a module is usually a single file. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits

- [bref-ui](https://github.com/feuersteiner/bref-ui) by [feuersteiner](https://github.com/feuersteiner): the Svelte 5 components of the bref-ui module, whose default palette is also the Bref theme preset.
- [Svelte AI tools](https://github.com/sveltejs/ai-tools) by the Svelte team: the instructions, plugin and MCP setup of the Svelte AI tools module, as in `npx sv add ai-tools`.
- [icons-animated](https://icons.lndev.me): the Animated Icons module.
- [Spring Initializr](https://start.spring.io), which inspired the web UI.

## License

[MIT](LICENSE)
