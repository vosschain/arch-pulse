import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { resolveHostPath } from "@/lib/scanner";
import type { GitDiffFile } from "@/types";

// ─── POST /api/gitdiff ────────────────────────────────────────────────────────
// Body: { projectPath: string }
// Returns: { isGitRepo: boolean, branch: string, files: GitDiffFile[] }

export async function POST(req: NextRequest) {
  let body: { projectPath?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.projectPath?.trim();
  if (!raw) return NextResponse.json({ error: "projectPath required" }, { status: 400 });

  const projectPath = resolveHostPath(raw);
  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: `Path not found: ${raw}` }, { status: 404 });
  }

  // Check if it's a git repo
  const gitDir = path.join(projectPath, ".git");
  if (!fs.existsSync(gitDir)) {
    return NextResponse.json({ isGitRepo: false, branch: "", files: [] });
  }

  // Get current branch
  const branchResult = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: projectPath, encoding: "utf-8",
  });
  const branch = branchResult.stdout?.trim() ?? "unknown";

  // Get changed files (working tree vs HEAD)
  const diffResult = spawnSync("git", ["diff", "--name-status", "HEAD"], {
    cwd: projectPath, encoding: "utf-8",
  });

  // Also get untracked/new files
  const statusResult = spawnSync("git", ["status", "--porcelain"], {
    cwd: projectPath, encoding: "utf-8",
  });

  const diffFiles: Map<string, GitDiffFile> = new Map();

  // Parse diff --name-status output: M <file>, A <file>, D <file>, R <old>\t<new>
  if (diffResult.stdout) {
    for (const line of diffResult.stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const parts = line.split("\t");
      const statusChar = parts[0].trim()[0];
      const filePath = (statusChar === "R" ? parts[2] : parts[1])?.trim();
      if (!filePath) continue;

      const id = filePath.replace(/\\/g, "/");
      const status: GitDiffFile["status"] =
        statusChar === "A" ? "added" :
        statusChar === "D" ? "deleted" :
        statusChar === "R" ? "renamed" : "modified";

      // Get line counts
      const before = statusChar !== "A" ? countLines(projectPath, id, true) : 0;
      const after  = statusChar !== "D" ? countLines(projectPath, id, false) : 0;

      diffFiles.set(id, { id, status, linesBefore: before, linesAfter: after });
    }
  }

  // Parse status --porcelain for staged new files (??  = untracked)
  if (statusResult.stdout) {
    for (const line of statusResult.stdout.trim().split("\n")) {
      if (!line.trim()) continue;
      const code = line.slice(0, 2);
      const filePath = line.slice(3).trim();
      if (!filePath) continue;
      const id = filePath.replace(/\\/g, "/");
      if (!diffFiles.has(id)) {
        if (code.includes("A") || code === "??") {
          const after = countLines(projectPath, id, false);
          diffFiles.set(id, { id, status: "added", linesBefore: 0, linesAfter: after });
        }
      }
    }
  }

  return NextResponse.json({
    isGitRepo: true,
    branch,
    files: Array.from(diffFiles.values()),
  });
}

function countLines(projectPath: string, relPath: string, useHead: boolean): number {
  try {
    if (useHead) {
      const result = spawnSync("git", ["show", `HEAD:${relPath}`], {
        cwd: projectPath, encoding: "utf-8",
      });
      return result.stdout?.split("\n").length ?? 0;
    } else {
      const absPath = path.join(projectPath, relPath);
      if (!fs.existsSync(absPath)) return 0;
      return fs.readFileSync(absPath, "utf-8").split("\n").length;
    }
  } catch {
    return 0;
  }
}
