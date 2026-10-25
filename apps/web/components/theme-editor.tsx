"use client";

import {
  encodeTheme,
  importedCount,
  normalizeHex,
  parseThemeTokens,
  readableOn,
  THEME_PRESETS,
  THEME_ROLES,
  themeContrastIssues,
  validateTheme,
  type ThemeConfig,
  type ThemeImport,
  type ThemeMode,
  type ThemePalette,
  type ThemeRole,
} from "@stackcraft/core";
import { useState } from "react";
import { Modal } from "./modal";

interface ThemeEditorProps {
  theme: ThemeConfig;
  onChange: (theme: ThemeConfig) => void;
}

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const [importOpen, setImportOpen] = useState(false);
  const valid = validateTheme(theme).length === 0;
  const activePreset = valid ? THEME_PRESETS.find((p) => p.id === encodeTheme(theme))?.id : undefined;
  const issues = valid ? themeContrastIssues(theme) : [];

  const setColor = (mode: ThemeMode, role: ThemeRole, value: string) =>
    onChange({ ...theme, [mode]: { ...theme[mode], [role]: value } });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Start from</span>
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            title={preset.description}
            onClick={() => onChange(preset.theme)}
            aria-pressed={activePreset === preset.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              activePreset === preset.id ? "border-accent bg-accent-soft font-medium text-accent" : "border-border hover:border-muted"
            }`}
          >
            <span className="flex">
              {(["primary", "secondary", "background"] as const).map((role) => (
                <span
                  key={role}
                  className="-ml-1 size-3.5 rounded-full border border-border first:ml-0"
                  style={{ background: preset.theme.light[role] }}
                />
              ))}
            </span>
            {preset.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm hover:border-accent"
        >
          Import from my design system…
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">Role</th>
              {MODES.map((m) => (
                <th key={m.id} className="px-3 py-2 font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {THEME_ROLES.map((role) => (
              <tr key={role.id} className="border-b border-border last:border-0">
                <td className="px-3 py-1.5">
                  <span className="block font-medium">{role.label}</span>
                  <span className="block text-xs text-muted">{role.hint}</span>
                </td>
                {MODES.map((mode) => (
                  <td key={mode.id} className="px-3 py-1.5">
                    <ColorInput
                      label={`${role.label} (${mode.label.toLowerCase()})`}
                      value={theme[mode.id][role.id]}
                      onChange={(value) => setColor(mode.id, role.id, value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {issues.length > 0 && (
        <ul className="space-y-1 text-xs text-danger">
          {issues.map((issue) => (
            <li key={`${issue.mode}.${issue.role}`}>
              {issue.role === "muted" ? "Muted" : "Foreground"} text in {issue.mode} mode has a {issue.ratio.toFixed(1)}:1 contrast
              on the background (WCAG AA asks for 4.5:1).
            </li>
          ))}
        </ul>
      )}

      {valid && (
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((mode) => (
            <Preview key={mode.id} label={mode.label} palette={theme[mode.id]} />
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        The text drawn on each color is picked for contrast. Generated projects get CSS variables for both modes, a
        light / dark / system switch and a script that applies the saved choice before the first paint.
      </p>

      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImport={(imported) => {
            onChange({ light: { ...theme.light, ...imported.light }, dark: { ...theme.dark, ...imported.dark } });
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const hex = normalizeHex(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        value={hex ?? "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="size-7 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${label}, hex`}
        aria-invalid={!hex}
        spellCheck={false}
        className={`w-20 rounded border bg-background px-1.5 py-1 font-mono text-xs outline-none focus:border-accent ${
          hex ? "border-border" : "border-danger"
        }`}
      />
    </div>
  );
}

/** A small card drawn with the palette, the way the generated project uses it. */
function Preview({ label, palette }: { label: string; palette: ThemePalette }) {
  const on = (role: ThemeRole) => readableOn(palette[role], palette);
  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      style={{ background: palette.background, color: palette.foreground, borderColor: palette.border }}
    >
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase" style={{ color: palette.muted }}>
          {label} mode
        </p>
        <p className="font-semibold">Craft your stack</p>
        <p className="text-sm" style={{ color: palette.muted }}>
          Muted text for descriptions.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["primary", "secondary", "accent"] as const).map((role) => (
          <span
            key={role}
            className="rounded-md px-2.5 py-1 text-xs font-medium"
            style={{ background: palette[role], color: on(role) }}
          >
            {role[0]!.toUpperCase() + role.slice(1)}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["success", "warning", "error", "info"] as const).map((role) => (
          <span key={role} className="rounded-full px-2 py-0.5 text-xs" style={{ background: palette[role], color: on(role) }}>
            {role}
          </span>
        ))}
      </div>
    </div>
  );
}

const IMPORT_PLACEHOLDER = `:root {
  --bs-primary: #f16e00;
  --bs-body-bg: #fff;
}
[data-bs-theme=dark] {
  --bs-primary: #ff7900;
  --bs-body-bg: #141414;
}`;

function ImportDialog({ onClose, onImport }: { onClose: () => void; onImport: (imported: ThemeImport) => void }) {
  const [text, setText] = useState("");
  const imported = text.trim() ? parseThemeTokens(text) : undefined;
  const count = imported ? importedCount(imported) : 0;

  return (
    <Modal title="Import colors" onClose={onClose} className="max-w-2xl">
      <div className="space-y-3 overflow-y-auto p-5">
        <div>
          <h2 className="font-semibold">Import from my design system</h2>
          <p className="mt-1 text-sm text-muted">
            Paste the CSS variables (blocks whose selector or media query mentions <code>dark</code> become the dark
            mode) or a JSON tokens file (W3C design tokens, Tokens Studio, or <code>{"{ light, dark }"}</code> groups).
            Colors can be hex, rgb(), hsl() or oklch(). Roles that are not found keep their current color.
          </p>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={IMPORT_PLACEHOLDER}
          spellCheck={false}
          rows={10}
          autoFocus
          className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:border-accent"
        />
        {imported && (
          <div className="text-sm">
            {count === 0 ? (
              <p className="text-danger">No color recognized. Token names should contain primary, background, danger…</p>
            ) : (
              <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {MODES.flatMap((mode) =>
                  THEME_ROLES.filter((role) => imported[mode.id][role.id]).map((role) => (
                    <li key={`${mode.id}.${role.id}`} className="flex items-center gap-2">
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-border"
                        style={{ background: imported[mode.id][role.id] }}
                      />
                      <span>
                        {role.label} <span className="text-muted">({mode.id})</span>
                      </span>
                      <code className="truncate text-xs text-muted">{imported.sources[`${mode.id}.${role.id}`]}</code>
                    </li>
                  )),
                )}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-border p-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-background">
          Cancel
        </button>
        <button
          type="button"
          disabled={count === 0}
          onClick={() => imported && onImport(imported)}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          Import {count > 0 ? `${count} color${count > 1 ? "s" : ""}` : ""}
        </button>
      </div>
    </Modal>
  );
}
