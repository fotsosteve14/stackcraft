import { buildProject } from "./generate";
import type { EnvVar, ProjectConfig } from "./types";

export interface VercelDeployment {
  /** False when the project cannot run on Vercel as generated. */
  supported: boolean;
  /** Why it is not supported. */
  reason?: string;
  /** Variables to set in the Vercel project before the first deployment. */
  env: EnvVar[];
  /** The project uses a database: Vercel needs a hosted one (the docker-compose PostgreSQL is local). */
  needsDatabase: boolean;
}

/** What deploying the project on Vercel requires, from its config. */
export function vercelDeployment(config: ProjectConfig): VercelDeployment {
  const { project, modules } = buildProject(config);
  const needsDatabase = modules.includes("prisma") || modules.includes("drizzle");
  // svelte.config.js switches to adapter-node when Docker is selected, which Vercel cannot run.
  const reason =
    config.framework === "sveltekit" && modules.includes("docker")
      ? "With Docker, SvelteKit uses adapter-node, which Vercel cannot run. Switch svelte.config.js back to @sveltejs/adapter-auto to deploy on Vercel."
      : undefined;
  return { supported: !reason, reason, env: project.env, needsDatabase };
}

/**
 * Vercel's import page for an existing repository: the user picks a team and deploys, and Vercel
 * redeploys on every push. (The documented /new/clone flow would copy the repository instead.)
 */
export function vercelImportUrl(repositoryUrl: string): string {
  return `https://vercel.com/new/import?s=${encodeURIComponent(repositoryUrl)}`;
}
