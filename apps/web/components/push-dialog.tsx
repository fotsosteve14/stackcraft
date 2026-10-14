"use client";

import type { GitHubPushResult, ProjectConfig } from "@stackcraft/core";
import { useState } from "react";
import type { GitHubStatus } from "@/app/api/github/me/route";
import { Modal } from "./modal";

interface PushDialogProps {
  config: ProjectConfig;
  user: NonNullable<GitHubStatus["user"]>;
  onClose: () => void;
  onSignOut: () => void;
}

type State =
  | { step: "form"; error?: string }
  | { step: "pushing" }
  | { step: "done"; result: GitHubPushResult };

export function PushDialog({ config, user, onClose, onSignOut }: PushDialogProps) {
  const [repoName, setRepoName] = useState(config.name);
  const [isPrivate, setIsPrivate] = useState(true);
  const [state, setState] = useState<State>({ step: "form" });

  const push = async () => {
    setState({ step: "pushing" });
    try {
      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, repo: { name: repoName.trim(), private: isPrivate } }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<GitHubPushResult> & { error?: string };
      if (!response.ok) throw new Error(data.error ?? `Push failed (${response.status}).`);
      setState({ step: "done", result: data as GitHubPushResult });
    } catch (error) {
      setState({ step: "form", error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <Modal title="Push to GitHub" onClose={onClose} className="max-w-lg">
      <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <h2 className="font-semibold">Push to GitHub</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="px-2 text-muted hover:text-foreground">
          ✕
        </button>
      </header>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-background p-3">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatarUrl} alt="" className="size-8 rounded-full" />
            <span className="truncate text-sm">
              Signed in as <strong>@{user.login}</strong>
            </span>
          </div>
          <button type="button" onClick={onSignOut} className="shrink-0 text-sm text-muted hover:text-foreground">
            Sign out
          </button>
        </div>

        {state.step === "done" ? (
          <div className="space-y-4">
            <p className="text-accent">
              ✓ <strong>{state.result.fullName}</strong> is ready.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs">
              git clone {state.result.cloneUrl}
            </pre>
            <a
              href={state.result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg bg-accent px-4 py-2.5 text-center font-semibold text-accent-foreground hover:opacity-90"
            >
              Open repository ↗
            </a>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void push();
            }}
          >
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Repository name</span>
              <div className="flex items-center rounded-lg border border-border bg-surface focus-within:border-accent">
                <span className="pl-3 text-sm text-muted">{user.login}/</span>
                <input
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  required
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent py-2 pr-3 font-mono text-sm outline-none"
                />
              </div>
            </label>

            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-1 text-sm text-muted">Visibility</legend>
              {[
                { value: true, label: "Private", hint: "Only you can see it" },
                { value: false, label: "Public", hint: "Anyone can see it" },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setIsPrivate(option.value)}
                  aria-pressed={isPrivate === option.value}
                  className={`rounded-lg border p-3 text-left ${
                    isPrivate === option.value ? "border-accent bg-accent-soft" : "border-border hover:border-muted"
                  }`}
                >
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="block text-xs text-muted">{option.hint}</span>
                </button>
              ))}
            </fieldset>

            {state.step === "form" && state.error && <p className="text-sm text-danger">{state.error}</p>}

            <button
              type="submit"
              disabled={state.step === "pushing" || !repoName.trim()}
              className="w-full rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {state.step === "pushing" ? "Creating repository…" : "Create repository and push"}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
