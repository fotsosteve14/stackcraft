import { describe, expect, test } from "vitest";
import { detectPackageManager, parseCliArgs } from "../src/args";

describe("parseCliArgs", () => {
  test("reads the name and every option", () => {
    expect(
      parseCliArgs([
        "my-app",
        "--framework",
        "sveltekit",
        "--arch",
        "feature",
        "--modules",
        "tailwind, vitest",
        "--theme",
        "neutral",
        "--pm",
        "pnpm",
        "--github",
        "private",
        "--no-install",
        "-y",
      ]),
    ).toEqual({
      name: "my-app",
      framework: "sveltekit",
      architecture: "feature",
      modules: ["tailwind", "vitest"],
      theme: "neutral",
      packageManager: "pnpm",
      description: undefined,
      github: "private",
      install: false,
      yes: true,
      help: false,
      version: false,
    });
  });

  test("installs by default and asks everything else", () => {
    expect(parseCliArgs([])).toMatchObject({ name: undefined, modules: undefined, install: true, yes: false });
  });

  test("rejects an unknown --github mode", () => {
    expect(() => parseCliArgs(["--github", "maybe"])).toThrow("--github must be public, private or no");
  });
});

test("detects the package manager running npm create", () => {
  expect(detectPackageManager("pnpm/10.20.0 npm/? node/v24.15.0 win32 x64")).toBe("pnpm");
  expect(detectPackageManager("bun/1.3.0 npm/? node/v24.3.0 linux x64")).toBe("bun");
  expect(detectPackageManager("npm/11.6.2 node/v24.15.0 win32 x64 workspaces/false")).toBe("npm");
  expect(detectPackageManager("")).toBe("npm");
});
