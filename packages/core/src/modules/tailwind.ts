import type { StackModule } from "../types";

export const tailwind: StackModule = {
  id: "tailwind",
  name: "Tailwind CSS",
  description: "Utility-first CSS framework (v4).",
  category: "ui",
  homepage: "https://tailwindcss.com",
  apply(project) {
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

    project.addFile(
      "app/globals.css",
      `@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

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
