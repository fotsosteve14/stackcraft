"use client";

import {
  ARCHITECTURES,
  CATEGORIES,
  FRAMEWORKS,
  getFramework,
  getModule,
  MODULES,
  PACKAGE_MANAGERS,
  resolveModules,
  supportsFramework,
  THEME_PRESETS,
  validateConfig,
  type FrameworkId,
  type ProjectConfig,
} from "@stackcraft/core";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { configFromParams, configToParams } from "@/lib/config";
import { DependencyPicker } from "./dependency-picker";
import type { GitHubStatus } from "@/app/api/github/me/route";
import { Explorer } from "./explorer";
import { PushDialog } from "./push-dialog";
import { ThemeEditor } from "./theme-editor";

const FRAMEWORK_OPTIONS = [
  ...FRAMEWORKS.map((f) => ({ id: f.id as string, label: f.name, available: true })),
  // Roadmap, by demand (npm downloads).
  { id: "nestjs", label: "NestJS", available: false },
  { id: "tanstack-start", label: "TanStack Start", available: false },
  { id: "astro", label: "Astro", available: false },
];

const REPO_URL = "https://github.com/fotsosteve14/stackcraft";

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; available?: boolean }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={o.available === false}
          onClick={() => onChange(o.id)}
          title={o.available === false ? "Coming soon" : undefined}
          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            value === o.id
              ? "border-accent bg-accent-soft font-medium text-accent"
              : "border-border hover:border-muted"
          }`}
        >
          {o.label}
          {o.available === false && <span className="ml-1 text-xs">(soon)</span>}
        </button>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="ml-2 hidden rounded border border-current/30 px-1.5 text-xs opacity-70 sm:inline">{children}</kbd>;
}

export function Configurator() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<ProjectConfig>(() => configFromParams(searchParams));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "info"; message: string } | null>(() =>
    searchParams.get("github") === "error" ? { kind: "error", message: "GitHub sign-in failed. Try again." } : null,
  );
  const [github, setGithub] = useState<GitHubStatus | null>(null);
  // Back from GitHub sign-in: reopen the push dialog.
  const [pushOpen, setPushOpen] = useState(() => searchParams.get("github") === "connected");

  useEffect(() => {
    fetch("/api/github/me")
      .then((r) => r.json() as Promise<GitHubStatus>)
      .then(setGithub)
      .catch(() => setGithub({ configured: false, user: null }));
  }, []);

  const resolved = useMemo(
    () => resolveModules(config.modules, config.framework),
    [config.modules, config.framework],
  );
  const errors = useMemo(() => validateConfig(config), [config]);
  const canGenerate = errors.length === 0 && !busy;

  // Keep the URL shareable.
  useEffect(() => {
    window.history.replaceState(null, "", `?${configToParams(config)}`);
  }, [config]);

  const update = (patch: Partial<ProjectConfig>) => setConfig((c) => ({ ...c, ...patch }));

  // Switching framework drops the modules it does not support, and says so.
  const changeFramework = (framework: FrameworkId) => {
    if (framework === config.framework) return;
    const dropped = config.modules.filter((id) => {
      const mod = getModule(id);
      return mod && !supportsFramework(mod, framework);
    });
    setConfig((c) => ({ ...c, framework, modules: c.modules.filter((id) => !dropped.includes(id)) }));
    if (dropped.length > 0) {
      const names = dropped.map((id) => getModule(id)!.name).join(", ");
      flash("info", `Removed ${names}: not available for ${getFramework(framework)!.name}.`);
    }
  };

  const toggleModule = (id: string) =>
    setConfig((c) => ({
      ...c,
      modules: c.modules.includes(id) ? c.modules.filter((m) => m !== id) : [...c.modules, id],
    }));

  const flash = (kind: "error" | "info", message: string) => {
    setNotice({ kind, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const download = async () => {
    if (!canGenerate) return;
    setBusy(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { errors?: string[] } | null;
        throw new Error(data?.errors?.join(" ") ?? `Generation failed (${response.status}).`);
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `${config.name}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      flash("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const pushToGitHub = () => {
    if (errors.length > 0) return;
    if (!github?.configured) {
      flash("error", "GitHub push is not configured on this instance (see apps/web/.env.example).");
    } else if (!github.user) {
      const back = `${window.location.pathname}${window.location.search}`;
      // Full navigation on purpose: the API route redirects to GitHub's OAuth page.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/api/github/login?return=${encodeURIComponent(back)}`;
    } else {
      setPushOpen(true);
    }
  };

  const signOut = async () => {
    await fetch("/api/github/logout", { method: "POST" });
    setGithub((g) => (g ? { ...g, user: null } : g));
    setPushOpen(false);
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    flash("info", "Link copied to clipboard. Anyone opening it gets this exact configuration.");
  };

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    const mod = event.metaKey || event.ctrlKey;
    if (mod && event.key === "Enter") {
      event.preventDefault();
      void download();
    } else if (mod && event.key.toLowerCase() === "b") {
      event.preventDefault();
      setPickerOpen(true);
    } else if (event.ctrlKey && event.code === "Space") {
      event.preventDefault();
      if (errors.length === 0) setExplorerOpen(true);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onShortcut(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closeExplorer = useCallback(() => setExplorerOpen(false), []);
  const closePush = useCallback(() => setPushOpen(false), []);

  const requiredBy = (id: string) =>
    resolved.modules
      .map((m) => getModule(m)!)
      .filter((m) => m.requires?.includes(id))
      .map((m) => m.name)
      .join(", ");

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="size-8" />
            <div>
              <h1 className="text-lg leading-tight font-bold">StackCraft</h1>
              <p className="text-xs text-muted">Craft your stack, start coding.</p>
            </div>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            GitHub ↗
          </a>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <section className="space-y-6">
          <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Project</h2>

          <Field label="Framework">
            <Segmented
              options={FRAMEWORK_OPTIONS}
              value={config.framework as string}
              onChange={(id) => changeFramework(id as FrameworkId)}
            />
            <p className="text-xs text-muted">{getFramework(config.framework)?.description}</p>
          </Field>

          <Field label="Package manager">
            <Segmented
              options={PACKAGE_MANAGERS.map((pm) => ({ id: pm, label: pm }))}
              value={config.packageManager}
              onChange={(packageManager) => update({ packageManager })}
            />
          </Field>

          <Field label="Architecture">
            <div className="grid gap-2 sm:grid-cols-3">
              {ARCHITECTURES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => update({ architecture: a.id })}
                  aria-pressed={config.architecture === a.id}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    config.architecture === a.id
                      ? "border-accent bg-accent-soft"
                      : "border-border bg-surface hover:border-muted"
                  }`}
                >
                  <span className={`block text-sm font-medium ${config.architecture === a.id ? "text-accent" : ""}`}>
                    {a.name}
                  </span>
                  <span className="mt-1 block text-xs text-muted">{a.description}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Metadata">
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Name</span>
                <input
                  value={config.name}
                  onChange={(e) => update({ name: e.target.value })}
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-muted">Description</span>
                <input
                  value={config.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="My awesome Next.js app"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            </div>
          </Field>

          <Field label="Theme">
            <Segmented
              options={[
                { id: "default", label: "Framework defaults" },
                { id: "custom", label: "Custom colors & dark mode" },
              ]}
              value={config.theme ? "custom" : "default"}
              onChange={(id) => update({ theme: id === "custom" ? (config.theme ?? THEME_PRESETS[0]!.theme) : undefined })}
            />
            {config.theme && <ThemeEditor theme={config.theme} onChange={(theme) => update({ theme })} />}
          </Field>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">
              Dependencies <span className="normal-case">({resolved.modules.length}/{MODULES.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium hover:border-accent"
            >
              Add dependencies
              <Kbd>Ctrl B</Kbd>
            </button>
          </div>

          {resolved.modules.length === 0 ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full rounded-xl border border-dashed border-border p-10 text-center text-muted hover:border-accent"
            >
              No dependency selected yet.
              <br />
              Add Tailwind, Prisma, Auth.js, Vitest…
            </button>
          ) : (
            <ul className="space-y-2">
              {resolved.modules.map((id) => {
                const mod = getModule(id)!;
                const auto = resolved.added.includes(id);
                const category = CATEGORIES.find((c) => c.id === mod.category)?.label;
                return (
                  <li key={id} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={mod.homepage} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                          {mod.name}
                        </a>
                        <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted">{category}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {auto ? `Added automatically, required by ${requiredBy(id)}.` : mod.description}
                      </p>
                    </div>
                    {!auto && (
                      <button
                        type="button"
                        onClick={() => toggleModule(id)}
                        aria-label={`Remove ${mod.name}`}
                        className="px-1 text-muted hover:text-danger"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          {(errors.length > 0 || notice) && (
            <p className={`mb-2 text-sm ${notice?.kind === "info" ? "text-accent" : "text-danger"}`}>
              {notice?.message ?? errors.join(" ")}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              disabled={!canGenerate}
              onClick={download}
              className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate"}
              <Kbd>Ctrl ⏎</Kbd>
            </button>
            <button
              type="button"
              disabled={errors.length > 0}
              onClick={() => setExplorerOpen(true)}
              className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-background disabled:opacity-50"
            >
              Explore
              <Kbd>Ctrl Space</Kbd>
            </button>
            <button
              type="button"
              disabled={errors.length > 0 || github === null}
              onClick={pushToGitHub}
              title={github && !github.configured ? "Not configured on this instance" : undefined}
              className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-background disabled:opacity-50"
            >
              Push to GitHub
            </button>
            <button
              type="button"
              onClick={share}
              className="rounded-lg border border-border px-5 py-2.5 font-medium hover:bg-background"
            >
              Share…
            </button>
          </div>
        </div>
      </footer>

      {pickerOpen && <DependencyPicker active={resolved.modules} locked={resolved.added} framework={config.framework} onToggle={toggleModule} onClose={closePicker} />}
      {explorerOpen && <Explorer config={config} onClose={closeExplorer} onDownload={download} />}
      {pushOpen && github?.user && errors.length === 0 && (
        <PushDialog config={config} user={github.user} onClose={closePush} onSignOut={signOut} />
      )}
    </>
  );
}
