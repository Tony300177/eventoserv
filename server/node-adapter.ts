import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Vercel's Node runtime hands functions a Node `IncomingMessage`/`ServerResponse`
 * pair, while the tRPC fetch adapter and Auth.js both speak WHATWG
 * `Request`/`Response`. These helpers bridge the two without pulling in a
 * framework, so the Node runtime stays available for the Postgres driver.
 */
export function toWebRequest(req: VercelRequest): Request {
  const host = req.headers.host ?? "localhost";
  const protocol = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const url = new URL(req.url ?? "/", `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";

  return new Request(url, {
    method,
    headers,
    body: hasBody ? (req as unknown as BodyInit) : undefined,
    // Required by Node when streaming a Readable as the request body.
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);
}

export async function sendWebResponse(res: VercelResponse, response: Response): Promise<void> {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  // Node rejects multi-valued `set-cookie` via setHeader typing; append instead.
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    res.setHeader("set-cookie", setCookie);
  }

  if (!response.body) {
    res.end();
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}

export type WebHandler = (request: Request) => Promise<Response>;

export function nodeHandler(handle: WebHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      const response = await handle(toWebRequest(req));
      await sendWebResponse(res, response);
    } catch (error) {
      console.error("[API] Unhandled error:", error);
      if (!res.headersSent) res.status(500).json({ error: "Internal Server Error" });
      else res.end();
    }
  };
}