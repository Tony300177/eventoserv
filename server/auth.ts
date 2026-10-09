import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "./db.js";
import { users } from "../drizzle/schema.js";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false;
      const db = await getDb();
      if (!db) return true;

      const email = user.email;
      const existing = await db.select().from(users).where(eq(users.openId, email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          openId: email,
          name: user.name ?? null,
          email,
          loginMethod: account?.provider ?? "google",
          lastSignedIn: new Date(),
        });
      } else {
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, email));
      }
      return true;
    },
    async session({ session }) {
      if (session.user?.email) {
        const db = await getDb();
        if (db) {
          const dbUser = await db.select().from(users).where(eq(users.openId, session.user.email)).limit(1);
          session.user.role = dbUser[0]?.role ?? "user";
        } else {
          session.user.role = "user";
        }
      }
      return session;
    },
  },
});