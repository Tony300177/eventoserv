import type { User } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { users } from "../drizzle/schema.js";
import { SESSION_COOKIE, readCookie, verifySessionToken } from "./session.js";

export type TrpcContext = {
  user: User | null;
};

export async function createContext(request: Request): Promise<TrpcContext> {
  const session = verifySessionToken(readCookie(request.headers.get("cookie"), SESSION_COOKIE));
  if (!session) return { user: null };

  const db = await getDb();
  if (!db) return { user: null };

  const rows = await db.select().from(users).where(eq(users.openId, session.email)).limit(1);
  return { user: rows[0] ?? null };
}