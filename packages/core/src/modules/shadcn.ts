import type { StackModule } from "../types";
import { tailwindThemeColors, THEME_DARK_VARIANT, themeVariablesCss } from "../theme";
import { tailwindFontTheme } from "./tailwind";

export const shadcn: StackModule = {
  id: "shadcn",
  name: "shadcn/ui",
  description: "Accessible components you copy into your project, built on Radix UI.",
  category: "ui",
  homepage: "https://ui.shadcn.com",
  frameworks: ["nextjs", "vite-react"],
  requires: ["tailwind"],
  apply(project) {
    const { paths } = project;
    const utilsFile = `${paths.lib}/utils.ts`;
    project
      .addDependency("class-variance-authority", "clsx", "lucide-react", "radix-ui", "tailwind-merge")
      .addDevDependency("tw-animate-css");

    project.addFile(
      "components.json",
      JSON.stringify(
        {
          $schema: "https://ui.shadcn.com/schema.json",
          style: "new-york",
          rsc: project.config.framework === "nextjs",
          tsx: true,
          tailwind: {
            config: "",
            css: paths.css,
            baseColor: "neutral",
            cssVariables: true,
            prefix: "",
          },
          aliases: {
            components: project.importPath(paths.components),
            utils: project.importPath(utilsFile),
            ui: project.importPath(paths.ui),
            lib: project.importPath(paths.lib),
            hooks: project.importPath(paths.hooks),
          },
          iconLibrary: "lucide",
        },
        null,
        2,
      ),
    );

    project.addFile(
      utilsFile,
      `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`,
    );

    project.addFile(
      `${paths.ui}/button.tsx`,
      `import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "${project.importPath(utilsFile)}";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 gap-1.5 px-3",
        lg: "h-10 px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
`,
    );

    const { theme } = project.config;
    if (theme) {
      // The theme roles use shadcn/ui names; the remaining shadcn variables point at them.
      project.addFile(
        paths.css,
        `@import "tailwindcss";
@import "tw-animate-css";

${THEME_DARK_VARIANT}

@theme inline {
${[
  ...tailwindThemeColors(),
  "--color-card: var(--card);",
  "--color-card-foreground: var(--card-foreground);",
  "--color-popover: var(--popover);",
  "--color-popover-foreground: var(--popover-foreground);",
  "--color-destructive: var(--destructive);",
  "--color-input: var(--input);",
  "--color-ring: var(--ring);",
  "--radius-sm: calc(var(--radius) - 4px);",
  "--radius-md: calc(var(--radius) - 2px);",
  "--radius-lg: var(--radius);",
  "--radius-xl: calc(var(--radius) + 4px);",
]
  .map((line) => `  ${line}`)
  .join("\n")}
${tailwindFontTheme(project)}}

${themeVariablesCss(theme, [
  "--radius: 0.625rem;",
  "--card: var(--background);",
  "--card-foreground: var(--foreground);",
  "--popover: var(--background);",
  "--popover-foreground: var(--foreground);",
  "--destructive: var(--error);",
  "--input: var(--border);",
  "--ring: var(--primary);",
])}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,
      );
    } else {
      project.addFile(
      paths.css,
      `@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
${tailwindFontTheme(project)}  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`,
    );
    }

    project.addReadmeSection(
      "UI components",
      `Components live in \`${paths.ui}\`. Add more with:

\`\`\`bash
${project.exec("shadcn@latest add card dialog")}
\`\`\``,
    );
  },
};
