import type { StackModule } from "../types";

export const reactCompiler: StackModule = {
  id: "react-compiler",
  name: "React Compiler",
  description: "Automatic memoization of components and hooks at build time, no useMemo or useCallback needed.",
  category: "performance",
  homepage: "https://react.dev/learn/react-compiler",
  apply(project) {
    project.addDevDependency("babel-plugin-react-compiler");
    if (project.config.framework === "nextjs") {
      // Same setup as create-next-app's "React Compiler" option.
      project.setNextConfig("reactCompiler", "true");
    } else {
      // Setup documented by @vitejs/plugin-react (Babel; its Rust compiler is still experimental).
      project
        .addDevDependency("@rolldown/plugin-babel", "@babel/core")
        .addVitePlugin('import babel from "@rolldown/plugin-babel";', "babel({ presets: [reactCompilerPreset()] })");
      project.vite.imports.push('import { reactCompilerPreset } from "@vitejs/plugin-react";');
    }

    project.addReadmeSection(
      "React Compiler",
      `The React Compiler optimizes components at build time, so manual \`useMemo\`, \`useCallback\` and \`React.memo\` are rarely needed. Keep components pure and follow the [Rules of React](https://react.dev/reference/rules) so it can optimize them.`,
    );
  },
};
