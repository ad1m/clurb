import { NextResponse } from "next/server"

// Replaced by /api/files/upload
export async function POST() {
  return NextResponse.json({ error: "Use /api/files/upload instead" }, { status: 410 })
}
