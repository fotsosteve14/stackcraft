const API = "https://api.github.com";

export interface GitHubRepoOptions {
  name: string;
  description?: string;
  private: boolean;
}

export interface GitHubPushResult {
  /** Repository page, e.g. https://github.com/octocat/my-app */
  url: string;
  /** owner/name */
  fullName: string;
  cloneUrl: string;
}

export interface GitHubPushOptions {
  fetch?: typeof fetch;
  /** Delay between retries while GitHub initializes a new repository. */
  retryDelayMs?: number;
  commitMessage?: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/**
 * Creates a repository on the authenticated user's account and pushes the files as a
 * single commit. The commit is authored by the owner of the token.
 */
export async function pushToGitHub(
  token: string,
  repo: GitHubRepoOptions,
  files: Record<string, string>,
  options: GitHubPushOptions = {},
): Promise<GitHubPushResult> {
  const fetchImpl = options.fetch ?? fetch;
  const retryDelayMs = options.retryDelayMs ?? 1000;

  const call = async <T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> => {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = (await response.json().catch(() => ({}))) as T;
    return { status: response.status, data };
  };

  const fail = (status: number, data: unknown, fallback: string): never => {
    if (status === 401) throw new GitHubError("Your GitHub session has expired. Sign in again.", 401);
    const message = (data as { message?: string })?.message;
    throw new GitHubError(message ? `${fallback}: ${message}` : fallback, status);
  };

  // auto_init gives the repository a branch, which the Git Data API needs.
  const created = await call<{ name: string; full_name: string; html_url: string; clone_url: string; default_branch: string; owner: { login: string } }>(
    "POST",
    "/user/repos",
    { name: repo.name, description: repo.description || undefined, private: repo.private, auto_init: true },
  );
  if (created.status === 422) {
    throw new GitHubError(`A repository named "${repo.name}" already exists on your account, or the name is invalid.`, 422);
  }
  if (created.status !== 201) fail(created.status, created.data, "Could not create the repository");

  const { owner, name, default_branch: branch } = created.data;
  const base = `/repos/${owner.login}/${name}/git`;

  // A freshly created repository can take a moment before its Git data is writable.
  let tree: { status: number; data: { sha: string } } | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    tree = await call<{ sha: string }>("POST", `${base}/trees`, {
      tree: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", content })),
    });
    if (tree.status !== 404 && tree.status !== 409) break;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
  if (tree!.status !== 201) fail(tree!.status, tree!.data, "Could not upload the files");

  const commit = await call<{ sha: string }>("POST", `${base}/commits`, {
    message: options.commitMessage ?? "Initial commit from StackCraft",
    tree: tree!.data.sha,
    parents: [],
  });
  if (commit.status !== 201) fail(commit.status, commit.data, "Could not create the commit");

  // Replace GitHub's auto-generated commit so the history starts with the project.
  const ref = await call("PATCH", `${base}/refs/heads/${branch}`, { sha: commit.data.sha, force: true });
  if (ref.status !== 200) fail(ref.status, ref.data, "Could not update the branch");

  return { url: created.data.html_url, fullName: created.data.full_name, cloneUrl: created.data.clone_url };
}
