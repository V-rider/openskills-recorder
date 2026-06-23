import { NextResponse } from "next/server";
import { getAppSettings, saveAppSettings } from "@/lib/server/db-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getAppSettings());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const settings = await saveAppSettings(body);
  return NextResponse.json(settings);
}
