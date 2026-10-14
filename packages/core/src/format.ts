import * as babel from "prettier/plugins/babel";
import * as estree from "prettier/plugins/estree";
import * as markdown from "prettier/plugins/markdown";
import * as postcss from "prettier/plugins/postcss";
import * as typescript from "prettier/plugins/typescript";
import * as yaml from "prettier/plugins/yaml";
import { format } from "prettier/standalone";

const plugins = [babel, estree, markdown, postcss, typescript, yaml];

/**
 * Formats a generated file with Prettier's defaults, so projects are consistently
 * formatted however modules write their templates. Files Prettier does not know
 * (Dockerfile, .gitignore, schema.prisma…) are returned unchanged.
 */
export async function formatFile(path: string, content: string): Promise<string> {
  try {
    return await format(content, { filepath: path, plugins });
  } catch (error) {
    if (error instanceof Error && error.name === "UndefinedParserError") return content;
    throw new Error(`Failed to format ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
