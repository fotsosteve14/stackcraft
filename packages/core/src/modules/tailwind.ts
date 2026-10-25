import type { ProjectBuilder } from "../builder";
import { tailwindThemeColors, THEME_DARK_VARIANT, themeVariablesCss } from "../theme";
import type { StackModule } from "../types";

/** Next.js loads Geist with next/font; elsewhere Tailwind's default system font stacks apply. */
export function tailwindFontTheme(project: ProjectBuilder): string {
  return project.config.framework === "nextjs"
    ? "  --font-sans: var(--font-geist-sans);\n  --font-mono: var(--font-geist-mono);\n"
    : "";
}

export const tailwind: StackModule = {
  id: "tailwind",
  name: "Tailwind CSS",
  description: "Utility-first CSS framework (v4).",
  category: "ui",
  homepage: "https://tailwindcss.com",
  apply(project) {
    if (project.config.framework === "nextjs") {
      project.addDevDependency("tailwindcss", "@tailwindcss/postcss");
      project.addFile(
        "postcss.config.mjs",
        `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`,
      );
    } else {
      // The official Vite plugin is faster than going through PostCSS.
      project
        .addDevDependency("tailwindcss", "@tailwindcss/vite")
        .addVitePlugin('import tailwindcss from "@tailwindcss/vite";', "tailwindcss()");
    }

    const { theme } = project.config;
    if (theme) {
      project.addFile(
        project.paths.css,
        `@import "tailwindcss";

${THEME_DARK_VARIANT}

@theme inline {
${tailwindThemeColors()
  .map((line) => `  ${line}`)
  .join("\n")}
${tailwindFontTheme(project)}}

${themeVariablesCss(theme)}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
`,
      );
      return;
    }

    project.addFile(
      project.paths.css,
      `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
${tailwindFontTheme(project)}}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
`,
    );
  },
};
