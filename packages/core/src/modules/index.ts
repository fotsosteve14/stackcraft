import type { ModuleCategory, StackModule } from "../types";
import { animatedIcons } from "./animated-icons";
import { docker } from "./docker";
import { drizzle } from "./drizzle";
import { eslint } from "./eslint";
import { nextauth } from "./nextauth";
import { prettier } from "./prettier";
import { prisma } from "./prisma";
import { shadcn } from "./shadcn";
import { tailwind } from "./tailwind";
import { vitest } from "./vitest";
import { zod } from "./zod";
import { zustand } from "./zustand";

/**
 * Every available module, in application order: a module is applied after the modules
 * listed before it, so it can react to them (e.g. `zod` reads the env vars declared by
 * database/auth modules, `docker` checks for a database).
 */
export const MODULES: readonly StackModule[] = [
  tailwind,
  shadcn,
  animatedIcons,
  prisma,
  drizzle,
  nextauth,
  zustand,
  zod,
  eslint,
  prettier,
  vitest,
  docker,
];

export const CATEGORIES: readonly { id: ModuleCategory; label: string }[] = [
  { id: "ui", label: "Styling & UI" },
  { id: "database", label: "Database" },
  { id: "auth", label: "Authentication" },
  { id: "state", label: "State & Validation" },
  { id: "quality", label: "Code Quality" },
  { id: "testing", label: "Testing" },
  { id: "deployment", label: "Deployment" },
];

export function getModule(id: string): StackModule | undefined {
  return MODULES.find((m) => m.id === id);
}
