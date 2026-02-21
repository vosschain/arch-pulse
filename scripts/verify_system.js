#!/usr/bin/env node
/**
 * ArchPulse — System Verification Script
 * Run with: node scripts/verify_system.js
 */

const fs = require("fs");
const path = require("path");

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n🫀 ArchPulse — System Verification\n");

// ─── File structure checks ────────────────────────────────────────────────────
console.log("📁 File Structure");
const requiredFiles = [
  "src/app/layout.tsx",
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/app/api/scan/route.ts",
  "src/components/ArchGraph.tsx",
  "src/components/FileNode.tsx",
  "src/components/HealthTable.tsx",
  "src/components/Toolbar.tsx",
  "src/types/index.ts",
  "next.config.ts",
  "tailwind.config.ts",
  "tsconfig.json",
  "package.json",
];

const root = path.resolve(__dirname, "..");
for (const f of requiredFiles) {
  check(f, fs.existsSync(path.join(root, f)));
}

// ─── package.json checks ─────────────────────────────────────────────────────
console.log("\n📦 Package Config");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
check("name = archpulse", pkg.name === "archpulse");
check("dev script uses port 4050", pkg.scripts?.dev?.includes("4050"));
check("reactflow dependency present", "reactflow" in (pkg.dependencies ?? {}));
check("dagre dependency present", "dagre" in (pkg.dependencies ?? {}));
check("test script present", typeof pkg.scripts?.test === "string");

// ─── Type exports ─────────────────────────────────────────────────────────────
console.log("\n🔷 Type Exports");
const typesContent = fs.readFileSync(path.join(root, "src/types/index.ts"), "utf-8");
check("ScannedFile type exported", typesContent.includes("export interface ScannedFile"));
check("ScanResult type exported", typesContent.includes("export interface ScanResult"));
check("getHealthStatus exported", typesContent.includes("export function getHealthStatus"));
check("HealthStatus includes red-critical", typesContent.includes("red-critical"));

// ─── API Route ────────────────────────────────────────────────────────────────
console.log("\n🔌 API Route");
const apiContent = fs.readFileSync(path.join(root, "src/app/api/scan/route.ts"), "utf-8");
check("POST handler exported", apiContent.includes("export async function POST"));
check("walkDir implemented", apiContent.includes("function walkDir"));
check("countNonCommentLines implemented", apiContent.includes("function countNonCommentLines"));
check("SKIP_DIRS includes node_modules", apiContent.includes('"node_modules"'));

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(40)}`);
console.log(`Total: ${passed + failed}  ✅ ${passed}  ❌ ${failed}`);
if (failed > 0) {
  console.log("\n⚠️  Some checks failed. Review above.\n");
  process.exit(1);
} else {
  console.log("\n🎉 All checks passed!\n");
  process.exit(0);
}
