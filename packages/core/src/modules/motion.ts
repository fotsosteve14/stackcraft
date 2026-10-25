import type { StackModule } from "../types";

export const motion: StackModule = {
  id: "motion",
  name: "Motion",
  description: "Production-ready animations for React (formerly Framer Motion).",
  category: "ui",
  homepage: "https://motion.dev",
  frameworks: ["nextjs", "vite-react"],
  apply(project) {
    const { paths } = project;
    // Animated Icons pins its own exact Motion version: keep it so the icons animate as designed.
    if (!project.has("animated-icons")) project.addDependency("motion");

    project.addFile(
      `${paths.components}/fade-in.tsx`,
      `${project.useClient}import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/** Fades and slides its children in on mount. Respects the user's reduced motion setting. */
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
`,
    );

    project.addReadmeSection(
      "Animations (Motion)",
      `\`${project.importPath(`${paths.components}/fade-in.tsx`)}\` is a ready-to-use example:

\`\`\`tsx
import { FadeIn } from "${project.importPath(`${paths.components}/fade-in.tsx`)}";

<FadeIn delay={0.1}>
  <h1>Hello</h1>
</FadeIn>
\`\`\`

Motion components are Client Components (\`"use client"\`). Docs: https://motion.dev/docs/react`,
    );
  },
};
