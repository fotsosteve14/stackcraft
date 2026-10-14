import { generateProject, GitHubError, InvalidConfigError, pushToGitHub } from "@stackcraft/core";
import { NextResponse, type NextRequest } from "next/server";
import { configFromJson } from "@/lib/config";
import { getOAuthConfig, readSession, SESSION_COOKIE } from "@/lib/github-session";

/** Generates the project and pushes it to a new repository of the signed-in user. */
export async function POST(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config) return NextResponse.json({ error: "GitHub push is not configured." }, { status: 501 });

  // The session cookie is SameSite=Lax; also reject cross-origin calls explicitly.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Cross-origin request refused." }, { status: 403 });
  }

  const session = readSession(request, config);
  if (!session) return NextResponse.json({ error: "Sign in with GitHub first." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    config?: unknown;
    repo?: { name?: unknown; private?: unknown };
  } | null;
  const project = configFromJson(body?.config);
  const repoName = typeof body?.repo?.name === "string" && body.repo.name ? body.repo.name : project.name;

  try {
    const { files } = await generateProject(project);
    const result = await pushToGitHub(
      session.token,
      { name: repoName, description: project.description, private: body?.repo?.private !== false },
      files,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof InvalidConfigError) {
      return NextResponse.json({ error: error.errors.join(" ") }, { status: 400 });
    }
    if (error instanceof GitHubError) {
      const response = NextResponse.json({ error: error.message }, { status: error.status === 401 ? 401 : 422 });
      if (error.status === 401) response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    throw error;
  }
}
