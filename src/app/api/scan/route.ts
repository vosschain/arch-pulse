import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { scanProject, resolveHostPath } from "@/lib/scanner";

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
      { error: `Folder not found: ${raw}${folderPath !== raw ? ` (resolved: ${folderPath})` : ""}` },
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
