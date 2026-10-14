import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "sc_github";
export const STATE_COOKIE = "sc_github_state";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface GitHubSession {
  token: string;
  login: string;
  avatarUrl: string;
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  secret: string;
}

/** OAuth settings from the environment, or null when GitHub push is not configured. */
export function getOAuthConfig(): GitHubOAuthConfig | null {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET } = process.env;
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !SESSION_SECRET) return null;
  return { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET, secret: SESSION_SECRET };
}

function key(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM so the GitHub token is unreadable and tamper-proof in the cookie. */
export function seal(value: unknown, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}

export function unseal<T>(sealed: string, secret: string): T | null {
  try {
    const raw = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    return JSON.parse(data.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function readSession(request: NextRequest, config: GitHubOAuthConfig): GitHubSession | null {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  return cookie ? unseal<GitHubSession>(cookie, config.secret) : null;
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function writeSession(response: NextResponse, session: GitHubSession, config: GitHubOAuthConfig) {
  response.cookies.set(SESSION_COOKIE, seal(session, config.secret), cookieOptions(SESSION_MAX_AGE));
}

/** Only same-site relative paths, to avoid open redirects. */
export function safeReturnPath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}
