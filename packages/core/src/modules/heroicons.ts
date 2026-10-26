import type { StackModule } from "../types";

export const heroicons: StackModule = {
  id: "heroicons",
  name: "Heroicons",
  description: "Hand-crafted SVG icons by the makers of Tailwind CSS, as React components.",
  category: "ui",
  homepage: "https://heroicons.com",
  frameworks: ["nextjs", "vite-react"],
  apply(project) {
    project.addDependency("@heroicons/react");

    project.addReadmeSection(
      "Icons (Heroicons)",
      `Import icons by style and size: \`24/outline\`, \`24/solid\`, \`20/solid\` or \`16/solid\`.

\`\`\`tsx
import { BeakerIcon } from "@heroicons/react/24/solid";

<BeakerIcon className="size-6 text-blue-500" />
\`\`\`

Browse every icon on https://heroicons.com`,
    );
  },
};
