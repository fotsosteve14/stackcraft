# Changelog

All notable changes to StackCraft are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vite + React** framework, based on `create-vite` 9.2 (Vite 8, TypeScript 6, `@` alias). Simple, Feature-based and Clean architectures; examples render on the home page with React 19 `use()` and `Suspense`.
- Modules adapt to the framework: Tailwind uses `@tailwindcss/vite`, React Compiler goes through `@rolldown/plugin-babel`, ESLint uses the create-vite rules (React Hooks, React Refresh), Docker serves the SPA with nginx, Zod validates `import.meta.env`, Three.js is lazy-loaded with `React.lazy`.
- Server-only modules (Prisma, Drizzle, Auth.js, Better Auth) are limited to Next.js. The UI greys them out and removes them when switching framework.
- `fw` parameter in the API and shareable links.

## [0.2.0] - 2026-10-15

Next.js 16.4 best practices and 4 new modules (16 in total).

### Added

- Generated projects follow the `create-next-app` 16.4 defaults: Cache Components and Partial Prefetching are enabled, and an `AGENTS.md` points AI coding agents to the bundled Next.js docs.
- `typecheck` script (`next typegen && tsc --noEmit`) in generated projects.
- Database clients and the Auth.js config import `server-only`, so they can never end up in a client bundle.
- The example `users` feature (Feature-based and Clean) shows the `"use cache"` + `cacheLife` pattern.
- Feature-based and Clean projects include `error.tsx` (with the Next.js 16 `retry` prop), `not-found.tsx` and a `loading.tsx` for `/users`.
- **Better Auth** module: email and password plus GitHub OAuth with Prisma or Drizzle (auth tables added to the schema), stateless GitHub sign-in without a database. Conflicts with Auth.js.
- Dependabot keeps StackCraft's dependencies up to date (weekly, with a cooldown on fresh releases; ESLint 10 ignored until `eslint-config-next` supports it).
- **Motion** module with an accessible `FadeIn` example (respects reduced motion). When Animated Icons is also selected, its exact Motion version is kept.
- **Three.js** module (React Three Fiber + Drei) in a new 3D category: a client-only scene loaded with `next/dynamic` and a `/scene` example page.
- **React Compiler** module (`reactCompiler: true`, same setup as `create-next-app`), in a new Performance category.

### Changed

- StackCraft itself runs with Cache Components and ships an `AGENTS.md`.

### Fixed

- GitHub API routes are always rendered per request (`connection()`), so the sign-in status is never frozen at build time.
- ESLint is pinned to `^9` (like `create-next-app`): the plugins used by `eslint-config-next` 16.4 do not support ESLint 10 yet, which caused peer dependency warnings on install.

## [0.1.0] - 2026-10-14

First public version.

### Added

- **Next.js generator** (App Router, TypeScript) with npm, pnpm, yarn and bun support.
- **12 modules**, each one wiring its packages, config files, scripts, env vars and README section:
  - Styling & UI: Tailwind CSS v4, shadcn/ui, Animated Icons ([icons-animated](https://icons.lndev.me))
  - Database: Prisma 7, Drizzle ORM
  - Authentication: Auth.js (NextAuth v5)
  - State & Validation: Zustand, Zod
  - Code Quality: ESLint, Prettier
  - Testing: Vitest with Testing Library
  - Deployment: Docker (standalone output, docker-compose with PostgreSQL when a database is selected)
- **Dependency resolution**: required modules are added automatically (shadcn/ui adds Tailwind CSS) and conflicting modules are blocked (Prisma and Drizzle).
- **Architectures**: Simple, Feature-based and Clean Architecture. Modules place their files according to the chosen layout, and Feature-based and Clean generate an example `users` feature.
- **Web UI** inspired by Spring Initializr: dependency search, file explorer, shareable links and keyboard shortcuts.
- **ZIP download** and **API**: `GET /api/generate?name=…&pm=…&arch=…&modules=…` and `POST /api/generate`.
- **Push to GitHub**: sign in with a GitHub OAuth App and get a new public or private repository with the project as its first commit.
- Generated files are formatted with Prettier.
- CI workflow, contributing guide and issue templates.

[Unreleased]: https://github.com/fotsosteve14/stackcraft/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/fotsosteve14/stackcraft/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/fotsosteve14/stackcraft/releases/tag/v0.1.0
