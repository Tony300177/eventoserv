import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers.js";
import { createContext } from "./context.js";

export function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createContext(request),
  });
}