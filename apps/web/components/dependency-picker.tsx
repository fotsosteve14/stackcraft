"use client";

import {
  CATEGORIES,
  getFramework,
  getModule,
  MODULES,
  supportsFramework,
  type FrameworkId,
  type StackModule,
} from "@stackcraft/core";
import { useMemo, useState } from "react";
import { Modal } from "./modal";

interface DependencyPickerProps {
  /** Every module currently in the project (selected + auto-added). */
  active: readonly string[];
  /** Modules added automatically as requirements: shown as selected, not toggleable. */
  locked: readonly string[];
  framework: FrameworkId;
  onToggle: (id: string) => void;
  onClose: () => void;
}

function conflictWith(mod: StackModule, active: readonly string[]): StackModule | undefined {
  const id = (mod.conflicts ?? []).find((c) => active.includes(c));
  return id ? getModule(id) : undefined;
}

export function DependencyPicker({ active, locked, framework, onToggle, onClose }: DependencyPickerProps) {
  const [query, setQuery] = useState("");
  const frameworkName = getFramework(framework)?.name;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MODULES;
    // Name matches rank before description matches, so Enter picks the obvious one.
    const score = (m: StackModule) => {
      const name = `${m.name} ${m.id}`.toLowerCase();
      if (name.startsWith(q)) return 0;
      if (name.includes(q)) return 1;
      return m.description.toLowerCase().includes(q) ? 2 : -1;
    };
    return MODULES.map((m) => ({ m, s: score(m) }))
      .filter(({ s }) => s >= 0)
      .sort((a, b) => a.s - b.s)
      .map(({ m }) => m);
  }, [query]);

  const groups = CATEGORIES.map((c) => ({ ...c, modules: matches.filter((m) => m.category === c.id) })).filter(
    (g) => g.modules.length > 0,
  );

  return (
    <Modal title="Add dependencies" onClose={onClose} className="max-w-2xl">
      <div className="border-b border-border p-4">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const first = matches.find(
              (m) => !active.includes(m.id) && !conflictWith(m, active) && supportsFramework(m, framework),
            );
            if (first) {
              onToggle(first.id);
              setQuery("");
            }
          }}
          placeholder="Search dependencies… (Enter adds the first match)"
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-accent"
        />
      </div>

      <div className="overflow-y-auto p-2">
        {groups.length === 0 && <p className="p-6 text-center text-muted">No dependency matches “{query}”.</p>}
        {groups.map((group) => (
          <section key={group.id} className="mb-2">
            <h3 className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">{group.label}</h3>
            {group.modules.map((mod) => {
              const selected = active.includes(mod.id);
              const conflict = selected ? undefined : conflictWith(mod, active);
              const isLocked = locked.includes(mod.id);
              const unsupported = !supportsFramework(mod, framework);
              return (
                <button
                  key={mod.id}
                  type="button"
                  disabled={!!conflict || isLocked || unsupported}
                  onClick={() => onToggle(mod.id)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected ? "bg-accent-soft" : "hover:bg-background"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border text-xs ${
                      selected ? "border-accent bg-accent text-accent-foreground" : "border-border"
                    }`}
                  >
                    {selected && "✓"}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium">{mod.name}</span>
                    <span className="block text-sm text-muted">
                      {unsupported
                        ? `Not available for ${frameworkName}`
                        : conflict
                        ? `Not compatible with ${conflict.name}`
                        : isLocked
                          ? "Required by another dependency"
                          : mod.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>

      <div className="flex justify-end border-t border-border p-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-accent px-4 py-2 font-medium text-accent-foreground hover:opacity-90"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
