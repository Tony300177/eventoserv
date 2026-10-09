import { handler } from "../../server/trpc.js";
import { nodeHandler } from "../../server/node-adapter.js";

const handle = nodeHandler(handler);

export const GET = handle;
export const POST = handle;