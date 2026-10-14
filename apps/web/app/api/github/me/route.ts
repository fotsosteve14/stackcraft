import { NextResponse, type NextRequest } from "next/server";
import { getOAuthConfig, readSession } from "@/lib/github-session";

export interface GitHubStatus {
  configured: boolean;
  user: { login: string; avatarUrl: string } | null;
}

/** Whether GitHub push is available and who is signed in. Never exposes the token. */
export function GET(request: NextRequest) {
  const config = getOAuthConfig();
  const session = config ? readSession(request, config) : null;
  const status: GitHubStatus = {
    configured: !!config,
    user: session ? { login: session.login, avatarUrl: session.avatarUrl } : null,
  };
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
