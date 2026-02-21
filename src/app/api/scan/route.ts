import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";
import { scanProject } from "@/lib/scanner";

// ─── Path translation ────────────────────────────────────────────────────────
// When running in Docker on Linux, Windows paths like C:\_APPS\HouseBuilder
// are served from the host volume mounted at /mnt/c.

function resolveHostPath(inputPath: string): string {
  // Already a Linux/Mac path — use as-is
  if (os.platform() !== "win32" && !inputPath.match(/^[A-Za-z]:[/\\]/)) {
    return inputPath;
  }
  // Running natively on Windows — use as-is
  if (os.platform() === "win32") {
    return inputPath;
  }
  // Running on Linux (Docker) with a Windows-style path: C:\foo or C:/foo
  const match = inputPath.match(/^([A-Za-z]):[/\\]?(.*)$/);
  if (match) {
    const drive = match[1].toLowerCase();
    const rest = match[2].replace(/\\/g, "/");
    return `/mnt/${drive}/${rest}`;
  }
  return inputPath;
}

// ─── POST /api/scan ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { folderPath?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.folderPath?.trim();
  if (!raw) {
    return NextResponse.json({ error: "folderPath is required" }, { status: 400 });
  }

  const folderPath = resolveHostPath(raw);

  if (!fs.existsSync(folderPath)) {
    return NextResponse.json(
      { error: `Folder not found: ${raw}${folderPath !== raw ? ` (resolved to: ${folderPath})` : ""}` },
      { status: 404 }
    );
  }

  try {
    const result = scanProject(folderPath);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Scan failed: ${message}` }, { status: 500 });
  }
}
