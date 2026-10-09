import { auth } from "./auth";
import type { User } from "../drizzle/schema";

export type TrpcContext = {
  user: User | null;
};

export async function createContext(): Promise<TrpcContext> {
  const session = await auth();
  return {
    user: session?.user?.id
      ? {
          id: session.user.id as number,
          openId: session.user.email || "",
          name: session.user.name || null,
          email: session.user.email || null,
          loginMethod: "google",
          role: (session.user.role as "user" | "admin") || "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
  };
}
