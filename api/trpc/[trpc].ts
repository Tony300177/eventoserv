import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handler } from "../../server/trpc.js";
import { nodeHandler } from "../../server/node-adapter.js";

// Vercel classifies exported handlers statically, so these must be declared as
// plain functions taking (req, res) — not as a variable holding a factory result.
const run = nodeHandler(handler);

export default async function GET(req: VercelRequest, res: VercelResponse) {
  return run(req, res);
}

export async function POST(req: VercelRequest, res: VercelResponse) {
  return run(req, res);
}