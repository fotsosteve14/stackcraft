// The package only types its Node entry point; the browser build has the same exports.
declare module "prettier-plugin-svelte/browser" {
  import type { Plugin } from "prettier";

  export const languages: Plugin["languages"];
  export const parsers: Plugin["parsers"];
  export const printers: Plugin["printers"];
  export const options: Plugin["options"];
}
