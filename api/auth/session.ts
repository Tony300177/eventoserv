import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSession } from "../../server/auth.js";
import { toWebRequest } from "../../server/node-adapter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const session = await getSession(toWebRequest(req));
  res.setHeader("cache-control", "no-store");
  res.status(200).json(session);
}