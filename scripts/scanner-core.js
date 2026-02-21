/**
 * scanner-core.js
 * CommonJS mirror of src/lib/scanner.ts
 * Used by verify_system.js for testing the scanning logic without transpilation.
 */

"use strict";
const fs = require("fs");
const path = require("path");

// ─── Constants ────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out",
  ".cache", "coverage", "__tests__", ".turbo", ".vercel",
]);

const SKIP_FILE_NAMES = new Set(["next-env.d.ts"]);

const SKIP_FILE_PATTERNS = [/\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /\.d\.ts$/];

const VALID_EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);

// ─── Health Status ────────────────────────────────────────────────────────────

function getHealthStatus(lines) {
  if (lines < 500) return "green";
  if (lines < 1000) return "yellow";
  if (lines < 3000) return "red-slow";
  if (lines < 5000) return "red-fast";
  return "red-critical";
}

// ─── Role Detection ──────────────────────────────────────────────────────────

function detectRole(filePath, content) {
  const rel = filePath.toLowerCase().replace(/\\/g, "/");
  const base = path.basename(rel);

  // Store
  if (rel.includes("/store/") && (rel.includes("/lib/") || /createstore|zustand/i.test(content))) return "store";
  if (rel.includes("/lib/store/")) return "store";

  // Hook: require useXxx convention (capital after 'use') to avoid false positives like utils.ts
  const baseStem = base.replace(/\.tsx?$/, "");
  if (rel.includes("/hooks/")) return "hook";
  if (/^use[A-Z]/.test(baseStem) && (base.endsWith(".ts") || base.endsWith(".tsx"))) return "hook";
  if (/export\s+(const|function)\s+use[A-Z]/.test(content)) return "hook";

  // API route
  if (base === "route.ts" || base === "route.tsx" || rel.includes("/api/")) return "api";
  if (/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(content)) return "api";

  // Page / layout
  if (base === "page.tsx" || base === "page.ts" || base === "layout.tsx" || base === "layout.ts") return "page";
  if (rel.includes("/pages/")) return "page";

  // Types
  if (rel.includes("/types/") || base === "types.ts" || base === "types.tsx") return "type";
  if (/export\s+(interface|type)\s+\w+/.test(content) && !/export\s+default\s+function/.test(content) && !/export\s+(const|function)\s+(?!type|interface)\w+/.test(content)) return "type";

  // Config
  if (base.includes("config") || base.includes("constants")) return "config";

  // Lib / util
  if (rel.includes("/lib/") || rel.includes("/core/")) {
    if (rel.includes("/store")) return "store";
    if (rel.includes("/util") || rel.includes("/helper")) return "util";
    return "lib";
  }
  if (rel.includes("/util") || rel.includes("/helper")) return "util";

  // Component
  if (rel.includes("/components/") || rel.includes("/scene/") || rel.includes("/interaction/")) {
    if (rel.includes("/hooks/") || base.startsWith("use")) return "hook";
    return "component";
  }

  // Dev scripts folder
  if (rel.includes("/scripts/") || rel.startsWith("scripts/")) return "lib";

  // Signature-based fallback
  if (/export\s+default\s+function\s+[A-Z]/.test(content) || /export\s+default\s+memo\s*\(/.test(content)) return "component";
  if (/export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(content)) return "api";

  // .tsx files almost certainly render UI
  if (base.endsWith(".tsx")) return "component";

  // .ts files with any export are utility libs
  if (base.endsWith(".ts") && /export\s/.test(content)) return "lib";

  return "unknown";
}

// ─── Responsibility Extraction ────────────────────────────────────────────────

function extractResponsibilities(content, filePath) {
  const responsibilities = [];

  const apiVerbs = [...content.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(m => m[1]);
  if (apiVerbs.length > 0) responsibilities.push(`API: ${apiVerbs.join(", ")}`);

  const defaultExport = content.match(/export\s+default\s+(?:function|class)\s+(\w+)|export\s+default\s+memo\s*\(\s*(\w+)/);
  if (defaultExport) responsibilities.push(`Default export: ${defaultExport[1] || defaultExport[2]}`);

  const namedFns = [...content.matchAll(/export\s+(?:async\s+)?function\s+([a-z]\w*)/g)].map(m => m[1]);
  if (namedFns.length > 0) responsibilities.push(`Functions: ${namedFns.slice(0, 4).join(", ")}${namedFns.length > 4 ? ` +${namedFns.length - 4}` : ""}`);

  const consts = [...content.matchAll(/export\s+const\s+([a-zA-Z]\w*)/g)].map(m => m[1]).filter(n => n !== "default");
  if (consts.length > 0) responsibilities.push(`Exports: ${consts.slice(0, 4).join(", ")}${consts.length > 4 ? ` +${consts.length - 4}` : ""}`);

  const types = [...content.matchAll(/export\s+(?:interface|type)\s+([A-Z]\w*)/g)].map(m => m[1]);
  if (types.length > 0) responsibilities.push(`Types: ${types.slice(0, 4).join(", ")}${types.length > 4 ? ` +${types.length - 4}` : ""}`);

  const reactHooks = new Set([...content.matchAll(/\b(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer)\b/g)].map(m => m[1]));
  if (reactHooks.size > 0) responsibilities.push(`React: ${[...reactHooks].join(", ")}`);

  if (responsibilities.length === 0) responsibilities.push(`Module: ${path.basename(filePath, path.extname(filePath))}`);
  return responsibilities;
}

// ─── Line Counting ────────────────────────────────────────────────────────────

function countNonCommentLines(content) {
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
      if (!line.includes("*/") || line.indexOf("*/") <= 2) {
        inBlockComment = true;
      }
      continue;
    }
    if (line.startsWith("//")) continue;
    if (line.startsWith("{/*") || /^\{\/\*.*\*\/\}$/.test(line)) continue;
    if (line === "") continue;
    count++;
  }
  return count;
}

// ─── Import Extraction ────────────────────────────────────────────────────────

function extractImports(content, filePath, allFiles) {
  const dir = path.dirname(filePath).replace(/\\/g, "/");
  const resolved = [];

  const importPaths = [
    ...content.matchAll(/from\s+["']([^"']+)["']/g),
    ...content.matchAll(/require\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map(m => m[1]);

  for (const imp of importPaths) {
    if (!imp.startsWith(".") && !imp.startsWith("@/")) continue;

    let resolvedPart;
    if (imp.startsWith("@/")) {
      resolvedPart = "src/" + imp.slice(2);
    } else {
      resolvedPart = path.posix.join(dir, imp);
    }

    resolvedPart = resolvedPart.replace(/\\/g, "/");
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
      if (allFiles.includes(c)) {
        resolved.push(c);
        break;
      }
    }
  }

  return [...new Set(resolved)];
}

// ─── Recursive File Walk ──────────────────────────────────────────────────────

function walkDir(dirPath, rootPath) {
  const results = [];
  let entries;
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

// ─── Full Scan ────────────────────────────────────────────────────────────────

function scanProject(folderPath) {
  const relPaths = walkDir(folderPath, folderPath);
  const files = [];

  for (const rel of relPaths) {
    const absPath = path.join(folderPath, rel);
    let content = "";
    try { content = fs.readFileSync(absPath, "utf-8"); } catch { continue; }

    const totalLines = content.split("\n").length;
    const lines = countNonCommentLines(content);
    const role = detectRole(rel, content);
    const health = getHealthStatus(lines);
    const responsibilities = extractResponsibilities(content, rel);

    files.push({ id: rel, name: path.basename(rel), path: rel, role, lines, totalLines, imports: [], responsibilities, health });
  }

  const allRels = files.map(f => f.id);
  for (const file of files) {
    const absPath = path.join(folderPath, file.path);
    let content = "";
    try { content = fs.readFileSync(absPath, "utf-8"); } catch { continue; }
    file.imports = extractImports(content, file.path, allRels);
  }

  return {
    projectName: path.basename(folderPath),
    rootPath: folderPath,
    scannedAt: new Date().toISOString(),
    files,
    totalFiles: files.length,
    totalLines: files.reduce((s, f) => s + f.lines, 0),
  };
}

module.exports = {
  countNonCommentLines,
  detectRole,
  getHealthStatus,
  extractImports,
  walkDir,
  scanProject,
  SKIP_DIRS,
  SKIP_FILE_PATTERNS,
};
