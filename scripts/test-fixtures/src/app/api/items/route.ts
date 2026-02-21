// Test fixture: API route
import { NextRequest, NextResponse } from "next/server";
import { formatLabel } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "world";
  return NextResponse.json({ message: `Hello ${formatLabel(name)}` });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  return NextResponse.json({ received: body });
}
