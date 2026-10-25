import { themeVariablesCss } from "../theme";
import type { StackModule } from "../types";

export const brefUi: StackModule = {
  id: "bref-ui",
  name: "bref-ui",
  description: "Svelte 5 components with scoped CSS and theming, which you can copy into your project to customize.",
  category: "ui",
  homepage: "https://github.com/feuersteiner/bref-ui",
  frameworks: ["sveltekit"],
  apply(project) {
    // The layout renders <Theme /> and the home page a <Button /> (see frameworks/sveltekit.ts).
    project.addDependency("bref-ui");

    if (!project.has("tailwind")) {
      // <Theme /> owns colors, fonts and the reset: keep only the page layout (and the theme
      // variables, which the theme switch uses).
      const { theme } = project.config;
      project.addFile(
        project.paths.css,
        `${theme ? `${themeVariablesCss(theme)}\n\n` : ""}.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  min-height: 100vh;
  padding: 2rem;
  text-align: center;
}

.page h1 {
  margin: 0;
  font-size: 2.5rem;
  letter-spacing: -0.025em;
}

.page p {
  margin: 0;
  max-width: 28rem;
  opacity: 0.75;
}
`,
      );
    }

    // The bref-ui CLI requires Bun, so it is documented rather than run.
    project.addReadmeSection(
      "bref-ui",
      `Components are imported from the \`bref-ui\` package:

\`\`\`svelte
<script lang="ts">
  import { Button } from "bref-ui";
</script>

<Button label="Save" onClick={() => console.log("saved")} />
\`\`\`

\`<Theme />\` is rendered once in \`${project.paths.app}/+layout.svelte\`. To own a component's source and customize it, copy it into \`src/lib/ui\` with the bref-ui CLI (requires [Bun](https://bun.sh)):

\`\`\`bash
bunx bref-ui init
bunx bref-ui add button
\`\`\`

Then import it from \`$lib/ui\` instead of \`bref-ui\`. Browse the components on [the gallery](https://feuersteiner.github.io/bref-ui/).`,
    );
  },
};
