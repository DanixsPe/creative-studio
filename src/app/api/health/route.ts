import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, service: "creative-studio", timestamp: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" }
  });
}
