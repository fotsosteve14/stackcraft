"use client";

import { generateProject, type GeneratedProject, type ProjectConfig } from "@stackcraft/core";
import { useEffect, useState } from "react";
import { Modal } from "./modal";

interface TreeNode {
  name: string;
  path: string;
  children?: TreeNode[];
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [] };
  for (const path of paths) {
    let node = root;
    const parts = path.split("/");
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let child = node.children!.find((c) => c.name === part && !!c.children === !isFile);
      if (!child) {
        child = { name: part, path: childPath, children: isFile ? undefined : [] };
        node.children!.push(child);
      }
      node = child;
    });
  }
  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .sort((a, b) => Number(!a.children) - Number(!b.children) || a.name.localeCompare(b.name))
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n));
  return sort(root.children!);
}

function Tree({ nodes, depth, selected, onSelect }: { nodes: TreeNode[]; depth: number; selected: string; onSelect: (path: string) => void }) {
  return nodes.map((node) =>
    node.children ? (
      <div key={node.path}>
        <div className="truncate py-1 text-muted" style={{ paddingLeft: depth * 14 + 12 }}>
          ▾ {node.name}
        </div>
        <Tree nodes={node.children} depth={depth + 1} selected={selected} onSelect={onSelect} />
      </div>
    ) : (
      <button
        key={node.path}
        type="button"
        onClick={() => onSelect(node.path)}
        className={`block w-full truncate py-1 pr-2 text-left ${
          selected === node.path ? "bg-accent-soft font-medium text-accent" : "hover:bg-background"
        }`}
        style={{ paddingLeft: depth * 14 + 12 }}
      >
        {node.name}
      </button>
    ),
  );
}

interface ExplorerProps {
  config: ProjectConfig;
  onClose: () => void;
  onDownload: () => void;
}

export function Explorer({ config, onClose, onDownload }: ExplorerProps) {
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("package.json");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    generateProject(config)
      .then((p) => !cancelled && setProject(p))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [config]);

  const content = project?.files[selected] ?? "";

  return (
    <Modal title="Explore project" onClose={onClose} className="h-[84vh] max-w-6xl">
      <header className="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="truncate font-semibold">
          {config.name}
          <span className="font-normal text-muted"> / {selected}</span>
        </h2>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-background"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Download
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="px-2 text-muted hover:text-foreground">
            ✕
          </button>
        </div>
      </header>

      {error && <p className="p-6 text-danger">{error}</p>}
      {!error && !project && <p className="p-6 text-muted">Generating…</p>}
      {project && (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav className="max-h-48 shrink-0 overflow-y-auto border-b border-border py-2 font-mono text-sm md:max-h-none md:w-64 md:border-r md:border-b-0">
            <Tree nodes={buildTree(Object.keys(project.files))} depth={0} selected={selected} onSelect={setSelected} />
          </nav>
          <pre className="min-w-0 flex-1 overflow-auto bg-background p-4 font-mono text-[13px] leading-relaxed">
            <code>{content}</code>
          </pre>
        </div>
      )}
    </Modal>
  );
}
