import type { VercelRequest } from "@vercel/node";

/**
 * The Node runtime hands functions an unparsed `IncomingMessage`, so the JSON
 * body has to be consumed from the stream. Vercel does not buffer it for us.
 */
export async function readJsonBody<T = unknown>(req: VercelRequest): Promise<T | null> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body) as T;
      } catch {
        return null;
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString("utf8")) as T;
      } catch {
        return null;
      }
    }
    return req.body as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return null;

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as T;
  } catch {
    return null;
  }
}