import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { createToken, COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get()

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = await createToken(user.id)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username, displayName: user.displayName },
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
    console.error("[login]", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
