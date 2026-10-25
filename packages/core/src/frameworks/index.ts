import type { ProjectBuilder } from "../builder";
import type { FrameworkId } from "../types";
import { nextjs } from "./nextjs";
import { sveltekit } from "./sveltekit";
import { viteReact } from "./vite-react";

export interface Framework {
  id: FrameworkId;
  name: string;
  description: string;
  homepage: string;
  /** Shown next to the framework in the generated README's Stack list. */
  stackNote: string;
  /** URL of the dev server, for the generated README. */
  devUrl: string;
  /** package.json "type". */
  packageType?: "module";
  /** Files and dependencies of a fresh project, before modules are applied. */
  applyBase(project: ProjectBuilder): void;
  /** Files that depend on what every module contributed. */
  finalize(project: ProjectBuilder, moduleIds: string[]): void;
}

export const FRAMEWORKS: readonly Framework[] = [nextjs, viteReact, sveltekit];

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORKS.find((f) => f.id === id);
}
