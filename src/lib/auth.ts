import { cookies } from "next/headers";
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE = "sai_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Mode = "admin" | "coo";

export type Session = {
  userId: string;
  username: string;
  name: string;
  role: string;
  permission: "editor" | "viewer";
  isAdmin: boolean;
  /** Active mode — only meaningful for admin-capable users. */
  mode: Mode;
  /** True when the user is allowed to mutate data. */
  canEdit: boolean;
  /** True when the admin is currently viewing in admin mode. */
  adminView: boolean;
};

// ---- Password hashing (scrypt, no external deps) ----

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const test = scryptSync(password, salt, 64);
  return expected.length === test.length && timingSafeEqual(expected, test);
}

// ---- Signed session cookie ----

type Payload = { uid: string; mode: Mode };

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): Payload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  if (sig.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString());
    if (parsed && typeof parsed.uid === "string") {
      return { uid: parsed.uid, mode: parsed.mode === "admin" ? "admin" : "coo" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const payload = decode(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.uid } });
  if (!user) return null;

  const permission = user.permission === "viewer" ? "viewer" : "editor";
  const mode: Mode = payload.mode === "admin" && user.isAdmin ? "admin" : "coo";

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permission,
    isAdmin: user.isAdmin,
    mode,
    canEdit: permission === "editor",
    adminView: user.isAdmin && mode === "admin",
  };
}

export async function setSessionCookie(uid: string, mode: Mode): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode({ uid, mode }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Throws if not authenticated or the role is read-only. Returns the session. */
export async function requireEditor(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");
  if (!session.canEdit) {
    throw new Error("Your role has read-only access and cannot make changes.");
  }
  return session;
}

/** Throws unless the user is an admin acting in admin mode. Returns the session. */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");
  if (!session.adminView) {
    throw new Error("Admin tools are required for this action.");
  }
  return session;
}
