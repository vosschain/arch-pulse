import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { resolveHostPath } from "@/lib/scanner";
import type { OverrideMap } from "@/types";

const OVERRIDE_FILE = ".archpulse.json";

function getOverridePath(projectPath: string): string {
  return path.join(projectPath, OVERRIDE_FILE);
}

function readOverrides(projectPath: string): OverrideMap {
  const filePath = getOverridePath(projectPath);
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.overrides ?? {};
  } catch {
    return {};
  }
}

// ─── GET /api/overrides?projectPath=... ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("projectPath")?.trim();
  if (!raw) return NextResponse.json({ error: "projectPath is required" }, { status: 400 });
  const projectPath = resolveHostPath(raw);
  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: `Path not found: ${raw}` }, { status: 404 });
  }
  return NextResponse.json({ overrides: readOverrides(projectPath) });
}

// ─── POST /api/overrides ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { projectPath?: string; fileId?: string; role?: string; responsibilities?: string[] };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectPath: rawPath, fileId, role, responsibilities } = body;
  if (!rawPath || !fileId) {
    return NextResponse.json({ error: "projectPath and fileId required" }, { status: 400 });
  }

  const projectPath = resolveHostPath(rawPath);
  if (!fs.existsSync(projectPath)) {
    return NextResponse.json({ error: `Path not found: ${rawPath}` }, { status: 404 });
  }

  const overrides = readOverrides(projectPath);
  if (role === null && responsibilities === undefined) {
    // Delete override for this file
    delete overrides[fileId];
  } else {
    overrides[fileId] = {};
    if (role !== undefined && role !== null) overrides[fileId].role = role as never;
    if (responsibilities !== undefined) overrides[fileId].responsibilities = responsibilities;
  }

  const writePath = getOverridePath(projectPath);
  const data = { projectPath: rawPath, updatedAt: new Date().toISOString(), overrides };
  fs.writeFileSync(writePath, JSON.stringify(data, null, 2), "utf-8");
  return NextResponse.json({ ok: true, overrides });
}

// ─── DELETE /api/overrides (reset a single file) ──────────────────────────────

export async function DELETE(req: NextRequest) {
  let body: { projectPath?: string; fileId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { projectPath: rawPath, fileId } = body;
  if (!rawPath || !fileId) {
    return NextResponse.json({ error: "projectPath and fileId required" }, { status: 400 });
  }
  const projectPath = resolveHostPath(rawPath);
  const overrides = readOverrides(projectPath);
  delete overrides[fileId];
  const writePath = getOverridePath(projectPath);
  fs.writeFileSync(writePath, JSON.stringify({ projectPath: rawPath, updatedAt: new Date().toISOString(), overrides }, null, 2));
  return NextResponse.json({ ok: true, overrides });
}
