import { describe, expect, test } from "vitest";
import {
  contrastRatio,
  decodeTheme,
  encodeTheme,
  generateProject,
  getThemePreset,
  parseColor,
  parseThemeTokens,
  readableOn,
  THEME_PRESETS,
  themeContrastIssues,
  validateConfig,
  type ProjectConfig,
  type ThemeConfig,
} from "../src";

const orange = getThemePreset("orange")!.theme;

const base: ProjectConfig = {
  name: "my-app",
  description: "",
  framework: "nextjs",
  packageManager: "npm",
  architecture: "simple",
  modules: [],
  theme: orange,
};

describe("colors", () => {
  test("contrast ratios follow WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1);
  });

  test("text on a fill is the palette color that reads best", () => {
    // Orange uses black text on its orange, in both modes.
    expect(readableOn(orange.light.primary, orange.light)).toBe("#000000");
    expect(readableOn(orange.dark.primary, orange.dark)).toBe("#000000");
    expect(readableOn(orange.light.secondary, orange.light)).toBe("#ffffff");
  });

  test("presets have readable text", () => {
    for (const preset of THEME_PRESETS) expect(themeContrastIssues(preset.theme), preset.id).toEqual([]);
  });

  test("reports muted text that is too light", () => {
    const theme: ThemeConfig = { ...orange, light: { ...orange.light, muted: "#bbbbbb" } };
    expect(themeContrastIssues(theme)).toEqual([{ mode: "light", role: "muted", ratio: expect.any(Number) }]);
  });

  test("parses hex, rgb, hsl and oklch", () => {
    expect(parseColor("#F60")).toBe("#ff6600");
    expect(parseColor("rgb(255 121 0)")).toBe("#ff7900");
    expect(parseColor("rgba(255, 121, 0, 1)")).toBe("#ff7900");
    expect(parseColor("hsl(0 0% 100%)")).toBe("#ffffff");
    expect(parseColor("222.2 84% 4.9%")).toBe("#020817");
    expect(parseColor("oklch(1 0 0)")).toBe("#ffffff");
    expect(parseColor("oklch(0.577 0.245 27.325)")).toBe("#e7000b");
    expect(parseColor("oklch(1 0 0 / 10%)")).toBeUndefined();
    expect(parseColor("var(--x)")).toBeUndefined();
  });
});

describe("sharing", () => {
  test("an unchanged preset is shared by id", () => {
    expect(encodeTheme(orange)).toBe("orange");
    expect(decodeTheme("orange")).toEqual(orange);
  });

  test("custom colors round-trip", () => {
    const theme: ThemeConfig = { ...orange, light: { ...orange.light, primary: "#123ABC" } };
    const encoded = encodeTheme(theme);
    expect(encoded.split("-")).toHaveLength(22);
    expect(decodeTheme(encoded)!.light.primary).toBe("#123abc");
  });

  test("rejects malformed values", () => {
    expect(decodeTheme("nope")).toBeUndefined();
    expect(decodeTheme("ff0000-00ff00")).toBeUndefined();
  });
});

describe("parseThemeTokens", () => {
  test("reads Bootstrap / Boosted (Orange) CSS variables", () => {
    const css = `
      :root, [data-bs-theme=light] {
        --bs-primary: #f16e00;
        --bs-primary-rgb: 241, 110, 0;
        --bs-primary-text-emphasis: #000;
        --bs-secondary: #000;
        --bs-success: #228722;
        --bs-danger: #cd3c14;
        --bs-body-color: #000;
        --bs-body-bg: #fff;
        --bs-secondary-color: #666;
        --bs-tertiary-bg: #fafafa;
        --bs-border-color: #ccc;
        --bs-gray-500: #ccc;
      }
      [data-bs-theme=dark], :root[data-bs-theme=dark] {
        --bs-body-color: #fff;
        --bs-body-bg: #141414;
        --bs-primary: #ff7900;
        --bs-danger: #ff4d4d;
      }`;
    const result = parseThemeTokens(css);
    expect(result.light).toEqual({
      primary: "#f16e00",
      secondary: "#000000",
      success: "#228722",
      error: "#cd3c14",
      foreground: "#000000",
      background: "#ffffff",
      muted: "#666666",
      border: "#cccccc",
    });
    expect(result.dark).toEqual({ foreground: "#ffffff", background: "#141414", primary: "#ff7900", error: "#ff4d4d" });
    expect(result.sources["light.muted"]).toBe("--bs-secondary-color");
  });

  test("reads shadcn/ui themes in oklch, preferring muted-foreground for muted text", () => {
    const css = `
      :root {
        --background: oklch(1 0 0);
        --foreground: oklch(0.145 0 0);
        --primary: oklch(0.205 0 0);
        --primary-foreground: oklch(0.985 0 0);
        --muted: oklch(0.97 0 0);
        --muted-foreground: oklch(0.556 0 0);
      }
      .dark {
        --background: oklch(0.145 0 0);
        --border: oklch(1 0 0 / 10%);
      }`;
    const result = parseThemeTokens(css);
    expect(result.light.background).toBe("#ffffff");
    expect(result.light.primary).toBe("#171717");
    expect(result.light.muted).toBe("#737373");
    expect(result.light.foreground).toBe("#0a0a0a");
    expect(result.dark).toEqual({ background: "#0a0a0a" });
  });

  test("reads W3C design tokens grouped by mode", () => {
    const json = JSON.stringify({
      color: {
        light: { primary: { $value: "#f16e00", $type: "color" }, background: { $value: "#ffffff" } },
        dark: { primary: { $value: "#ff7900" }, background: { $value: "#141414" } },
      },
    });
    expect(parseThemeTokens(json)).toMatchObject({
      light: { primary: "#f16e00", background: "#ffffff" },
      dark: { primary: "#ff7900", background: "#141414" },
    });
  });
});

describe("generated theme", () => {
  test("validates colors", () => {
    expect(validateConfig({ ...base, theme: { ...orange, dark: { ...orange.dark, primary: "orange" } } })).toEqual([
      "Theme color dark.primary must be a hex color like #f16e00.",
    ]);
  });

  test("no theme keeps the defaults", async () => {
    const { files } = await generateProject({ ...base, theme: undefined, modules: ["tailwind"] });
    expect(files["app/globals.css"]).not.toContain("data-theme");
    expect(files["app/layout.tsx"]).not.toContain("ThemeToggle");
    expect(Object.keys(files).some((f) => f.includes("theme-toggle"))).toBe(false);
  });

  test("Next.js with shadcn/ui: variables, dark variant, inline script and switch", async () => {
    const { files } = await generateProject({ ...base, modules: ["shadcn"] });
    const css = files["app/globals.css"]!;
    expect(css).toContain('@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));');
    expect(css).toContain("--primary: #f16e00;\n  --primary-foreground: #000000;");
    expect(css).toContain('[data-theme="dark"] {\n  color-scheme: dark;');
    expect(css).toContain("--destructive: var(--error);");
    expect(css).toContain(".theme-toggle {");
    const layout = files["app/layout.tsx"]!;
    expect(layout).toContain("suppressHydrationWarning");
    expect(layout).toContain("<script dangerouslySetInnerHTML={{ __html: themeScript }} />");
    expect(layout).toContain('import { ThemeToggle } from "@/components/theme-toggle";');
    expect(files["components/theme-toggle.tsx"]).toMatch(/^"use client";/);
    expect(files["README.md"]).toMatch(/\| Primary +\| `#f16e00` \| `#ff7900` \|/);
  });

  test("Vite: script in index.html, switch in main.tsx, themed muted text", async () => {
    const { files } = await generateProject({ ...base, framework: "vite-react", modules: ["tailwind"] });
    expect(files["index.html"]).toContain('root.dataset.theme =');
    expect(files["src/main.tsx"]).toContain("<ThemeToggle />");
    expect(files["src/components/theme-toggle.tsx"]).not.toContain("use client");
    expect(files["src/App.tsx"]).toContain("text-muted-foreground");
  });

  test("SvelteKit with bref-ui: palette prop, scoped switch, script in app.html", async () => {
    const { files } = await generateProject({ ...base, framework: "sveltekit", modules: ["bref-ui"] });
    const layout = files["src/routes/+layout.svelte"]!;
    expect(layout).toContain('primary: "#f16e00"');
    expect(layout).toContain('import ThemeToggle from "$lib/components/theme-toggle.svelte";');
    expect(files["src/lib/components/theme-toggle.svelte"]).toContain('onclick={toggle}');
    expect(files["src/lib/components/theme-toggle.svelte"]).toContain(':global([data-theme-preference="dark"])');
    expect(files["src/app.html"]).toContain('root.dataset.themePreference = preference;');
    expect(files["src/app.css"]).toContain("--primary: #f16e00;");
  });
});
