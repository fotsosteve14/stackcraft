# Contributing to StackCraft

Thanks for helping! The most common contribution is **adding a module**, so this guide starts there.

## Setup

```bash
npm install
npm run dev     # UI on http://localhost:3000
npm test
```

## Adding a module

1. **Create** `packages/core/src/modules/<id>.ts`:

   ```ts
   import type { StackModule } from "../types";

   export const tanstackQuery: StackModule = {
     id: "tanstack-query",
     name: "TanStack Query",
     description: "Async state management and data fetching.",
     category: "state",
     homepage: "https://tanstack.com/query",
     // requires: ["..."],   modules added automatically
     // conflicts: ["..."],  modules that cannot be combined
     apply(project) {
       project.addDependency("@tanstack/react-query");
       project.addFile(`${project.paths.app}/providers.tsx`, `...`);
       project.addReadmeSection("Data fetching", "How to use it…");
     },
   };
   ```

   Never hardcode folders like `app/` or `lib/`: use `project.paths` (`app`, `components`, `ui`, `lib`, `hooks`, `stores`, `db`, `auth`, `generated`) and `project.importPath(file)` for imports, so the module works with every architecture.

2. **Pin versions** in `packages/core/src/versions.ts` (`addDependency` only accepts packages listed there).
3. **Register** the module in `packages/core/src/modules/index.ts`. Order matters: a module is applied after the ones listed before it, so it can react to them with `project.has("other-id")`.
4. **Test** it: add a case to `packages/core/test/generate.test.ts`, then generate a real project and make sure it installs, builds, lints and passes its tests:

   ```bash
   npm run generate -- --name try-it --modules <id>,eslint,vitest --out ../
   cd ../try-it && npm install && npm run build && npm run lint && npx vitest run
   ```

### The `ProjectBuilder` API

| Method | What it does |
| --- | --- |
| `addFile(path, content)` / `editFile(path, fn)` | Create, overwrite or transform a file |
| `addDependency(...)` / `addDevDependency(...)` | Add packages (versions from `versions.ts`) |
| `addScript(name, cmd)` | Add a `package.json` script |
| `addEnv({ key, value, comment })` | Add a variable to `.env.example` |
| `addGitignore(title, ...patterns)` | Extend `.gitignore` |
| `setNextConfig(key, expression)` | Add an entry to `next.config.ts` |
| `addReadmeSection(title, body)` | Document the module in the generated README |
| `paths` / `importPath(file)` | Folders of the chosen architecture, and the `@/` import for a file |
| `has(id)` | Check whether another module is selected |
| `run(script)` / `exec(bin)` | Package-manager-aware commands for docs |

Generated files are formatted with Prettier automatically, so don't worry about indentation in templates.

## Adding an architecture

Architectures live in `packages/core/src/architectures.ts`. An architecture defines `paths` (where each kind of file goes), a `tree` for the generated README, and optionally `applyExample` to generate a small feature showing the pattern. Test it with every module: `npm run generate -- --arch <id> --modules ...`.

## Pull requests

- Keep PRs focused (one module or one feature).
- Run `npm test`, `npm run typecheck` and `npm run lint` before pushing.
- Describe your change under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md).
- For larger changes (new framework, GitHub push…), open an issue first to discuss the design.
