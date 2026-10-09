import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "../drizzle/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ user, account }: { user: any; account: any }) {
      if (!user.email) return false;
      const db = await getDb();
      if (!db) return true;

      const existing = await db.select().from(users).where(eq(users.openId, user.email)).limit(1);
      if (existing.length === 0) {
        await db.insert(users).values({
          openId: user.email,
          name: user.name || null,
          email: user.email,
          loginMethod: account?.provider || "google",
          lastSignedIn: new Date(),
        });
      } else {
        await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.openId, user.email));
      }
      return true;
    },
    async session({ session }: { session: any }) {
      if (session.user?.email) {
        const db = await getDb();
        if (db) {
          const dbUser = await db.select().from(users).where(eq(users.openId, session.user.email!)).limit(1);
          if (dbUser.length > 0) {
            session.user.id = dbUser[0].id;
            session.user.role = dbUser[0].role;
          }
        }
      }
      return session;
    },
  },
});
