import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { scanProject } from "@/lib/scanner";

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

  try {
    const result = scanProject(folderPath);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Scan failed: ${message}` }, { status: 500 });
  }
}
