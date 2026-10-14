import type { StackModule } from "../types";

export const nextauth: StackModule = {
  id: "nextauth",
  name: "Auth.js (NextAuth v5)",
  description: "Authentication with OAuth providers, preconfigured with GitHub.",
  category: "auth",
  homepage: "https://authjs.dev",
  apply(project) {
    project
      .addDependency("next-auth")
      .addEnv({
        key: "AUTH_SECRET",
        value: "",
        comment: `Generate one with: ${project.exec("auth secret")}`,
      })
      .addEnv({
        key: "AUTH_GITHUB_ID",
        value: "",
        comment: "GitHub OAuth app: https://github.com/settings/developers",
      })
      .addEnv({ key: "AUTH_GITHUB_SECRET", value: "" });

    project.addFile(
      project.paths.auth,
      `import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [GitHub],
});
`,
    );

    project.addFile(
      `${project.paths.app}/api/auth/[...nextauth]/route.ts`,
      `import { handlers } from "${project.importPath(project.paths.auth)}";

export const { GET, POST } = handlers;
`,
    );

    project.addReadmeSection(
      "Authentication (Auth.js)",
      `1. Create a GitHub OAuth app with the callback URL \`http://localhost:3000/api/auth/callback/github\`.
2. Fill \`AUTH_SECRET\`, \`AUTH_GITHUB_ID\` and \`AUTH_GITHUB_SECRET\` in \`.env\`.
3. Read the session in a Server Component with \`const session = await auth()\` (from \`${project.importPath(project.paths.auth)}\`).

More providers: https://authjs.dev/getting-started/authentication/oauth`,
    );
  },
};
