import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      role: "user" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    id: number;
    role: "user" | "admin";
  }
}
