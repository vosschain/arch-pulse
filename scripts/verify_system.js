#!/usr/bin/env node
/**
 * ArchPulse — System Verification Script
 * Run with: node scripts/verify_system.js
 *
 * Tests all phases:
 *   Phase 2: File Scanner (countNonCommentLines, detectRole, extractImports, walkDir, scanProject)
 *   Phase 3: Node Graph (file structure, React Flow integration)
 *   Phase 4: God Component Pulse (health thresholds, CSS keyframes, FileNode classes)
 *   Integration: Scan HouseBuilder and verify expected results
 */

"use strict";

const fs = require("fs");
const path = require("path");
const scanner = require("./scanner-core");

const {
  countNonCommentLines,
  detectRole,
  getHealthStatus,
  extractImports,
  walkDir,
  scanProject,
  SKIP_DIRS,
  SKIP_FILE_PATTERNS,
} = scanner;

// ── Test harness ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  \u2705 ${label}`);
    passed++;
  } else {
    const msg = detail ? `${label} \u2014 ${detail}` : label;
    console.log(`  \u274C ${msg}`);
    failures.push(msg);
    failed++;
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(__dirname, "test-fixtures");
const HOUSEBUILDER = "C:\\_APPS\\HouseBuilder";

// ── Section 1: File Structure ─────────────────────────────────────────────────

section("\uD83D\uDCC1 File Structure");

const requiredFiles = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/api/scan/route.ts",
  "src/lib/scanner.ts",
  "src/components/ArchGraph.tsx",
  "src/components/FileNode.tsx",
  "src/components/HealthTable.tsx",
  "src/components/Toolbar.tsx",
  "src/types/index.ts",
  "next.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "package.json",
  "scripts/scanner-core.js",
  "scripts/verify_system.js",
];

for (const f of requiredFiles) {
  check(f, fs.existsSync(path.join(ROOT, f)));
}

// ── Section 2: Package Config ─────────────────────────────────────────────────

section("\uD83D\uDCE6 Package Config");

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
check("name = archpulse", pkg.name === "archpulse");
check("dev script uses port 4050", pkg.scripts?.dev?.includes("4050"));
check("dev:lan script uses 0.0.0.0:4050", !!(pkg.scripts?.["dev:lan"]?.includes("0.0.0.0") && pkg.scripts?.["dev:lan"]?.includes("4050")));
check("reactflow dependency", "reactflow" in (pkg.dependencies ?? {}));
check("dagre dependency", "dagre" in (pkg.dependencies ?? {}));
check("test script present", typeof pkg.scripts?.test === "string");

// ── Section 3: Types ──────────────────────────────────────────────────────────

section("\uD83D\uDD37 Type Exports (src/types/index.ts)");

const typesContent = fs.readFileSync(path.join(ROOT, "src/types/index.ts"), "utf-8");
check("ScannedFile exported", typesContent.includes("export interface ScannedFile"));
check("ScanResult exported", typesContent.includes("export interface ScanResult"));
check("FileRole type exported", typesContent.includes("export type FileRole"));
check("HealthStatus type exported", typesContent.includes("export type HealthStatus"));
check("getHealthStatus exported", typesContent.includes("export function getHealthStatus"));
check('HealthStatus includes "red-critical"', typesContent.includes('"red-critical"'));
check('HealthStatus includes "yellow"', typesContent.includes('"yellow"'));

// ── Section 4: API Route ──────────────────────────────────────────────────────

section("\uD83D\uDD0C API Route (src/app/api/scan/route.ts)");

const apiContent = fs.readFileSync(path.join(ROOT, "src/app/api/scan/route.ts"), "utf-8");
check("POST handler exported", apiContent.includes("export async function POST"));
check("imports scanProject from @/lib/scanner", apiContent.includes("scanProject") && apiContent.includes("@/lib/scanner"));
const apiLines = apiContent.split("\n").length;
check("route.ts is lean (<50 lines)", apiLines < 50, `actual: ${apiLines} lines`);
check("no inline detectRole in route", !apiContent.includes("function detectRole"));
check("no inline walkDir in route", !apiContent.includes("function walkDir"));

// ── Section 5: Scanner Library ────────────────────────────────────────────────

section("\uD83D\uDD2C Scanner Library (src/lib/scanner.ts)");

const scannerTs = fs.readFileSync(path.join(ROOT, "src/lib/scanner.ts"), "utf-8");
check("countNonCommentLines exported", scannerTs.includes("export function countNonCommentLines"));
check("detectRole exported", scannerTs.includes("export function detectRole"));
check("extractImports exported", scannerTs.includes("export function extractImports"));
check("walkDir exported", scannerTs.includes("export function walkDir"));
check("scanProject exported", scannerTs.includes("export function scanProject"));
check("SKIP_DIRS exported", scannerTs.includes("export const SKIP_DIRS"));
check("SKIP_FILE_PATTERNS declared in scanner.ts", scannerTs.includes("SKIP_FILE_PATTERNS"));
check("__tests__ in SKIP_DIRS", scannerTs.includes('"__tests__"'));

// ── Section 6: CSS Animations ─────────────────────────────────────────────────

section("\uD83C\uDFA8 CSS Animations & Tailwind v4 (src/app/globals.css)");

const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf-8");
check('@import "tailwindcss" present', css.includes('@import "tailwindcss"'));
check("@source directive present", css.includes("@source"));
check("@theme inline present", css.includes("@theme inline"));
check("@keyframes archpulse-glow defined", css.includes("@keyframes archpulse-glow"));
check("@keyframes archpulse-critical defined", css.includes("@keyframes archpulse-critical"));
check(".node-pulse-slow class defined", css.includes(".node-pulse-slow"));
check(".node-pulse-fast class defined", css.includes(".node-pulse-fast"));
check(".node-pulse-critical class defined", css.includes(".node-pulse-critical"));
check("slow pulse = 3s", css.includes("3s ease-in-out infinite"));
check("fast pulse = 1s", css.includes("1s ease-in-out infinite"));
check("critical pulse = 0.4s", css.includes("0.4s ease-in-out infinite"));

// ── Section 7: FileNode Component ────────────────────────────────────────────

section("\uD83D\uDFE6 FileNode Component (src/components/FileNode.tsx)");

const fileNodeContent = fs.readFileSync(path.join(ROOT, "src/components/FileNode.tsx"), "utf-8");
check('uses "use client"', fileNodeContent.includes('"use client"'));
check("imports from reactflow", fileNodeContent.includes("reactflow"));
check("uses Handle from reactflow", fileNodeContent.includes("Handle"));
check("uses node-pulse-slow class (not Tailwind animate-)", fileNodeContent.includes("node-pulse-slow"));
check("uses node-pulse-fast class", fileNodeContent.includes("node-pulse-fast"));
check("uses node-pulse-critical class", fileNodeContent.includes("node-pulse-critical"));
check("no old animate-pulse-slow (Tailwind v3 utility removed)", !fileNodeContent.includes("animate-pulse-slow"));
check("no old animate-pulse-fast removed", !fileNodeContent.includes("animate-pulse-fast"));
check("exports FileNode", fileNodeContent.includes("FileNode"));
check("renders file.name", fileNodeContent.includes("file.name"));

// ── Section 8: ArchGraph Component ───────────────────────────────────────────

section("\uD83D\uDCCA ArchGraph Component (src/components/ArchGraph.tsx)");

const archGraphContent = fs.readFileSync(path.join(ROOT, "src/components/ArchGraph.tsx"), "utf-8");
check('uses "use client"', archGraphContent.includes('"use client"'));
check("imports dagre", archGraphContent.includes("dagre"));
check("imports ReactFlow", archGraphContent.includes("ReactFlow"));
check("imports MiniMap", archGraphContent.includes("MiniMap"));
check("imports Controls", archGraphContent.includes("Controls"));
check("defines layoutNodes or layouted", archGraphContent.includes("layoutNode") || archGraphContent.includes("dagre.graphlib"));
check("registers fileNode custom node type", archGraphContent.includes("fileNode"));
check("uses fitView", archGraphContent.includes("fitView"));

// ── Section 9: HealthTable ─────────────────────────────────────────────────

section("\uD83D\uDCCB HealthTable Component (src/components/HealthTable.tsx)");

const healthTableContent = fs.readFileSync(path.join(ROOT, "src/components/HealthTable.tsx"), "utf-8");
check('uses "use client"', healthTableContent.includes('"use client"'));
check("renders health badge or emoji", healthTableContent.includes("getHealthEmoji") || healthTableContent.includes("health"));
check("sorted by severity or line count", healthTableContent.includes("sort") || healthTableContent.includes("STATUS_ORDER"));

// ── UNIT TESTS Section 10: countNonCommentLines ───────────────────────────────

section("\uD83E\uDDEA Unit: countNonCommentLines");

check("empty file \u2192 0", countNonCommentLines("") === 0);
check("5 blank lines \u2192 0", countNonCommentLines("\n\n\n\n\n") === 0);
check("5 single-line comments \u2192 0", countNonCommentLines("// a\n// b\n// c\n// d\n// e") === 0);
check(
  "3 code + 2 comment lines \u2192 3",
  countNonCommentLines("const a = 1;\n// comment\nconst b = 2;\n// another\nconst c = 3;") === 3
);
check(
  "block comment only \u2192 0",
  countNonCommentLines("/*\n * block comment\n * more\n */") === 0
);

// Mixed: block + single-line comments + code
const mixedSrc = [
  "// header",
  "/*",
  " * doc",
  " */",
  "export const A = 1;",
  "// note",
  "export const B = 2;",
  "",
  "export function fn() {",
  "  return 42;",
  "}",
].join("\n");
const mixedResult = countNonCommentLines(mixedSrc);
check("mixed block+single-line+code \u2192 5 code lines", mixedResult === 5, `got ${mixedResult}`);

// JSX comments
const jsxSrc = "const x = 1;\n{/* JSX comment */}\nconst y = 2;";
const jsxResult = countNonCommentLines(jsxSrc);
check("JSX {/* */} lines not counted as code", jsxResult === 2, `got ${jsxResult}`);

// ── UNIT TESTS Section 11: getHealthStatus ────────────────────────────────────

section("\uD83E\uDDEA Unit: getHealthStatus");

check("0 lines \u2192 green",           getHealthStatus(0) === "green");
check("499 lines \u2192 green",         getHealthStatus(499) === "green");
check("500 lines \u2192 yellow",        getHealthStatus(500) === "yellow");
check("999 lines \u2192 yellow",        getHealthStatus(999) === "yellow");
check("1000 lines \u2192 red-slow",     getHealthStatus(1000) === "red-slow");
check("2999 lines \u2192 red-slow",     getHealthStatus(2999) === "red-slow");
check("3000 lines \u2192 red-fast",     getHealthStatus(3000) === "red-fast");
check("4999 lines \u2192 red-fast",     getHealthStatus(4999) === "red-fast");
check("5000 lines \u2192 red-critical", getHealthStatus(5000) === "red-critical");
check("9999 lines \u2192 red-critical", getHealthStatus(9999) === "red-critical");

// ── UNIT TESTS Section 12: detectRole ─────────────────────────────────────────

section("\uD83E\uDDEA Unit: detectRole");

check("src/components/MyButton.tsx \u2192 component",
  detectRole("src/components/MyButton.tsx", "export default function MyButton() {}") === "component"
);
check("src/hooks/useCounter.ts \u2192 hook",
  detectRole("src/hooks/useCounter.ts", "export function useCounter() {}") === "hook"
);
check("use* prefix .ts file \u2192 hook",
  detectRole("src/lib/useTheme.ts", "export const useTheme = () => {}") === "hook"
);
check("route.ts (api/) \u2192 api",
  detectRole("src/app/api/items/route.ts", "") === "api"
);
check("page.tsx \u2192 page",
  detectRole("src/app/dashboard/page.tsx", "") === "page"
);
check("layout.tsx \u2192 page",
  detectRole("src/app/layout.tsx", "") === "page"
);
check("src/types/index.ts \u2192 type",
  detectRole("src/types/index.ts", "export interface Foo {}\nexport type Bar = string;") === "type"
);
check("src/lib/formatter.ts \u2192 lib",
  detectRole("src/lib/formatter.ts", "export function format() {}") === "lib"
);
check("src/lib/store/actions.ts \u2192 store",
  detectRole("src/lib/store/actions.ts", "") === "store"
);
check("interaction/hooks/useWallActions.ts \u2192 hook",
  detectRole("src/components/interaction/hooks/useWallActions.ts", "export function useWallActions() {}") === "hook"
);

// ── UNIT TESTS Section 13: extractImports ─────────────────────────────────────

section("\uD83E\uDDEA Unit: extractImports");

const knownFiles = [
  "src/components/MyButton.tsx",
  "src/hooks/useCounter.ts",
  "src/lib/utils.ts",
  "src/types/index.ts",
  "src/app/api/items/route.ts",
  "src/lib/heavyComments.ts",
  "src/lib/api.ts",
];

const imp1 = `import { useState } from "react";\nimport { formatLabel } from "@/lib/utils";\nimport type { ButtonProps } from "@/types/index";`;
const resolved1 = extractImports(imp1, "src/components/MyButton.tsx", knownFiles);
check("@/lib/utils resolves to src/lib/utils.ts", resolved1.includes("src/lib/utils.ts"), `got: ${JSON.stringify(resolved1)}`);
check("@/types/index resolves to src/types/index.ts", resolved1.includes("src/types/index.ts"), `got: ${JSON.stringify(resolved1)}`);
check("external 'react' not included in imports", !resolved1.some(i => i === "react"));

const imp2 = `import { fetchData } from "@/lib/api";\nimport type { DataItem } from "@/types/data";`;
const resolved2 = extractImports(imp2, "src/hooks/useCounter.ts", knownFiles);
check("@/lib/api resolves (in allFiles)", resolved2.includes("src/lib/api.ts"), `got: ${JSON.stringify(resolved2)}`);
check("@/types/data not resolved (not in allFiles)", !resolved2.includes("src/types/data.ts"));

const imp3 = 'import { something } from "../lib/utils";';
const resolved3 = extractImports(imp3, "src/components/MyButton.tsx", knownFiles);
check("relative ../lib/utils resolves to src/lib/utils.ts", resolved3.includes("src/lib/utils.ts"), `got: ${JSON.stringify(resolved3)}`);

// ── UNIT TESTS Section 14: walkDir & SKIP patterns ────────────────────────────

section("\uD83E\uDDEA Unit: walkDir & SKIP patterns");

check("SKIP_DIRS includes node_modules", SKIP_DIRS.has("node_modules"));
check("SKIP_DIRS includes __tests__",   SKIP_DIRS.has("__tests__"));
check("SKIP_DIRS includes .next",       SKIP_DIRS.has(".next"));
check("SKIP_FILE_PATTERNS skips .test.ts",  SKIP_FILE_PATTERNS.some(p => p.test("MyButton.test.ts")));
check("SKIP_FILE_PATTERNS skips .spec.tsx", SKIP_FILE_PATTERNS.some(p => p.test("scene.spec.tsx")));
check("SKIP_FILE_PATTERNS skips .d.ts",     SKIP_FILE_PATTERNS.some(p => p.test("types.d.ts")));
check("SKIP_FILE_PATTERNS does NOT skip .tsx", !SKIP_FILE_PATTERNS.some(p => p.test("MyButton.tsx")));

// ── INTEGRATION Section 15: Fixture project scan ──────────────────────────────

section("\uD83D\uDD2D Integration: Fixture Project Scan");

if (fs.existsSync(FIXTURES)) {
  const fix = scanProject(FIXTURES);
  check("returns ScanResult with files array", !!fix && Array.isArray(fix.files));
  check("finds >0 files", fix.totalFiles > 0);
  check("finds MyButton.tsx", fix.files.some(f => f.name === "MyButton.tsx"));
  check("finds useCounter.ts", fix.files.some(f => f.name === "useCounter.ts"));
  check("finds utils.ts", fix.files.some(f => f.name === "utils.ts"));
  check("finds route.ts", fix.files.some(f => f.name === "route.ts"));
  check("skips .test.ts files", !fix.files.some(f => f.name.includes(".test.")));
  check("skips __tests__ dirs", !fix.files.some(f => f.path.includes("__tests__")));

  const btn = fix.files.find(f => f.name === "MyButton.tsx");
  if (btn) {
    check("MyButton.tsx \u2192 role=component", btn.role === "component", `got: ${btn.role}`);
    check("MyButton.tsx \u2192 health=green", btn.health === "green", `got: ${btn.health}`);
    check("MyButton.tsx lines > 0", btn.lines > 0);
    check("MyButton.tsx imports utils resolved", btn.imports.some(i => i.includes("utils")));
  } else {
    check("MyButton.tsx present in scan", false);
  }

  const hook = fix.files.find(f => f.name === "useCounter.ts");
  if (hook) {
    check("useCounter.ts \u2192 role=hook", hook.role === "hook", `got: ${hook.role}`);
  }

  const api = fix.files.find(f => f.name === "route.ts");
  if (api) {
    check("route.ts \u2192 role=api", api.role === "api", `got: ${api.role}`);
  }

  const heavyCom = fix.files.find(f => f.name === "heavyComments.ts");
  if (heavyCom) {
    check("heavyComments: lines (code) < totalLines", heavyCom.lines < heavyCom.totalLines, `lines=${heavyCom.lines}, total=${heavyCom.totalLines}`);
    check("heavyComments: code lines <= 8", heavyCom.lines <= 8, `got ${heavyCom.lines}`);
  }
} else {
  check("test-fixtures directory exists", false, `Expected: ${FIXTURES}`);
}

// ── INTEGRATION Section 16: HouseBuilder scan ─────────────────────────────────

section("\uD83C\uDFE0 Integration: HouseBuilder Scan");

if (fs.existsSync(HOUSEBUILDER)) {
  console.log("  \u23F3 Scanning HouseBuilder...");
  const hb = scanProject(HOUSEBUILDER);

  check("scan returns >50 files", hb.totalFiles >= 50, `got ${hb.totalFiles}`);
  check("no .test. files in results", !hb.files.some(f => f.name.includes(".test.")));
  check("no .spec. files in results", !hb.files.some(f => f.name.includes(".spec.")));
  check("totalLines > 10,000", hb.totalLines > 10000, `got ${hb.totalLines}`);

  const editorPage = hb.files.find(f => f.name === "EditorPage.tsx");
  if (editorPage) {
    check("EditorPage.tsx found", true);
    check("EditorPage.tsx \u2192 red-critical (>5000 lines)", editorPage.health === "red-critical", `health=${editorPage.health}, lines=${editorPage.lines}`);
    check("EditorPage.tsx \u2192 role=component", editorPage.role === "component", `got: ${editorPage.role}`);
  } else {
    check("EditorPage.tsx found", false, "not in scan results");
  }

  const objExport = hb.files.find(f => f.name === "objExport.ts");
  if (objExport) {
    check("objExport.ts found", true);
    check("objExport.ts \u2192 red-fast or red-critical (>3k)", ["red-fast","red-critical"].includes(objExport.health), `health=${objExport.health}, lines=${objExport.lines}`);
  } else {
    check("objExport.ts found", false);
  }

  const useInput = hb.files.find(f => f.name === "useInputLogic.ts");
  if (useInput) {
    check("useInputLogic.ts found", true);
    check("useInputLogic.ts \u2192 hook", useInput.role === "hook", `got: ${useInput.role}`);
    check("useInputLogic.ts health >= red-slow", ["red-slow","red-fast","red-critical"].includes(useInput.health), `health=${useInput.health}`);
  } else {
    check("useInputLogic.ts found", false);
  }

  const filesWithImports = hb.files.filter(f => f.imports.length > 0);
  check(">=20 files have resolved imports", filesWithImports.length >= 20, `got ${filesWithImports.length}`);

  const roles = hb.files.map(f => f.role);
  check("has component role", roles.includes("component"));
  check("has hook role", roles.includes("hook"));
  check("has lib role", roles.includes("lib"));

  const unknownCount = hb.files.filter(f => f.role === "unknown").length;
  check("unknown role files < 15", unknownCount < 15, `got ${unknownCount} unknown files`);

  check("at least 1 green file", hb.files.some(f => f.health === "green"));
  check("at least 1 critical file", hb.files.some(f => f.health === "red-critical"));

  // Summary table
  const critical = hb.files.filter(f => f.health === "red-critical").length;
  const danger   = hb.files.filter(f => f.health === "red-fast").length;
  const warning  = hb.files.filter(f => f.health === "red-slow").length;
  const caution  = hb.files.filter(f => f.health === "yellow").length;
  const healthy  = hb.files.filter(f => f.health === "green").length;

  console.log(`\n  \uD83D\uDCCA Health Summary:`);
  console.log(`     \uD83D\uDEA8 Critical (5k+): ${critical}`);
  console.log(`     \uD83D\uDD34 Danger  (3k-5k): ${danger}`);
  console.log(`     \uD83D\uDD34 Warning (1k-3k): ${warning}`);
  console.log(`     \uD83D\uDFE1 Caution (500-1k): ${caution}`);
  console.log(`     \uD83D\uDFE2 Healthy (<500):   ${healthy}`);
  console.log(`     \uD83D\uDCC1 Total: ${hb.totalFiles} files | ${hb.totalLines.toLocaleString()} non-comment lines`);

  const top5 = [...hb.files].sort((a, b) => b.lines - a.lines).slice(0, 5);
  console.log(`\n  \uD83C\uDFC6 Top 5 Largest Files:`);
  for (const f of top5) {
    const icon = { "red-critical":"\uD83D\uDEA8","red-fast":"\uD83D\uDD34","red-slow":"\uD83D\uDD34","yellow":"\uD83D\uDFE1","green":"\uD83D\uDFE2" }[f.health] ?? "\u2753";
    console.log(`     ${icon} ${f.name.padEnd(46)} ${f.lines.toLocaleString().padStart(6)} lines  (${f.role})`);
  }
} else {
  console.log(`  \u26A0\uFE0F  HouseBuilder not found at ${HOUSEBUILDER} \u2014 skipping`);
  check("HouseBuilder path exists", false, `Not found: ${HOUSEBUILDER}`);
}

// ── Summary ───────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\n${"─".repeat(52)}`);
console.log(`Total: ${total}  \u2705 ${passed} passed  \u274C ${failed} failed`);

if (failed > 0) {
  console.log("\n\u274C Failed checks:");
  for (const f of failures) console.log(`   \u2022 ${f}`);
  console.log("\n\u26A0\uFE0F  Fix the failures above before merging.\n");
  process.exit(1);
} else {
  console.log("\n\uD83C\uDF89 All checks passed! Phases 2\u20134 verified.\n");
  process.exit(0);
}
