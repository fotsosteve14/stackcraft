import * as p from "@clack/prompts";
import {
  ARCHITECTURES,
  CATEGORIES,
  decodeTheme,
  FRAMEWORKS,
  generateProject,
  getFramework,
  getModule,
  MODULES,
  PACKAGE_MANAGERS,
  resolveModules,
  supportsFramework,
  THEME_PRESETS,
  validateConfig,
  validateProjectName,
  vercelDeployment,
  vercelImportUrl,
  type ArchitectureId,
  type FrameworkId,
  type PackageManager,
  type ProjectConfig,
  type ThemeConfig,
} from "@stackcraft/core";
import { resolve } from "node:path";
import pkg from "../package.json" with { type: "json" };
import { detectPackageManager, HELP, parseCliArgs, type CliArgs } from "./args";
import { gitHubCliStatus, initGit, isEmptyDir, openUrl, publishToGitHub, run, writeProject } from "./project";

/** Stops cleanly when the user presses Ctrl+C or Escape. */
function answer<T>(value: T): Exclude<T, symbol> {
  if (p.isCancel(value)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return value as Exclude<T, symbol>;
}

async function askName(args: CliArgs): Promise<string> {
  if (args.name) {
    const error = validateProjectName(args.name);
    if (error) throw new Error(error);
    return args.name;
  }
  if (args.yes) return "my-app";
  return answer(
    await p.text({
      message: "Project name",
      placeholder: "my-app",
      defaultValue: "my-app",
      validate: (value) => (value ? validateProjectName(value) : undefined),
    }),
  );
}

async function askFramework(args: CliArgs): Promise<FrameworkId> {
  if (args.framework) {
    if (!getFramework(args.framework)) throw new Error(`Unknown framework "${args.framework}".`);
    return args.framework as FrameworkId;
  }
  if (args.yes) return "nextjs";
  return answer(
    await p.select<FrameworkId>({
      message: "Framework",
      options: FRAMEWORKS.map((f) => ({ value: f.id, label: f.name, hint: f.description })),
    }),
  );
}

async function askArchitecture(args: CliArgs): Promise<ArchitectureId> {
  if (args.architecture) return args.architecture as ArchitectureId;
  if (args.yes) return "simple";
  return answer(
    await p.select<ArchitectureId>({
      message: "Architecture",
      options: ARCHITECTURES.map((a) => ({ value: a.id, label: a.name, hint: a.description })),
    }),
  );
}

/** Modules grouped by category, limited to the framework; asked again while they conflict. */
async function askModules(args: CliArgs, framework: FrameworkId): Promise<string[]> {
  if (args.modules) return args.modules;
  if (args.yes) return [];

  const options: Record<string, { value: string; label: string; hint: string }[]> = {};
  for (const category of CATEGORIES) {
    const modules = MODULES.filter((m) => m.category === category.id && supportsFramework(m, framework));
    if (modules.length > 0) {
      options[category.label] = modules.map((m) => ({ value: m.id, label: m.name, hint: m.description }));
    }
  }

  let initialValues: string[] = [];
  for (;;) {
    const selected = answer(
      await p.groupMultiselect({
        message: "Dependencies (space to select, enter to confirm)",
        options,
        initialValues,
        required: false,
        selectableGroups: false,
      }),
    );
    const resolved = resolveModules(selected, framework);
    if (resolved.errors.length === 0) {
      if (resolved.added.length > 0) {
        const names = resolved.added.map((id) => getModule(id)!.name).join(", ");
        p.log.info(`Also added, as a requirement: ${names}.`);
      }
      return selected;
    }
    p.log.error(resolved.errors.join("\n"));
    initialValues = selected;
  }
}

async function askTheme(args: CliArgs): Promise<ThemeConfig | undefined> {
  if (args.theme) {
    if (args.theme === "none") return undefined;
    const theme = decodeTheme(args.theme);
    if (!theme) throw new Error(`Unknown theme "${args.theme}". Use a preset (${THEME_PRESETS.map((t) => t.id).join(", ")}) or "none".`);
    return theme;
  }
  if (args.yes) return undefined;
  const id = answer(
    await p.select<string>({
      message: "Colors and dark mode",
      options: [
        { value: "none", label: "Framework defaults" },
        ...THEME_PRESETS.map((t) => ({ value: t.id, label: `${t.name} theme`, hint: t.description })),
      ],
    }),
  );
  return id === "none" ? undefined : decodeTheme(id);
}

async function askPackageManager(args: CliArgs): Promise<PackageManager> {
  const value = args.packageManager ?? detectPackageManager();
  if (!PACKAGE_MANAGERS.includes(value as PackageManager)) throw new Error(`Unsupported package manager "${value}".`);
  return value as PackageManager;
}

async function askGitHub(args: CliArgs): Promise<"public" | "private" | "no"> {
  if (args.github) return args.github;
  if (args.yes) return "no";
  return answer(
    await p.select<"public" | "private" | "no">({
      message: "Publish to GitHub?",
      options: [
        { value: "no", label: "No" },
        { value: "private", label: "Yes, private repository" },
        { value: "public", label: "Yes, public repository" },
      ],
    }),
  );
}

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) return console.log(HELP);
  if (args.version) return console.log(pkg.version);

  p.intro(`StackCraft ${pkg.version}`);

  const name = await askName(args);
  const root = resolve(process.cwd(), name);
  if (!isEmptyDir(root)) throw new Error(`The folder ${name} already exists and is not empty.`);

  const framework = await askFramework(args);
  const architecture = await askArchitecture(args);
  const modules = await askModules(args, framework);
  const theme = await askTheme(args);
  const packageManager = await askPackageManager(args);

  const config: ProjectConfig = {
    name,
    description: args.description ?? "",
    framework,
    packageManager,
    architecture,
    modules,
    theme,
  };
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(errors.join("\n"));

  const spin = p.spinner();
  spin.start("Generating the project");
  const project = await generateProject(config);
  writeProject(root, project.files);
  spin.stop(`Created ${name} with ${Object.keys(project.files).length} files.`);

  let installed = false;
  if (args.install) {
    const install = args.yes || answer(await p.confirm({ message: `Install dependencies with ${packageManager}?` }));
    if (install) {
      p.log.step(`${packageManager} install`);
      const result = await run(packageManager, ["install"], root, true);
      installed = result.code === 0;
      if (!installed) p.log.warn(`${packageManager} install failed. Run it again inside ${name}.`);
    }
  }

  const repositoryUrl = await maybePublish(args, root, name, config.description);
  if (repositoryUrl) await maybeDeployToVercel(args, config, repositoryUrl);

  const steps = [`cd ${name}`, ...(installed ? [] : [`${packageManager} install`]), `${packageManager} run dev`];
  p.note(steps.join("\n"), "Next steps");
  p.outro("Happy coding! The README explains the stack and every module.");
}

/** Returns the URL of the new GitHub repository, or undefined when the project was not published. */
async function maybePublish(
  args: CliArgs,
  root: string,
  name: string,
  description: string,
): Promise<string | undefined> {
  const visibility = await askGitHub(args);

  // A local repository is useful even without GitHub.
  const gitError = await initGit(root);
  if (gitError) {
    p.log.warn(`Could not create the git repository: ${gitError}`);
    return undefined;
  }
  if (visibility === "no") return undefined;

  const status = await gitHubCliStatus(root);
  if (status !== "ready") {
    const fix =
      status === "missing"
        ? "Install the GitHub CLI (https://cli.github.com) and run `gh auth login`"
        : "Run `gh auth login`";
    p.log.warn(
      `${fix}, then publish from the project folder:\n  gh repo create ${name} --${visibility} --source . --push`,
    );
    return undefined;
  }

  const spin = p.spinner();
  spin.start(`Creating the ${visibility} repository ${name} on GitHub`);
  try {
    const url = await publishToGitHub(root, name, visibility, description);
    spin.stop(`Published to ${url}`);
    return url;
  } catch (error) {
    spin.error("GitHub publishing failed");
    p.log.warn(error instanceof Error ? error.message : String(error));
    return undefined;
  }
}

/**
 * Opens Vercel's import page for the new repository: Vercel then deploys it and redeploys on every
 * push. The CLI never signs in to Vercel itself.
 */
async function maybeDeployToVercel(args: CliArgs, config: ProjectConfig, repositoryUrl: string): Promise<void> {
  const deployment = vercelDeployment(config);
  if (!deployment.supported) {
    if (args.vercel) p.log.warn(`Not deploying to Vercel: ${deployment.reason}`);
    return;
  }

  const deploy = args.vercel ?? (args.yes ? false : answer(await p.confirm({ message: "Deploy to Vercel?", initialValue: false })));
  if (!deploy) return;

  if (deployment.env.length > 0 || deployment.needsDatabase) {
    const lines = deployment.env.map((v) => `${v.key}${v.comment ? `  (${v.comment})` : ""}`);
    if (deployment.needsDatabase) {
      lines.push("", "Use a hosted database (Neon, Supabase…): the docker-compose PostgreSQL only runs locally.");
    }
    p.note(lines.join("\n"), "Set these environment variables in Vercel before deploying");
  }

  const url = vercelImportUrl(repositoryUrl);
  const opened = await openUrl(url);
  p.log.info(
    `${opened ? "Opened" : "Open"} ${url}\nPick your team and click Deploy: Vercel redeploys on every push to main.\nIf the page does not show the repository, import it from https://vercel.com/new.`,
  );
}

main().catch((error: unknown) => {
  p.cancel(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
