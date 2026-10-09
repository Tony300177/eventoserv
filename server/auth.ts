import { eq } from "drizzle-orm";
import { getDb, upsertUser } from "./db.js";
import { users } from "../drizzle/schema.js";
import {
  SESSION_COOKIE,
  adminEmail,
  clearedSessionCookie,
  createSessionToken,
  isAdminPasswordValid,
  readCookie,
  sessionCookie,
  verifySessionToken,
} from "./session.js";

export type AuthSession = {
  authenticated: boolean;
  email: string | null;
  role: "user" | "admin" | null;
  name: string | null;
};

export async function getSession(request: Request): Promise<AuthSession> {
  const session = verifySessionToken(readCookie(request.headers.get("cookie"), SESSION_COOKIE));
  if (!session) return { authenticated: false, email: null, role: null, name: null };

  const db = await getDb();
  if (!db) {
    return { authenticated: true, email: session.email, role: session.role, name: null };
  }

  const rows = await db.select().from(users).where(eq(users.openId, session.email)).limit(1);
  const user = rows[0];
  if (!user) return { authenticated: false, email: null, role: null, name: null };

  return {
    authenticated: true,
    email: user.email ?? user.openId,
    role: user.role,
    name: user.name ?? "Administrador",
  };
}

/** Returns the `Set-Cookie` value for a successful login, or null when rejected. */
export async function login(password: string): Promise<string | null> {
  if (!isAdminPasswordValid(password)) return null;

  const email = adminEmail();
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(users).where(eq(users.openId, email)).limit(1);
    if (rows.length === 0) {
      await upsertUser({
        openId: email,
        name: "Administrador",
        email,
        loginMethod: "password",
        role: "admin",
      });
    } else if (rows[0].role !== "admin") {
      await db.update(users).set({ role: "admin" }).where(eq(users.openId, email));
    }
  }

  return sessionCookie(createSessionToken({ email, role: "admin" }));
}

export function logout(): string {
  return clearedSessionCookie();
}