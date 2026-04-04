import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET() {
  const auth = await getAuthUser()
  if (!auth) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = db
    .select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName })
    .from(users)
    .where(eq(users.id, auth.id))
    .get()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}
