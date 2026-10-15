import type { StackModule } from "../types";

const CATALOG = "https://icons.lndev.me";

/** Exact versions required by icons-animated: other Motion versions change the animations. */
const MOTION_VERSIONS = {
  motion: "13.1.1",
  "framer-motion": "13.1.1",
  "motion-dom": "13.1.1",
  "motion-utils": "13.0.0",
};

export const animatedIcons: StackModule = {
  id: "animated-icons",
  name: "Animated Icons",
  description: "MIT animated icons (Hugeicons, Tabler, Phosphor, Heroicons) installable with the shadcn CLI.",
  category: "ui",
  homepage: CATALOG,
  requires: ["shadcn"],
  apply(project) {
    Object.assign(project.dependencies, MOTION_VERSIONS);

    project.editFile("components.json", (content) => {
      const config = JSON.parse(content) as Record<string, unknown>;
      config.registries = { "@icons-animated": `${CATALOG}/r/{name}.json` };
      return JSON.stringify(config, null, 2);
    });

    project.addReadmeSection(
      "Animated icons",
      `Browse the catalog on ${CATALOG} and add icons with the shadcn CLI:

\`\`\`bash
${project.exec("shadcn@latest add @icons-animated/tabler-heart")}
${project.exec("shadcn@latest add @icons-animated/hugeicons-search")}
\`\`\`

Icons are copied into \`${project.paths.ui}\`. They animate on hover and accept \`size\` and \`className\`.

Icons come from [icons-animated](https://github.com/ln-dev7/icons-animated) (MIT). Keep its license and third-party notices if you redistribute the components.`,
    );
  },
};
