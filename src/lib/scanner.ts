/**
 * ArchPulse Scanner Core
 * Pure TypeScript scanning logic — no Next.js dependencies.
 * Imported by: src/app/api/scan/route.ts
 * Mirrored in: scripts/scanner-core.js (CommonJS) for testing
 */
import fs from "fs";
import path from "path";
import type { ScannedFile, FileRole, ScanResult } from "@/types";
import { getHealthStatus } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

export const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out",
  ".cache", "coverage", "__tests__", ".turbo", ".vercel",
]);

export const SKIP_FILE_NAMES = new Set(["next-env.d.ts"]);

export const SKIP_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /\.d\.ts$/];

export const VALID_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// ─── Role Detection ──────────────────────────────────────────────────────────

export function detectRole(filePath: string, content: string): FileRole {
  const rel = filePath.toLowerCase().replace(/\\/g, "/");
  const base = path.basename(rel);

  // Store: path-based or usage-based
  if (rel.includes("/store/") || base.startsWith("use") && /createstore|zustand|create\(/i.test(content)) return "store";
  if (rel.includes("/lib/store/") || rel.includes("store")) {
    // Double-check it's actually a store
    if (/createstore|zustand|create\s*</i.test(content)) return "store";
  }

  // Hook: use* prefix (must be useXxx convention) or /hooks/ folder
  const baseStem = base.replace(/\.tsx?$/, "");
  if (rel.includes("/hooks/") || (/^use[A-Z]/.test(baseStem) && /export\s+(const|function)\s+use[A-Z]/.test(content))) return "hook";
  if (/^use[A-Z]/.test(baseStem) && (base.endsWith(".ts") || base.endsWith(".tsx"))) return "hook";

  // API route
  if (rel.includes("/api/") || rel.includes("/routes/") || base === "route.ts" || base === "route.tsx") return "api";

  // Page
  if (base === "page.tsx" || base === "page.ts" || rel.includes("/pages/")) return "page";

  // Layout
  if (base === "layout.tsx" || base === "layout.ts") return "page";

  // Types/interfaces only
  if (rel.includes("/types/") || rel.endsWith(".d.ts")) return "type";
  if (rel.includes("/types") && !rel.includes("/components/")) return "type";

  // Config/constants
  if (base.includes("config") || base.includes("constants") || base.includes(".config.")) return "config";

  // Lib/core utilities
  if (rel.includes("/lib/") || rel.includes("/core/") || rel.includes("/utils/") || rel.includes("/helpers/")) {
    if (rel.includes("/store")) return "store";
    if (rel.includes("/util") || rel.includes("/helper")) return "util";
    return "lib";
  }

  // Component: /components/ folder or React component export
  if (rel.includes("/components/") || rel.includes("/scene/") || rel.includes("/interaction/")) {
    if (rel.includes("/hooks/") || (base.startsWith("use") && !base.includes("/"))) return "hook";
    return "component";
  }

  // Dev scripts folder
  if (rel.includes("/scripts/") || rel.startsWith("scripts/")) return "lib";

  // Fallback: check for React component signature
  if (/export\s+default\s+function\s+[A-Z]/.test(content) || /export\s+default\s+memo\s*\(/.test(content)) return "component";
  if (/export\s+(const|function)\s+use[A-Z]/.test(content)) return "hook";
  if (/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(content)) return "api";
  if (/export\s+(interface|type)\s+\w+/.test(content) && !/export\s+default\s+function/.test(content) && !/export\s+(const|function)\s+(?!type|interface)\w+/.test(content)) return "type";

  // .tsx files almost certainly render UI
  if (base.endsWith(".tsx")) return "component";

  // .ts files with any export are utility libs
  if (base.endsWith(".ts") && /export\s/.test(content)) return "lib";

  return "unknown";
}

// ─── Responsibility Extraction ────────────────────────────────────────────────

export function extractResponsibilities(content: string, filePath: string): string[] {
  const responsibilities: string[] = [];

  // API handlers
  const apiVerbs = [...content.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(m => m[1]);
  if (apiVerbs.length > 0) {
    responsibilities.push(`API: ${apiVerbs.join(", ")}`);
  }

  // Exported default component/function
  const defaultExport = content.match(/export\s+default\s+(?:function|class)\s+(\w+)|export\s+default\s+memo\s*\(\s*(\w+)/);
  if (defaultExport) {
    responsibilities.push(`Default export: ${defaultExport[1] || defaultExport[2]}`);
  }

  // Named exported functions/components
  const namedFns = [...content.matchAll(/export\s+(?:async\s+)?function\s+([a-z][a-zA-Z0-9]*)/g)].map(m => m[1]);
  if (namedFns.length > 0) {
    responsibilities.push(`Functions: ${namedFns.slice(0, 4).join(", ")}${namedFns.length > 4 ? ` +${namedFns.length - 4}` : ""}`);
  }

  // Exported consts (hooks, actions, utilities)
  const consts = [...content.matchAll(/export\s+const\s+([a-zA-Z]\w*)/g)].map(m => m[1]).filter(n => n !== "default");
  if (consts.length > 0) {
    responsibilities.push(`Exports: ${consts.slice(0, 4).join(", ")}${consts.length > 4 ? ` +${consts.length - 4}` : ""}`);
  }

  // Exported interfaces/types  
  const types = [...content.matchAll(/export\s+(?:interface|type)\s+([A-Z]\w*)/g)].map(m => m[1]);
  if (types.length > 0) {
    responsibilities.push(`Types: ${types.slice(0, 4).join(", ")}${types.length > 4 ? ` +${types.length - 4}` : ""}`);
  }

  // React hooks used (hint at what the component manages)
  const reactHooks = new Set([...content.matchAll(/\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/g)].map(m => m[1]));
  if (reactHooks.size > 0) {
    responsibilities.push(`React: ${[...reactHooks].join(", ")}`);
  }

  const name = path.basename(filePath, path.extname(filePath));
  if (responsibilities.length === 0) responsibilities.push(`Module: ${name}`);

  return responsibilities;
}

// ─── Line Counting ────────────────────────────────────────────────────────────

export function countNonCommentLines(content: string): number {
  const lines = content.split("\n");
  let count = 0;
  let inBlockComment = false;

  for (const raw of lines) {
    const line = raw.trim();

    // Block comment state machine
    if (inBlockComment) {
      if (line.includes("*/")) inBlockComment = false;
      continue;
    }
    // Opening block comment
    if (line.startsWith("/*") || line.startsWith("/**")) {
      if (!line.includes("*/") || line.indexOf("*/") <= 2) {
        inBlockComment = true;
      }
      continue;
    }
    // Single-line comment
    if (line.startsWith("//")) continue;
    // JSX comment {/* ... */}
    if (line.startsWith("{/*") || line === "{}" || /^\{\/\*.*\*\/\}$/.test(line)) continue;
    // Blank line
    if (line === "") continue;

    count++;
  }
  return count;
}

// ─── Import Extraction ────────────────────────────────────────────────────────

export function extractImports(content: string, filePath: string, allFiles: string[]): string[] {
  const dir = path.dirname(filePath);
  const resolved: string[] = [];

  // Simple regex: capture the module specifier from `from '...'` or `require('...')`
  const importPaths = [
    ...content.matchAll(/from\s+["']([^"']+)["']/g),
    ...content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map(m => m[1]);

  for (const imp of importPaths) {
    if (!imp.startsWith(".") && !imp.startsWith("@/")) continue;

    let resolvedPart: string;
    if (imp.startsWith("@/")) {
      resolvedPart = path.posix.join("src", imp.slice(2));
    } else {
      resolvedPart = path.posix.join(dir.replace(/\\/g, "/"), imp);
    }

    // Normalize separators
    resolvedPart = resolvedPart.replace(/\\/g, "/");
    // Remove leading ./ if present after join
    if (resolvedPart.startsWith("./")) resolvedPart = resolvedPart.slice(2);

    const candidates = [
      resolvedPart,
      resolvedPart + ".ts",
      resolvedPart + ".tsx",
      resolvedPart + ".js",
      resolvedPart + ".jsx",
      resolvedPart + "/index.ts",
      resolvedPart + "/index.tsx",
      resolvedPart + "/index.js",
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

export function walkDir(dirPath: string, rootPath: string): string[] {
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
      if (SKIP_FILE_NAMES.has(entry.name)) continue;
      const ext = path.extname(entry.name);
      if (!VALID_EXTS.has(ext)) continue;
      if (SKIP_FILE_PATTERNS.some(p => p.test(entry.name))) continue;
      const rel = path.relative(rootPath, fullPath).replace(/\\/g, "/");
      results.push(rel);
    }
  }
  return results;
}

// ─── Main Scan Function ───────────────────────────────────────────────────────

export function scanProject(folderPath: string): ScanResult {
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
      imports: [],
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
  return {
    projectName,
    rootPath: folderPath,
    scannedAt: new Date().toISOString(),
    files,
    totalFiles: files.length,
    totalLines: files.reduce((sum, f) => sum + f.lines, 0),
  };
}

// ─── Host Path Resolution (Windows paths → /mnt/X on Docker/Linux) ───────────

import os from "os";

export function resolveHostPath(inputPath: string): string {
  if (os.platform() !== "win32" && !inputPath.match(/^[A-Za-z]:[/\\]/)) return inputPath;
  if (os.platform() === "win32") return inputPath;
  const match = inputPath.match(/^([A-Za-z]):[/\\]?(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, "/");
    return `/mnt/${drive}/${rest}`;
  }
  return inputPath;
}
