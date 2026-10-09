import type { VercelRequest, VercelResponse } from "@vercel/node";
import { login } from "../../server/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const password = typeof req.body === "object" && req.body !== null
    ? String((req.body as { password?: unknown }).password ?? "")
    : "";

  const cookie = await login(password);
  if (!cookie) {
    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  res.setHeader("set-cookie", cookie);
  res.status(200).json({ success: true });
}