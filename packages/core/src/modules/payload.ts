import type { StackModule } from "../types";

/** Header of the files Payload generates and keeps up to date (same content as its blank template). */
const GENERATED = `/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
`;

const VIEW_ARGS = `type Args = {
  params: Promise<{
    segments: string[];
  }>;
  searchParams: Promise<{
    [key: string]: string | string[];
  }>;
};

export const generateMetadata = ({ params, searchParams }: Args): Promise<Metadata> =>
  generatePageMetadata({ config, params, searchParams });
`;

export const payload: StackModule = {
  id: "payload",
  name: "Payload CMS",
  description: "Headless CMS with an admin panel, running inside the Next.js app (PostgreSQL).",
  category: "cms",
  homepage: "https://payloadcms.com",
  // Payload is the data layer: its PostgreSQL adapter manages the database schema.
  conflicts: ["prisma", "drizzle"],
  frameworks: ["nextjs"],
  apply(project) {
    const { paths } = project;
    // The site lives in app/(frontend) (see ProjectBuilder): the admin panel has its own root layout.
    const admin = `${paths.appRoot}/(payload)`;
    const configFile = `${paths.srcDir}payload.config.ts`;
    const collections = `${paths.srcDir}collections`;

    project
      .addDependency(
        "payload",
        "@payloadcms/next",
        "@payloadcms/ui",
        "@payloadcms/db-postgres",
        "@payloadcms/richtext-lexical",
        "graphql",
        "sharp",
      )
      .addScript("payload", "payload")
      // Payload 3.92 ships vulnerable versions of these: force the patched ones.
      .addOverride("dompurify", "^3.4.17")
      .addOverride("happy-dom", "^21.0.4")
      .addOverride("@esbuild-kit/core-utils>esbuild", "^0.25.12")
      .addScript("generate:types", "payload generate:types")
      .addScript("generate:importmap", "payload generate:importmap")
      .addEnv({
        key: "DATABASE_URL",
        value: "postgresql://postgres:postgres@localhost:5432/app",
        comment: "PostgreSQL connection string",
      })
      .addEnv({ key: "PAYLOAD_SECRET", value: "", comment: "Generate one with: openssl rand -hex 32" })
      .wrapNextConfig('import { withPayload } from "@payloadcms/next/withPayload";', "withPayload")
      // Payload's admin panel reads the current time and request data while rendering, which
      // Cache Components reports as errors on every admin page: keep the classic caching model.
      .unsetNextConfig("cacheComponents", "partialPrefetching")
      // Uploads are served by Payload's REST API.
      .setNextConfig("images", '{ localPatterns: [{ pathname: "/api/media/file/**" }] }');

    project.editFile("tsconfig.json", (content) => {
      const tsconfig = JSON.parse(content);
      tsconfig.compilerOptions.paths["@payload-config"] = [`./${configFile}`];
      return JSON.stringify(tsconfig, null, 2);
    });

    project.addFile(
      configFile,
      `import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import path from "path";
import { buildConfig } from "payload";
import sharp from "sharp";
import { fileURLToPath } from "url";

import { Media } from "./collections/media";
import { Users } from "./collections/users";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
  }),
  sharp,
});
`,
    );

    project.addFile(
      `${collections}/users.ts`,
      `import type { CollectionConfig } from "payload";

/** Admin panel users. \`auth: true\` adds the email and password fields. */
export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email" },
  auth: true,
  fields: [],
};
`,
    );

    project.addFile(
      `${collections}/media.ts`,
      `import type { CollectionConfig } from "payload";

/** Uploaded images and files, readable by everyone. */
export const Media: CollectionConfig = {
  slug: "media",
  access: { read: () => true },
  fields: [{ name: "alt", type: "text", required: true }],
  upload: true,
};
`,
    );

    project.addFile(
      `${admin}/layout.tsx`,
      `${GENERATED}import config from "@payload-config";
import "@payloadcms/next/css";
import type { ServerFunctionClient } from "payload";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";
import React from "react";

import { importMap } from "./admin/importMap.js";
import "./custom.scss";

type Args = {
  children: React.ReactNode;
};

const serverFunction: ServerFunctionClient = async function (args) {
  "use server";
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  });
};

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
);

export default Layout;
`,
    );
    project.addFile(`${admin}/custom.scss`, "");
    project.addFile(
      `${admin}/admin/importMap.js`,
      `import { CollectionCards as CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1 } from "@payloadcms/next/rsc";

/** @type import('payload').ImportMap */
export const importMap = {
  "@payloadcms/next/rsc#CollectionCards": CollectionCards_f9c02e79a4aed9a3924487c0cd4cafb1,
};
`,
    );
    project.addFile(
      `${admin}/admin/[[...segments]]/page.tsx`,
      `${GENERATED}import type { Metadata } from "next";

import config from "@payload-config";
import { RootPage, generatePageMetadata } from "@payloadcms/next/views";
import { importMap } from "../importMap";

${VIEW_ARGS}
const Page = ({ params, searchParams }: Args) => RootPage({ config, params, searchParams, importMap });

export default Page;
`,
    );
    project.addFile(
      `${admin}/admin/[[...segments]]/not-found.tsx`,
      `${GENERATED}import type { Metadata } from "next";

import config from "@payload-config";
import { NotFoundPage, generatePageMetadata } from "@payloadcms/next/views";
import { importMap } from "../importMap";

${VIEW_ARGS}
const NotFound = ({ params, searchParams }: Args) => NotFoundPage({ config, params, searchParams, importMap });

export default NotFound;
`,
    );
    project.addFile(
      `${admin}/api/[...slug]/route.ts`,
      `${GENERATED}import config from "@payload-config";
import "@payloadcms/next/css";
import { REST_DELETE, REST_GET, REST_OPTIONS, REST_PATCH, REST_POST, REST_PUT } from "@payloadcms/next/routes";

export const GET = REST_GET(config);
export const POST = REST_POST(config);
export const DELETE = REST_DELETE(config);
export const PATCH = REST_PATCH(config);
export const PUT = REST_PUT(config);
export const OPTIONS = REST_OPTIONS(config);
`,
    );
    project.addFile(
      `${admin}/api/graphql/route.ts`,
      `${GENERATED}import config from "@payload-config";
import { GRAPHQL_POST, REST_OPTIONS } from "@payloadcms/next/routes";

export const POST = GRAPHQL_POST(config);

export const OPTIONS = REST_OPTIONS(config);
`,
    );
    project.addFile(
      `${admin}/api/graphql-playground/route.ts`,
      `${GENERATED}import config from "@payload-config";
import "@payloadcms/next/css";
import { GRAPHQL_PLAYGROUND_GET } from "@payloadcms/next/routes";

export const GET = GRAPHQL_PLAYGROUND_GET(config);
`,
    );

    project.addReadmeSection(
      "CMS (Payload)",
      `1. Start a PostgreSQL database and set \`DATABASE_URL\` and \`PAYLOAD_SECRET\` in \`.env\`.
2. Run \`${project.run("dev")}\` and open [http://localhost:3000/admin](http://localhost:3000/admin) to create the first admin user. In development, Payload creates the tables itself.
3. Add collections in \`${collections}\`, register them in \`${configFile}\` and generate their types with \`${project.run("generate:types")}\`.

Read content from Server Components with the Local API:

\`\`\`tsx
import config from "@payload-config";
import { getPayload } from "payload";

const payload = await getPayload({ config });
const { docs } = await payload.find({ collection: "media" });
\`\`\`

The site lives in \`${paths.app}\` and the admin panel in \`${admin}\`: each route group has its own root layout. Before deploying, create migrations with \`${project.run("payload")} migrate:create\` and apply them with \`${project.run("payload")} migrate\`. Docs: https://payloadcms.com/docs`,
    );
  },
};
