import type { ModuleCategory, StackModule } from "../types";
import { animatedIcons } from "./animated-icons";
import { betterAuth } from "./better-auth";
import { brefUi } from "./bref-ui";
import { docker } from "./docker";
import { drizzle } from "./drizzle";
import { eslint } from "./eslint";
import { heroicons } from "./heroicons";
import { motion } from "./motion";
import { nextauth } from "./nextauth";
import { payload } from "./payload";
import { prettier } from "./prettier";
import { prisma } from "./prisma";
import { reactCompiler } from "./react-compiler";
import { shadcn } from "./shadcn";
import { svelteAiTools } from "./svelte-ai-tools";
import { three } from "./three";
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
  brefUi,
  animatedIcons,
  heroicons,
  motion,
  three,
  prisma,
  drizzle,
  payload,
  nextauth,
  betterAuth,
  zustand,
  zod,
  reactCompiler,
  eslint,
  prettier,
  vitest,
  docker,
  svelteAiTools,
];

export const CATEGORIES: readonly { id: ModuleCategory; label: string }[] = [
  { id: "ui", label: "Styling & UI" },
  { id: "database", label: "Database" },
  { id: "auth", label: "Authentication" },
  { id: "cms", label: "CMS" },
  { id: "state", label: "State & Validation" },
  { id: "performance", label: "Performance" },
  { id: "3d", label: "3D" },
  { id: "quality", label: "Code Quality" },
  { id: "testing", label: "Testing" },
  { id: "deployment", label: "Deployment" },
  { id: "ai", label: "AI" },
];

export function getModule(id: string): StackModule | undefined {
  return MODULES.find((m) => m.id === id);
}
