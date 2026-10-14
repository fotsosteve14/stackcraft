# Changelog

All notable changes to StackCraft are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/fotsosteve14/stackcraft/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fotsosteve14/stackcraft/releases/tag/v0.1.0
