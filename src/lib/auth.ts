import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { prisma } from "./db";

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.warn("ADMIN_JWT_SECRET is not set. Using a random secret — sessions will not survive restarts.");
  }
  return new TextEncoder().encode(secret || randomBytes(32).toString("hex"));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(hash, "hex");
  if (computed.length !== storedBuf.length) return false;
  return timingSafeEqual(computed, storedBuf);
}

export async function createSession(userId: number): Promise<string> {
  const secret = getSecret();
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret);
}

export async function verifySession(token: string): Promise<{ userId: number } | null> {
  try {
    const secret = getSecret();
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    if (typeof payload.userId !== "number") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ userId: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function getSessionFromRequest(request: Request): Promise<{ userId: number } | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) return null;
  return verifySession(decodeURIComponent(match[1]));
}

export async function getUserFromRequest(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export function sessionCookieString(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Strict${secure}`;
}

export function clearSessionCookieString(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict${secure}`;
}
