import { randomBytes } from "node:crypto";
import { connection, NextResponse, type NextRequest } from "next/server";
import { cookieOptions, getOAuthConfig, safeReturnPath, seal, STATE_COOKIE } from "@/lib/github-session";

/** Starts the GitHub OAuth flow. ?return=/?name=… brings the user back to their configuration. */
export async function GET(request: NextRequest) {
  await connection();
  const config = getOAuthConfig();
  if (!config) return NextResponse.json({ error: "GitHub push is not configured." }, { status: 501 });

  const state = randomBytes(16).toString("hex");
  const returnTo = safeReturnPath(request.nextUrl.searchParams.get("return"));

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", config.clientId);
  authorize.searchParams.set("redirect_uri", new URL("/api/github/callback", request.nextUrl.origin).toString());
  // "repo" is required to create private repositories.
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "true");

  const response = NextResponse.redirect(authorize);
  response.cookies.set(STATE_COOKIE, seal({ state, returnTo }, config.secret), cookieOptions(60 * 10));
  return response;
}
