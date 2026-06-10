import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = "https://mmanwu-clean-production-6465.up.railway.app/plaza";

  const res = await fetch(backendUrl);
  const data = await res.json();

  return NextResponse.json(data);
}
