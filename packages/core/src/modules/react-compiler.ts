import type { StackModule } from "../types";

export const reactCompiler: StackModule = {
  id: "react-compiler",
  name: "React Compiler",
  description: "Automatic memoization of components and hooks at build time, no useMemo or useCallback needed.",
  category: "performance",
  homepage: "https://react.dev/learn/react-compiler",
  apply(project) {
    // Same setup as create-next-app's "React Compiler" option.
    project.addDevDependency("babel-plugin-react-compiler").setNextConfig("reactCompiler", "true");

    project.addReadmeSection(
      "React Compiler",
      `The React Compiler optimizes components at build time, so manual \`useMemo\`, \`useCallback\` and \`React.memo\` are rarely needed. Keep components pure and follow the [Rules of React](https://react.dev/reference/rules) so it can optimize them.`,
    );
  },
};
