import { describe, expect, test } from "vitest";
import { GitHubError, pushToGitHub } from "../src";

interface Call {
  method: string;
  path: string;
  body: unknown;
}

/** Fake GitHub API: `responses` maps "METHOD path" to a queue of [status, body]. */
function fakeGitHub(responses: Record<string, [number, unknown][]>) {
  const calls: Call[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    const path = url.replace("https://api.github.com", "");
    const key = `${init.method} ${path}`;
    calls.push({ method: init.method!, path, body: init.body ? JSON.parse(init.body as string) : undefined });
    const queue = responses[key];
    if (!queue?.length) throw new Error(`Unexpected call: ${key}`);
    const [status, body] = queue.length > 1 ? queue.shift()! : queue[0]!;
    return new Response(JSON.stringify(body), { status });
  }) as typeof globalThis.fetch;
  return { fetch, calls };
}

const repoCreated: [number, unknown] = [
  201,
  {
    name: "my-app",
    full_name: "octocat/my-app",
    html_url: "https://github.com/octocat/my-app",
    clone_url: "https://github.com/octocat/my-app.git",
    default_branch: "main",
    owner: { login: "octocat" },
  },
];

const files = { "package.json": "{}\n", "app/page.tsx": "export default function Page() {}\n" };

describe("pushToGitHub", () => {
  test("creates the repo and pushes every file in a single root commit", async () => {
    const gh = fakeGitHub({
      "POST /user/repos": [repoCreated],
      "POST /repos/octocat/my-app/git/trees": [[201, { sha: "tree1" }]],
      "POST /repos/octocat/my-app/git/commits": [[201, { sha: "commit1" }]],
      "PATCH /repos/octocat/my-app/git/refs/heads/main": [[200, {}]],
    });

    const result = await pushToGitHub("tok", { name: "my-app", description: "Demo", private: true }, files, {
      fetch: gh.fetch,
    });

    expect(result).toEqual({
      url: "https://github.com/octocat/my-app",
      fullName: "octocat/my-app",
      cloneUrl: "https://github.com/octocat/my-app.git",
    });
    expect(gh.calls[0]!.body).toEqual({ name: "my-app", description: "Demo", private: true, auto_init: true });
    expect(gh.calls[1]!.body).toEqual({
      tree: [
        { path: "package.json", mode: "100644", type: "blob", content: "{}\n" },
        { path: "app/page.tsx", mode: "100644", type: "blob", content: "export default function Page() {}\n" },
      ],
    });
    expect(gh.calls[2]!.body).toMatchObject({ tree: "tree1", parents: [] });
    expect(gh.calls[3]!.body).toEqual({ sha: "commit1", force: true });
  });

  test("retries while the new repository is not ready", async () => {
    const gh = fakeGitHub({
      "POST /user/repos": [repoCreated],
      "POST /repos/octocat/my-app/git/trees": [
        [409, { message: "Git Repository is empty." }],
        [201, { sha: "tree1" }],
      ],
      "POST /repos/octocat/my-app/git/commits": [[201, { sha: "commit1" }]],
      "PATCH /repos/octocat/my-app/git/refs/heads/main": [[200, {}]],
    });
    await pushToGitHub("tok", { name: "my-app", private: false }, files, { fetch: gh.fetch, retryDelayMs: 0 });
    expect(gh.calls.filter((c) => c.path.endsWith("/trees"))).toHaveLength(2);
  });

  test("explains when the repository already exists", async () => {
    const gh = fakeGitHub({ "POST /user/repos": [[422, { message: "Repository creation failed." }]] });
    const error = await pushToGitHub("tok", { name: "my-app", private: false }, files, { fetch: gh.fetch }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as GitHubError).status).toBe(422);
    expect((error as Error).message).toContain('"my-app" already exists');
  });

  test("reports an expired token", async () => {
    const gh = fakeGitHub({ "POST /user/repos": [[401, { message: "Bad credentials" }]] });
    await expect(pushToGitHub("tok", { name: "x", private: false }, files, { fetch: gh.fetch })).rejects.toThrow(
      "session has expired",
    );
  });
});
