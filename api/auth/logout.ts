import type { VercelRequest, VercelResponse } from "@vercel/node";
import { logout } from "../../server/auth.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("set-cookie", logout());
  res.status(200).json({ success: true });
}