import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { appRouter } from "./routers";
import { createContext } from "./context";

export function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext,
    transformer: superjson,
  });
}
