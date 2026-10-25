import type { StackModule } from "../types";

const MCP_URL = "https://mcp.svelte.dev/mcp";

/** The prompt recommended by https://svelte.dev/docs/ai/instructions, verbatim. */
const AGENT_PROMPT = `You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
`;

const json = (data: unknown) => JSON.stringify(data, null, 2);

export const svelteAiTools: StackModule = {
  id: "svelte-ai-tools",
  name: "Svelte AI tools",
  description: "Official Svelte MCP server, skills and agent instructions, so AI coding agents write correct Svelte 5 code.",
  category: "ai",
  homepage: "https://svelte.dev/docs/ai/overview",
  frameworks: ["sveltekit"],
  apply(project) {
    // Same files as `npx sv add ai-tools` with every client: the Svelte plugin where one exists
    // (it bundles the MCP server, skills and a sub-agent, and updates itself), the remote MCP server elsewhere.
    project.addFile("AGENTS.md", AGENT_PROMPT);
    project.addFile("GEMINI.md", AGENT_PROMPT);

    // Claude Code installs the plugin once the workspace is trusted, and reads AGENTS.md through CLAUDE.md.
    project.addFile(
      ".claude/settings.json",
      json({
        extraKnownMarketplaces: { svelte: { source: { source: "github", repo: "sveltejs/ai-tools" } } },
        enabledPlugins: { "svelte@svelte": true },
      }),
    );
    project.addFile(".claude/CLAUDE.md", "@../AGENTS.md");

    project.addFile(".opencode/opencode.json", json({ $schema: "https://opencode.ai/config.json", plugin: ["@sveltejs/opencode"] }));
    project.addFile(".opencode/svelte.json", json({ $schema: "https://svelte.dev/opencode/schema.json" }));

    project.addFile(".cursor/mcp.json", json({ mcpServers: { svelte: { url: MCP_URL } } }));
    project.addFile(".vscode/mcp.json", json({ servers: { svelte: { url: MCP_URL } } }));
    project.addFile(
      ".gemini/settings.json",
      json({
        $schema: "https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json",
        mcpServers: { svelte: { url: MCP_URL } },
      }),
    );

    project.addReadmeSection(
      "Svelte AI tools",
      `The project is set up for the [Svelte AI tools](https://svelte.dev/docs/ai/overview): an MCP server with the Svelte 5 and SvelteKit docs and a \`svelte-autofixer\` that checks generated code. \`AGENTS.md\` (and \`GEMINI.md\`) tells the agent when to use them.

| Client | Setup |
| --- | --- |
| Claude Code | Svelte plugin (MCP server, skills, \`svelte-file-editor\` sub-agent), enabled in \`.claude/settings.json\`. Trust the workspace when you first open the project and it installs itself. |
| OpenCode | \`@sveltejs/opencode\` plugin, in \`.opencode/opencode.json\` |
| Cursor | Remote MCP server in \`.cursor/mcp.json\` |
| VS Code (Copilot) | Remote MCP server in \`.vscode/mcp.json\` |
| Gemini CLI | Remote MCP server in \`.gemini/settings.json\` |

Codex CLI and Copilot CLI read \`AGENTS.md\` but configure MCP servers globally: install the [Codex plugin](https://svelte.dev/docs/ai/codex-plugin) or the [Copilot plugin](https://svelte.dev/docs/ai/copilot-plugin). The remote server (\`${MCP_URL}\`) does not log or store the code sent to it; to run it locally instead, see [local setup](https://svelte.dev/docs/ai/local-setup).`,
    );
  },
};
