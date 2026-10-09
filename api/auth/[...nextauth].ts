import { handlers } from "../../server/auth.js";
import { nodeHandler } from "../../server/node-adapter.js";

const handle = nodeHandler(handlers.GET as (request: Request) => Promise<Response>);

export const GET = handle;
export const POST = handle;