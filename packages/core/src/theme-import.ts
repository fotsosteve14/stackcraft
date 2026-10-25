import { MODES, normalizeHex, type ThemeMode, type ThemePalette, type ThemeRole } from "./theme";

/**
 * Import from a design system: CSS custom properties or JSON design tokens.
 * Token names are matched to roles; colors can be hex, rgb(), hsl() or oklch().
 */

/** Patterns per role, best first: a role keeps the token that matches its earliest pattern. */
const ROLE_PATTERNS: Record<ThemeRole, RegExp[]> = {
  primary: [/^primary$/, /^brand$/, /(^|-)primary$/],
  secondary: [/^secondary$/, /(^|-)secondary$/],
  accent: [/^accent$/, /^(tertiary|highlight)$/, /(^|-)accent$/],
  background: [/^background$/, /^(body-bg|bg-body|bg|page-bg|canvas)$/, /^surface$/],
  foreground: [/^foreground$/, /^(body-color|text|text-color|text-primary|fg)$/, /^on-(background|surface)$/],
  muted: [/^muted-foreground$/, /^(secondary-color|text-secondary|text-muted|muted-text|on-surface-variant)$/, /^muted$/],
  border: [/^border$/, /^(border-color|outline|divider|stroke)$/],
  success: [/^success$/, /(^|-)(success|positive|valid)$/],
  warning: [/^warning$/, /(^|-)(warning|warn|caution)$/],
  error: [/^(error|danger|destructive)$/, /(^|-)(error|danger|destructive|critical|negative)$/],
  info: [/^info$/, /(^|-)(info|informative|information)$/],
};

/** States and variants of a color, never the base value. */
const SKIP_PATTERN =
  /(hover|active|pressed|focus|disabled|visited|rgb|emphasis|subtle|translucent|inverse|contrast|shadow|-\d{2,4}$)/;

/** "--bs-primary", "color.primary.default", "sysColorPrimary" → "primary". */
function normalizeTokenName(name: string): string {
  return name
    .replace(/^-+/, "")
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[._/\s]+/g, "-")
    .replace(/-(default|base|value|main)$/, "")
    .replace(/^(bs|ods|tw|mdc|md|sys|ref|theme|semantic|global)-/, "")
    .replace(/^(color|colors)-/, "")
    .replace(/-color$/, (suffix, offset: number, full: string) =>
      /^(border|body|text|secondary)-color$/.test(full) ? suffix : "",
    );
}

function matchRole(name: string): { role: ThemeRole; rank: number } | undefined {
  const normalized = normalizeTokenName(name);
  if (SKIP_PATTERN.test(normalized)) return undefined;
  let best: { role: ThemeRole; rank: number } | undefined;
  for (const [role, patterns] of Object.entries(ROLE_PATTERNS) as [ThemeRole, RegExp[]][]) {
    const rank = patterns.findIndex((p) => p.test(normalized));
    if (rank !== -1 && (!best || rank < best.rank)) best = { role, rank };
  }
  return best;
}

// ---------------------------------------------------------------------------
// Color parsing

const toHex = (channels: number[]) =>
  `#${channels.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, "0")).join("")}`;

/** "62.8%" → 0.628 (when `percentScale` is 100), "0.628" → 0.628. */
function number(value: string, percentScale = 100): number {
  return value.endsWith("%") ? parseFloat(value) / percentScale : parseFloat(value);
}

/** Parses the space or comma separated arguments of a color function, rejecting translucent colors. */
function colorArguments(value: string, fn: string): string[] | undefined {
  const match = new RegExp(`^${fn}a?\\((.+)\\)$`, "i").exec(value) ?? (fn === "hsl" ? [value, value] : null);
  if (!match) return undefined;
  const [channels, alpha] = match[1]!.split("/").map((s) => s.trim());
  const parts = channels!.split(/[\s,]+/).filter(Boolean);
  // Legacy rgba(r, g, b, a) form.
  const legacyAlpha = parts.length === 4 ? parts.pop() : undefined;
  const a = alpha ?? legacyAlpha;
  if (a !== undefined && number(a) < 1) return undefined;
  return parts.length === 3 ? parts : undefined;
}

function rgbToHex(value: string): string | undefined {
  const parts = colorArguments(value, "rgb");
  if (!parts) return undefined;
  return toHex(parts.map((p) => (p.endsWith("%") ? number(p) : parseFloat(p) / 255)));
}

/** Also accepts the bare "222.2 47.4% 11.2%" form of shadcn/ui v3 themes. */
function hslToHex(value: string): string | undefined {
  const parts = colorArguments(value, "hsl");
  if (!parts || !parts[1]!.endsWith("%") || !parts[2]!.endsWith("%")) return undefined;
  const h = parseFloat(parts[0]!);
  const s = number(parts[1]!);
  const l = number(parts[2]!);
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return toHex([f(0), f(8), f(4)]);
}

/** OKLCH → sRGB (https://bottosson.github.io/posts/oklab/), clipped to the sRGB gamut. */
function oklchToHex(value: string): string | undefined {
  const parts = colorArguments(value, "oklch");
  if (!parts) return undefined;
  const L = number(parts[0]!);
  const C = number(parts[1]!, 250);
  const h = (parseFloat(parts[2]!) * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return toHex(linear.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055)));
}

export function parseColor(raw: string): string | undefined {
  const value = raw.replace(/\s*!important$/, "").trim();
  return normalizeHex(value) ?? rgbToHex(value) ?? oklchToHex(value) ?? hslToHex(value);
}

// ---------------------------------------------------------------------------
// Token extraction

interface Token {
  name: string;
  value: string;
  mode: ThemeMode;
}

const DARK_PATTERN = /dark|night/i;
const LIGHT_KEY_PATTERN = /^(light|day)([-_]?(mode|theme))?$/i;
const DARK_KEY_PATTERN = /^(dark|night)([-_]?(mode|theme))?$/i;

/** Custom properties; those inside a rule or @media that mentions "dark" belong to the dark mode. */
function cssTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const stack: string[] = [];
  let chunk = "";
  const flush = () => {
    const match = /^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(chunk);
    if (match) {
      const mode = stack.some((s) => DARK_PATTERN.test(s)) ? "dark" : "light";
      tokens.push({ name: match[1]!, value: match[2]!, mode });
    }
    chunk = "";
  };
  for (const char of text.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") {
      stack.push(chunk);
      chunk = "";
    } else if (char === "}") {
      flush();
      stack.pop();
    } else if (char === ";") {
      flush();
    } else {
      chunk += char;
    }
  }
  flush();
  return tokens;
}

/** Flat or nested JSON, W3C design tokens (`$value`) or Tokens Studio (`value`), with light / dark groups. */
function jsonTokens(data: unknown): Token[] {
  const tokens: Token[] = [];
  const walk = (node: unknown, path: string[], mode: ThemeMode) => {
    if (typeof node === "string") {
      tokens.push({ name: path.join("-"), value: node, mode });
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const record = node as Record<string, unknown>;
    const value = record.$value ?? record.value;
    if (typeof value === "string") {
      tokens.push({ name: path.join("-"), value, mode });
      return;
    }
    for (const [key, child] of Object.entries(record)) {
      if (key.startsWith("$")) continue;
      if (DARK_KEY_PATTERN.test(key)) walk(child, path, "dark");
      else if (LIGHT_KEY_PATTERN.test(key)) walk(child, path, "light");
      else walk(child, [...path, key], mode);
    }
  };
  walk(data, [], "light");
  return tokens;
}

export interface ThemeImport {
  light: Partial<ThemePalette>;
  dark: Partial<ThemePalette>;
  /** Token each color came from: "light.primary" → "--bs-primary". */
  sources: Partial<Record<`${ThemeMode}.${ThemeRole}`, string>>;
}

/**
 * Reads the colors of a design system export: CSS custom properties or JSON tokens.
 * Roles missing from the export are left out, so the caller keeps its current values.
 */
export function parseThemeTokens(text: string): ThemeImport {
  let tokens: Token[];
  try {
    tokens = jsonTokens(JSON.parse(text));
  } catch {
    tokens = cssTokens(text);
  }

  const ranks: Partial<Record<string, number>> = {};
  const result: ThemeImport = { light: {}, dark: {}, sources: {} };
  for (const token of tokens) {
    const match = matchRole(token.name);
    const color = match && parseColor(token.value);
    if (!match || !color) continue;
    const key = `${token.mode}.${match.role}` as const;
    // Same rank: the first token wins (later ones are usually overrides for components).
    if ((ranks[key] ?? Infinity) <= match.rank) continue;
    ranks[key] = match.rank;
    result[token.mode][match.role] = color;
    result.sources[key] = token.name;
  }
  return result;
}

/** Number of colors found, over both modes. */
export function importedCount(imported: ThemeImport): number {
  return MODES.reduce((n, mode) => n + Object.keys(imported[mode]).length, 0);
}
