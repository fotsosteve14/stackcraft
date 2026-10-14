import { NextResponse, type NextRequest } from "next/server";
import { getOAuthConfig, STATE_COOKIE, unseal, writeSession } from "@/lib/github-session";

/** GitHub redirects here after the user authorizes StackCraft. */
export async function GET(request: NextRequest) {
  const config = getOAuthConfig();
  if (!config) return NextResponse.json({ error: "GitHub push is not configured." }, { status: 501 });

  const params = request.nextUrl.searchParams;
  const saved = unseal<{ state: string; returnTo: string }>(request.cookies.get(STATE_COOKIE)?.value ?? "", config.secret);
  const back = (returnTo: string, status: "connected" | "error") => {
    const url = new URL(returnTo, request.nextUrl.origin);
    url.searchParams.set("github", status);
    const response = NextResponse.redirect(url);
    response.cookies.delete(STATE_COOKIE);
    return response;
  };

  if (!saved || !params.get("code") || params.get("state") !== saved.state) {
    return back(saved?.returnTo ?? "/", "error");
  }

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: params.get("code"),
      redirect_uri: new URL("/api/github/callback", request.nextUrl.origin).toString(),
    }),
  });
  const { access_token: token } = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string };
  if (!token) return back(saved.returnTo, "error");

  const userResponse = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!userResponse.ok) return back(saved.returnTo, "error");
  const user = (await userResponse.json()) as { login: string; avatar_url: string };

  const response = back(saved.returnTo, "connected");
  writeSession(response, { token, login: user.login, avatarUrl: user.avatar_url }, config);
  return response;
}
