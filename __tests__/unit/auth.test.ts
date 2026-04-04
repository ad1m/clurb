import { describe, it, expect } from "vitest"
import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode("test-secret-key")

// Mirrors the token creation in lib/auth.ts
async function createToken(userId: string, email: string): Promise<string> {
  return new SignJWT({ userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

// Mirrors the token verification in lib/auth.ts
async function verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string; email: string }
  } catch {
    return null
  }
}

describe("Password hashing", () => {
  it("produces a hash different from the original password", async () => {
    const hash = await bcrypt.hash("mypassword", 10)
    expect(hash).not.toBe("mypassword")
  })

  it("verifies the correct password against its hash", async () => {
    const hash = await bcrypt.hash("correcthorse", 10)
    expect(await bcrypt.compare("correcthorse", hash)).toBe(true)
  })

  it("rejects a wrong password", async () => {
    const hash = await bcrypt.hash("correcthorse", 10)
    expect(await bcrypt.compare("wrongpassword", hash)).toBe(false)
  })

  it("two hashes of the same password are different (salting)", async () => {
    const a = await bcrypt.hash("password", 10)
    const b = await bcrypt.hash("password", 10)
    expect(a).not.toBe(b)
  })
})

describe("JWT tokens", () => {
  it("creates a verifiable token with userId and email", async () => {
    const token = await createToken("user-123", "test@example.com")
    const payload = await verifyToken(token)
    expect(payload?.userId).toBe("user-123")
    expect(payload?.email).toBe("test@example.com")
  })

  it("returns null for a tampered token", async () => {
    const token = await createToken("user-123", "test@example.com")
    const tampered = token.slice(0, -4) + "xxxx"
    expect(await verifyToken(tampered)).toBeNull()
  })

  it("returns null for a completely invalid string", async () => {
    expect(await verifyToken("not.a.token")).toBeNull()
  })

  it("returns null for an empty string", async () => {
    expect(await verifyToken("")).toBeNull()
  })
})
