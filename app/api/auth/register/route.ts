import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq, or } from "drizzle-orm"
import { createToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json({ error: "Email, password and username are required" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 })
    }

    // Check for existing user
    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(or(eq(users.email, email.toLowerCase()), eq(users.username, username.toLowerCase())))
      .get()

    if (existing) {
      return NextResponse.json({ error: "Email or username already in use" }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const id = crypto.randomUUID()

    db.insert(users).values({
      id,
      email: email.toLowerCase(),
      passwordHash,
      username: username.toLowerCase(),
      displayName: username,
    }).run()

    const token = await createToken(id)

    const response = NextResponse.json({
      success: true,
      user: { id, email: email.toLowerCase(), username: username.toLowerCase() },
    })

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("[register]", error)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
