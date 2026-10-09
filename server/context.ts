import { auth } from "./auth.js";
import { getUserByOpenId } from "./db.js";
import type { User } from "../drizzle/schema.js";

export type TrpcContext = {
  user: User | null;
};

export async function createContext(): Promise<TrpcContext> {
  let session: Awaited<ReturnType<typeof auth>> = null;
  try {
    session = await auth();
  } catch (error) {
    console.warn("[Auth] Session unavailable:", error instanceof Error ? error.message : error);
  }

  const email = session?.user?.email;
  if (!email) return { user: null };

  const user = await getUserByOpenId(email);
  return { user: user ?? null };
}