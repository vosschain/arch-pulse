import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { ScannedFile, FileRole, ScanResult } from "@/types";
import { getHealthStatus } from "@/types";

// ─── Role Detection ──────────────────────────────────────────────────────────

function detectRole(filePath: string, content: string): FileRole {
  const rel = filePath.toLowerCase().replace(/\\/g, "/");
  if (rel.includes("/components/")) return "component";
  if (rel.includes("/hooks/") || path.basename(rel).startsWith("use")) return "hook";
  if (rel.includes("/store/") || rel.includes("store")) return "store";
  if (rel.includes("/lib/") && !rel.includes("/hooks/")) return "lib";
  if (rel.includes("/util") || rel.includes("/helper")) return "util";
  if (rel.includes("/api/") || rel.includes("/routes/")) return "api";
  if (rel.includes("/types") || rel.endsWith(".d.ts")) return "type";
  if (rel.includes("config") || rel.includes("constants")) return "config";
  if (rel.includes("/pages/") || rel.includes("/app/") && rel.endsWith("page.tsx")) return "page";
  // Check for React component signatures
  if (/export\s+default\s+function\s+[A-Z]/.test(content)) return "component";
  if (/export\s+(const|function)\s+use[A-Z]/.test(content)) return "hook";
  return "unknown";
}

// ─── Responsibility Extraction ────────────────────────────────────────────────

function extractResponsibilities(content: string, filePath: string): string[] {
  const responsibilities: string[] = [];

  // Exported functions / components
  const exportedFns = content.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g);
  const fns: string[] = [];
  for (const m of exportedFns) fns.push(m[1]);
  if (fns.length > 0) responsibilities.push(`Exports: ${fns.slice(0, 5).join(", ")}${fns.length > 5 ? ` +${fns.length - 5} more` : ""}`);

  // Exported consts (hooks, stores, utilities)
  const exportedConsts = content.matchAll(/export\s+const\s+(\w+)/g);
  const consts: string[] = [];
  for (const m of exportedConsts) consts.push(m[1]);
  if (consts.length > 0) responsibilities.push(`Exports const: ${consts.slice(0, 5).join(", ")}${consts.length > 5 ? ` +${consts.length - 5} more` : ""}`);

  // Exported interfaces/types
  const types = content.matchAll(/export\s+(?:interface|type)\s+(\w+)/g);
  const typeNames: string[] = [];
  for (const m of types) typeNames.push(m[1]);
  if (typeNames.length > 0) responsibilities.push(`Types: ${typeNames.slice(0, 4).join(", ")}`);

  // API route handlers
  if (/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)) {
    const verbs = [...content.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g)].map(m => m[1]);
    responsibilities.push(`API handlers: ${verbs.join(", ")}`);
  }

  // Zustand store
  if (/create\s*(?:<[^>]+>)?\s*\(/.test(content) && content.includes("zustand")) {
    responsibilities.push("Zustand store definition");
  }

  // React hooks used
  const reactHooks = new Set<string>();
  for (const m of content.matchAll(/\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/g)) {
    reactHooks.add(m[1]);
  }
  if (reactHooks.size > 0) responsibilities.push(`React hooks: ${[...reactHooks].join(", ")}`);

  const name = path.basename(filePath, path.extname(filePath));
  if (responsibilities.length === 0) responsibilities.push(`Module: ${name}`);

  return responsibilities;
}

// ─── Line Counting ────────────────────────────────────────────────────────────

function countNonCommentLines(content: string): number {
  const lines = content.split("\n");
  let count = 0;
  let inBlockComment = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    if (line.startsWith("/*") || line.startsWith("/**")) {
      inBlockComment = !line.includes("*/") || line.indexOf("*/") <= line.indexOf("/*");
      continue;
    }
    if (line.startsWith("//") || line === "") continue;
    count++;
  }
  return count;
}

// ─── Import Extraction ────────────────────────────────────────────────────────

function extractImports(content: string, filePath: string, allFiles: string[]): string[] {
  const dir = path.dirname(filePath);
  const importMatches = content.matchAll(/(?:import|require)\s*(?:\{[^}]*\}|[\w*]+\s*,?\s*\{[^}]*\}|[\w*]+)?\s*(?:from\s*)?["']([^"']+)["']/g);
  const resolved: string[] = [];

  for (const m of importMatches) {
    const imp = m[1];
    if (!imp.startsWith(".") && !imp.startsWith("@/")) continue;

    let resolved_path: string;
    if (imp.startsWith("@/")) {
      // Project alias — map to src/
      resolved_path = path.join("src", imp.slice(2));
    } else {
      resolved_path = path.join(dir, imp);
    }

    // Normalize and try extensions
    resolved_path = resolved_path.replace(/\\/g, "/");
    const candidates = [
      resolved_path,
      resolved_path + ".ts",
      resolved_path + ".tsx",
      resolved_path + ".js",
      resolved_path + ".jsx",
      resolved_path + "/index.ts",
      resolved_path + "/index.tsx",
    ];

    for (const c of candidates) {
      const normalized = c.replace(/\\/g, "/");
      if (allFiles.includes(normalized)) {
        resolved.push(normalized);
        break;
      }
    }
  }

  return [...new Set(resolved)];
}

// ─── Recursive File Walk ──────────────────────────────────────────────────────

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "dist", "build", "out", ".cache", "coverage"]);
const VALID_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_FILES = new Set(["next-env.d.ts"]);

function walkDir(dirPath: string, rootPath: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, rootPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (!VALID_EXTS.has(ext) || SKIP_FILES.has(entry.name)) continue;
      const rel = path.relative(rootPath, fullPath).replace(/\\/g, "/");
      results.push(rel);
    }
  }
  return results;
}

// ─── POST /api/scan ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { folderPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const folderPath = body.folderPath?.trim();
  if (!folderPath) {
    return NextResponse.json({ error: "folderPath is required" }, { status: 400 });
  }

  if (!fs.existsSync(folderPath)) {
    return NextResponse.json({ error: `Folder not found: ${folderPath}` }, { status: 404 });
  }

  const relPaths = walkDir(folderPath, folderPath);
  const files: ScannedFile[] = [];

  for (const rel of relPaths) {
    const absPath = path.join(folderPath, rel);
    let content = "";
    try {
      content = fs.readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }

    const totalLines = content.split("\n").length;
    const lines = countNonCommentLines(content);
    const role = detectRole(rel, content);
    const health = getHealthStatus(lines);
    const responsibilities = extractResponsibilities(content, rel);

    files.push({
      id: rel,
      name: path.basename(rel),
      path: rel,
      role,
      lines,
      totalLines,
      imports: [], // Filled in second pass below
      responsibilities,
      health,
    });
  }

  // Second pass: resolve inter-file imports
  const allRels = files.map((f) => f.id);
  for (const file of files) {
    const absPath = path.join(folderPath, file.path);
    let content = "";
    try {
      content = fs.readFileSync(absPath, "utf-8");
    } catch {
      continue;
    }
    file.imports = extractImports(content, file.path, allRels);
  }

  const projectName = path.basename(folderPath);
  const result: ScanResult = {
    projectName,
    rootPath: folderPath,
    scannedAt: new Date().toISOString(),
    files,
    totalFiles: files.length,
    totalLines: files.reduce((sum, f) => sum + f.lines, 0),
  };

  return NextResponse.json(result);
}
