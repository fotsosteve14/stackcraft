// Bundles the CLI and the StackCraft engine into dist/index.js. Prettier and the Svelte
// plugin stay regular dependencies: they are large and loaded at runtime.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  external: ["prettier", "prettier/*", "prettier-plugin-svelte", "prettier-plugin-svelte/*", "svelte", "svelte/*"],
  banner: {
    // Shebang for npx, and require() for the CommonJS dependencies bundled into the ESM output.
    js: '#!/usr/bin/env node\nimport { createRequire } from "node:module";\nconst require = createRequire(import.meta.url);',
  },
  legalComments: "linked",
});
