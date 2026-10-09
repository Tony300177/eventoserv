import type { VercelRequest, VercelResponse } from "@vercel/node";
import { login } from "../../server/auth.js";
import { readJsonBody } from "../../server/read-body.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const body = await readJsonBody<{ password?: unknown }>(req);
  const password = typeof body?.password === "string" ? body.password : "";

  const cookie = await login(password);
  if (!cookie) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  res.setHeader("set-cookie", cookie);
  res.status(200).json({ success: true });
}