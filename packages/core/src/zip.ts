import JSZip from "jszip";
import { generateProject } from "./generate";
import type { ProjectConfig } from "./types";

/** Generates the project and packs it in a zip, inside a folder named after the project. */
export async function generateZip(config: ProjectConfig): Promise<Uint8Array> {
  const { files } = await generateProject(config);
  const zip = new JSZip();
  const root = zip.folder(config.name)!;
  for (const [path, content] of Object.entries(files)) root.file(path, content);
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
