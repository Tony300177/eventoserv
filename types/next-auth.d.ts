export {};

declare module "next-auth" {
  interface Session {
    user: {
      role?: "user" | "admin";
    } & {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}