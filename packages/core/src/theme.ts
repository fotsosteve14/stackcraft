/**
 * Color theme of the generated project: one hex value per role, for light and dark mode.
 * The text color drawn on each fill (primary, secondary…) is computed, so it always meets contrast.
 */

export const THEME_ROLES = [
  { id: "primary", label: "Primary", hint: "Main actions: buttons, links, focus ring" },
  { id: "secondary", label: "Secondary", hint: "Secondary buttons and badges" },
  { id: "accent", label: "Accent", hint: "Hovered and selected items in menus and lists" },
  { id: "background", label: "Background", hint: "Page background" },
  { id: "foreground", label: "Foreground", hint: "Body text" },
  { id: "muted", label: "Muted", hint: "Secondary text: descriptions, placeholders" },
  { id: "border", label: "Border", hint: "Borders, dividers and inputs" },
  { id: "success", label: "Success", hint: "Confirmations" },
  { id: "warning", label: "Warning", hint: "Warnings" },
  { id: "error", label: "Error", hint: "Errors and destructive actions" },
  { id: "info", label: "Info", hint: "Informational messages" },
] as const;

export type ThemeRole = (typeof THEME_ROLES)[number]["id"];
export type ThemeMode = "light" | "dark";
export type ThemePalette = Record<ThemeRole, string>;

export interface ThemeConfig {
  light: ThemePalette;
  dark: ThemePalette;
}

export const ROLE_IDS: readonly ThemeRole[] = THEME_ROLES.map((r) => r.id);
export const MODES: readonly ThemeMode[] = ["light", "dark"];

/** Roles that are filled with a color and need a readable text color on top. */
const FILLED_ROLES = ["primary", "secondary", "accent", "success", "warning", "error", "info"] as const;

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
}

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "neutral",
    name: "Neutral",
    description: "Black and white, close to the shadcn/ui defaults.",
    theme: {
      light: {
        primary: "#171717",
        secondary: "#f5f5f5",
        accent: "#f5f5f5",
        background: "#ffffff",
        foreground: "#0a0a0a",
        muted: "#737373",
        border: "#e5e5e5",
        success: "#15803d",
        warning: "#a16207",
        error: "#dc2626",
        info: "#2563eb",
      },
      dark: {
        primary: "#e5e5e5",
        secondary: "#262626",
        accent: "#262626",
        background: "#0a0a0a",
        foreground: "#fafafa",
        muted: "#a3a3a3",
        border: "#2e2e2e",
        success: "#4ade80",
        warning: "#facc15",
        error: "#f87171",
        info: "#60a5fa",
      },
    },
  },
  {
    id: "orange",
    name: "Orange",
    description: "Orange Design System colors, as published in Boosted 5.3.",
    theme: {
      light: {
        primary: "#f16e00",
        secondary: "#000000",
        accent: "#eeeeee",
        background: "#ffffff",
        foreground: "#000000",
        muted: "#666666",
        border: "#cccccc",
        success: "#228722",
        warning: "#ffcc00",
        error: "#cd3c14",
        info: "#4170d8",
      },
      dark: {
        primary: "#ff7900",
        secondary: "#ffffff",
        accent: "#333333",
        background: "#141414",
        foreground: "#ffffff",
        muted: "#999999",
        border: "#666666",
        success: "#66cc66",
        warning: "#ffcc00",
        error: "#ff4d4d",
        info: "#6699ff",
      },
    },
  },
  {
    id: "bref",
    name: "Bref",
    description: "The default bref-ui palette: warm paper background, blue and red.",
    theme: {
      light: {
        primary: "#1d4ed8",
        secondary: "#c51630",
        accent: "#e5e1d8",
        background: "#f1eee7",
        foreground: "#151515",
        muted: "#696661",
        border: "#d4cfc4",
        success: "#34745a",
        warning: "#945c08",
        error: "#bc2436",
        info: "#2563b8",
      },
      dark: {
        primary: "#92b4df",
        secondary: "#df97a5",
        accent: "#26272b",
        background: "#18191c",
        foreground: "#eceef2",
        muted: "#acb0b8",
        border: "#34363b",
        success: "#abc3a3",
        warning: "#d9bc82",
        error: "#dfa4a7",
        info: "#a3c1d1",
      },
    },
  },
];

export function getThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

// ---------------------------------------------------------------------------
// Colors

const HEX_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/i;

/** "#F60" or "ff6600" → "#ff6600"; undefined when the value is not a hex color. */
export function normalizeHex(value: string): string | undefined {
  const match = HEX_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const hex = match[1]!.toLowerCase();
  return `#${hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex}`;
}

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two hex colors, from 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [la, lb] = [luminance(normalizeHex(a)!), luminance(normalizeHex(b)!)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Text color for a fill: the palette's background or foreground, whichever reads better. */
export function readableOn(fill: string, palette: ThemePalette): string {
  const candidates = [palette.foreground, palette.background, "#ffffff", "#000000"];
  return candidates.reduce((best, c) => (contrastRatio(fill, c) > contrastRatio(fill, best) + 0.01 ? c : best));
}

export interface ContrastIssue {
  mode: ThemeMode;
  role: ThemeRole;
  ratio: number;
}

/** Text roles that do not reach the WCAG AA ratio (4.5:1) on the background. */
export function themeContrastIssues(theme: ThemeConfig): ContrastIssue[] {
  return MODES.flatMap((mode) =>
    (["foreground", "muted"] as const)
      .map((role) => ({ mode, role, ratio: contrastRatio(theme[mode][role], theme[mode].background) }))
      .filter((issue) => issue.ratio < 4.5),
  );
}

export function validateTheme(theme: ThemeConfig): string[] {
  const errors: string[] = [];
  for (const mode of MODES) {
    for (const role of ROLE_IDS) {
      const value = theme[mode]?.[role];
      if (typeof value !== "string" || !normalizeHex(value)) {
        errors.push(`Theme color ${mode}.${role} must be a hex color like #f16e00.`);
      }
    }
  }
  return errors;
}

/** Copy of a theme with every color as lowercase #rrggbb (the theme must be valid). */
function normalizeTheme(theme: ThemeConfig): ThemeConfig {
  const palette = (mode: ThemeMode) =>
    Object.fromEntries(ROLE_IDS.map((role) => [role, normalizeHex(theme[mode][role])!])) as ThemePalette;
  return { light: palette("light"), dark: palette("dark") };
}

// ---------------------------------------------------------------------------
// Sharing: themes travel in URLs as a preset id or 22 hex values

/** "orange" for an unchanged preset, otherwise the light then dark colors: "f16e00-000000-…". */
export function encodeTheme(theme: ThemeConfig): string {
  const normalized = normalizeTheme(theme);
  const preset = THEME_PRESETS.find((p) => MODES.every((m) => ROLE_IDS.every((r) => p.theme[m][r] === normalized[m][r])));
  if (preset) return preset.id;
  return MODES.flatMap((m) => ROLE_IDS.map((r) => normalized[m][r].slice(1))).join("-");
}

export function decodeTheme(value: string): ThemeConfig | undefined {
  const preset = getThemePreset(value);
  if (preset) return preset.theme;
  const colors = value.split("-").map((c) => normalizeHex(c));
  if (colors.length !== ROLE_IDS.length * 2 || colors.some((c) => !c)) return undefined;
  const palette = (offset: number) =>
    Object.fromEntries(ROLE_IDS.map((role, i) => [role, colors[offset + i]!])) as ThemePalette;
  return { light: palette(0), dark: palette(ROLE_IDS.length) };
}

// ---------------------------------------------------------------------------
// Generated code

/** CSS variables of the theme, shadcn/ui names: a fill and the text drawn on it. */
function paletteVariables(palette: ThemePalette): string[] {
  const lines = [
    `--background: ${palette.background};`,
    `--foreground: ${palette.foreground};`,
    `--muted-foreground: ${palette.muted};`,
    `--border: ${palette.border};`,
  ];
  for (const role of FILLED_ROLES) {
    lines.push(`--${role}: ${palette[role]};`, `--${role}-foreground: ${readableOn(palette[role], palette)};`);
  }
  return lines;
}

/**
 * Light values on :root, dark values under [data-theme="dark"] (set on <html> by the inline
 * script, from the saved choice or the system preference).
 */
export function themeVariablesCss(theme: ThemeConfig, extra: string[] = []): string {
  const { light, dark } = normalizeTheme(theme);
  const indent = (lines: string[]) => lines.map((l) => `  ${l}`).join("\n");
  return `:root {
  color-scheme: light;
${indent(paletteVariables(light))}
}

[data-theme="dark"] {
  color-scheme: dark;
${indent(paletteVariables(dark))}
}

/* Derived from the colors above, so they follow the mode. */
:root,
[data-theme] {
${indent(["--muted: color-mix(in oklab, var(--foreground) 6%, var(--background));", ...extra])}
}`;
}

/** Tailwind utilities for every theme color: bg-primary, text-primary-foreground, border-border… */
export function tailwindThemeColors(): string[] {
  return [
    "--color-background: var(--background);",
    "--color-foreground: var(--foreground);",
    "--color-muted: var(--muted);",
    "--color-muted-foreground: var(--muted-foreground);",
    "--color-border: var(--border);",
    ...FILLED_ROLES.flatMap((role) => [
      `--color-${role}: var(--${role});`,
      `--color-${role}-foreground: var(--${role}-foreground);`,
    ]),
  ];
}

/**
 * Runs in <head> before the page paints, so the page never flashes the wrong mode.
 * The choice is "light", "dark" or "system" (default), saved in localStorage.
 */
export const THEME_SCRIPT = `(() => {
  const root = document.documentElement;
  const media = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    let preference = "system";
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") preference = saved;
    } catch {}
    root.dataset.themePreference = preference;
    const auto = preference === "system" && media.matches;
    root.dataset.theme = preference === "dark" || auto ? "dark" : "light";
  };
  apply();
  media.addEventListener("change", apply);
  addEventListener("storage", apply);
})();`;

/** The bref-ui <Theme palette> prop: bref-ui has no accent or border role. */
export function brefPalette(theme: ThemeConfig): Record<ThemeMode, Record<string, string>> {
  const { light, dark } = normalizeTheme(theme);
  const roles = ["primary", "secondary", "background", "foreground", "muted", "info", "success", "warning", "error"] as const;
  const pick = (palette: ThemePalette) => Object.fromEntries(roles.map((r) => [r, palette[r]]));
  return { light: pick(light), dark: pick(dark) };
}

/** README section: the colors and how the mode switch works. */
export function themeReadme(theme: ThemeConfig, cssPath: string, toggleFile: string): string {
  const { light, dark } = normalizeTheme(theme);
  const rows = THEME_ROLES.map((r) => `| ${r.label} | \`${light[r.id]}\` | \`${dark[r.id]}\` | ${r.hint} |`);
  return `Colors are CSS variables in \`${cssPath}\`: light values on \`:root\`, dark values under \`[data-theme="dark"]\`. The text color on each fill (\`--primary-foreground\`…) was picked for contrast; check it again if you change a color.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
${rows.join("\n")}

An inline script in the page \`<head>\` sets \`data-theme\` on \`<html>\` before the first paint, from the visitor's choice (saved in \`localStorage\`) or the system preference. \`${toggleFile}\` switches between light, dark and system.`;
}

// Light / dark / system switch. Its label follows data-theme-preference through CSS, so it renders
// the same on the server and needs no state (no hydration mismatch).

const ICONS = {
  light: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>`,
  dark: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>`,
  system: `<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8M12 17v4" /></svg>`,
};

const OPTIONS = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["system", "System"],
] as const;

const TOGGLE_RULES = `.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 50;
  display: inline-flex;
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 9999px;
  background: var(--background);
  color: var(--foreground);
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.theme-toggle:hover {
  border-color: var(--primary);
}

.theme-toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}`;

/** Global CSS of the React switch (appended to the main stylesheet). */
export const THEME_TOGGLE_CSS = `${TOGGLE_RULES}

.theme-toggle [data-theme-option] {
  display: none;
  align-items: center;
  gap: 0.375rem;
}

${OPTIONS.map(([id]) => `[data-theme-preference="${id}"] .theme-toggle [data-theme-option="${id}"]`).join(",\n")} {
  display: inline-flex;
}
`;

const TOGGLE_DOC = "Cycles light → dark → system. The inline script in the page <head> applies the saved choice on load.";

const toggleBody = (indent: string) => `const root = document.documentElement;
${indent}const current = (root.dataset.themePreference ?? "system") as Preference;
${indent}const next = NEXT[current] ?? "system";
${indent}try {
${indent}  localStorage.setItem("theme", next);
${indent}} catch {
${indent}  // Storage blocked (private browsing): the choice lasts until the page is reloaded.
${indent}}
${indent}root.dataset.themePreference = next;
${indent}root.dataset.theme =
${indent}  next === "dark" || (next === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";`;

const TOGGLE_TYPES = `type Preference = "light" | "dark" | "system";

const NEXT: Record<Preference, Preference> = { light: "dark", dark: "system", system: "light" };`;

const toggleButton = (classAttr: string, clickAttr: string, svgAttr: (svg: string) => string) => `<button
  type="button"
  ${classAttr}="theme-toggle"
  ${clickAttr}
  title="Theme: light, dark or system"
>
${OPTIONS.map(([id, label]) => `  <span data-theme-option="${id}">\n    ${svgAttr(ICONS[id])}\n    ${label}\n  </span>`).join("\n")}
</button>`;

/** React switch, for Next.js (Client Component) and Vite. */
export function reactThemeToggle(useClient: string): string {
  // SVG attributes are camelCase in JSX.
  const jsx = (svg: string) =>
    svg.replace(/stroke-(width|linecap|linejoin)/g, (_, p: string) => `stroke${p[0]!.toUpperCase()}${p.slice(1)}`);
  const button = toggleButton("className", "onClick={toggle}", jsx)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  return `${useClient}${TOGGLE_TYPES}

/** ${TOGGLE_DOC} */
export function ThemeToggle() {
  const toggle = () => {
    ${toggleBody("    ")}
  };

  return (
${button}
  );
}
`;
}

/** Svelte switch with scoped styles. */
export function svelteThemeToggle(): string {
  const scopedOptions = OPTIONS.map(([id]) => `  :global([data-theme-preference="${id}"]) [data-theme-option="${id}"]`).join(",\n");
  return `<script lang="ts">
  ${TOGGLE_TYPES.replace(/\n/g, "\n  ")}

  /** ${TOGGLE_DOC} */
  function toggle() {
    ${toggleBody("    ")}
  }
</script>

${toggleButton("class", "onclick={toggle}", (svg) => svg)}

<style>
  ${TOGGLE_RULES.replace(/\n/g, "\n  ")}

  [data-theme-option] {
    display: none;
    align-items: center;
    gap: 0.375rem;
  }

${scopedOptions} {
    display: inline-flex;
  }
</style>
`;
}

/** Tailwind's dark: variant follows the data-theme attribute instead of the media query. */
export const THEME_DARK_VARIANT = `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));`;
