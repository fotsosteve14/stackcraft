import type { StackModule } from "../types";

const CATALOG = "https://icons.lndev.me";

export const animatedIcons: StackModule = {
  id: "animated-icons",
  name: "Animated Icons",
  description: "MIT animated icons (Hugeicons, Tabler, Phosphor, Heroicons) installable with the shadcn CLI.",
  category: "ui",
  homepage: CATALOG,
  requires: ["shadcn"],
  apply(project) {
    // Exact versions recommended by icons-animated: other Motion versions change the animations.
    project.addDependency("motion", "framer-motion", "motion-dom", "motion-utils");

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
