# create-stackcraft

Create a ready-to-code project with the dependencies you pick, already wired together.

```bash
npm create stackcraft@latest
# or
npx create-stackcraft
pnpm create stackcraft
yarn create stackcraft
bun create stackcraft
```

The CLI asks for:

1. the project name;
2. the framework: **Next.js**, **Vite + React** or **SvelteKit**;
3. the architecture: Simple, Feature-based or Clean Architecture;
4. the dependencies: Tailwind CSS, shadcn/ui, bref-ui, Prisma, Drizzle, Auth.js, Better Auth, Zod, Zustand, Vitest, ESLint, Prettier, Docker… Only the ones that work with your framework are listed, and requirements are added for you;
5. the colors: framework defaults or a theme with light and dark mode;
6. whether to install the dependencies;
7. whether to publish the project to GitHub, as a public or private repository.

Every module adds its packages, config files, scripts, environment variables and a section in the generated README.

## Publishing to GitHub

The project always gets a local git repository with a first commit. To publish it, the CLI uses the [GitHub CLI](https://cli.github.com): install it and run `gh auth login` once. StackCraft never asks for or stores a GitHub token.

## Options

Every question can be answered with an option, for scripts and CI:

```bash
npx create-stackcraft my-app --framework sveltekit --arch feature --modules tailwind,vitest --theme neutral --github private -y
```

| Option | Values |
| --- | --- |
| `--framework` | `nextjs`, `vite-react`, `sveltekit` |
| `--arch` | `simple`, `feature`, `clean` |
| `--modules` | comma-separated module ids, e.g. `tailwind,shadcn,prisma` |
| `--theme` | a preset id, or `none` |
| `--pm` | `npm`, `pnpm`, `yarn`, `bun` (default: the one running the command) |
| `--description` | project description |
| `--github` | `public`, `private`, `no` |
| `--no-install` | skip the dependency install |
| `-y`, `--yes` | default answer to every question not given as an option |

Run `npx create-stackcraft --help` for the full list.

## Web version

The same generator runs in the browser, with a file explorer and shareable links: see the [StackCraft repository](https://github.com/fotsosteve14/stackcraft).

## License

MIT
