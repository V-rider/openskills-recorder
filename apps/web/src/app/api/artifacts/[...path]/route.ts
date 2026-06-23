import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import { getArtifactBaseDir } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;
  const baseDir = resolve(await getArtifactBaseDir());
  const requested = resolve(baseDir, ...segments);

  if (!requested.startsWith(baseDir + "/") && requested !== baseDir) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  if (!requested.endsWith(".png")) {
    return NextResponse.json({ error: "Only PNG artifacts allowed" }, { status: 403 });
  }

  try {
    const data = await readFile(requested);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
