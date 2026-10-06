import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
});

const keyFrom = (req) => {
  const key = new URL(req.url).searchParams.get("key");
  return key && /^[\w-]{1,100}$/.test(key) ? `trip:${key}` : null;
};

export async function GET(req) {
  const key = keyFrom(req);
  if (!key) return Response.json({ error: "missing or invalid key" }, { status: 400 });
  try {
    const v = await redis.get(key);
    // Upstash may auto-parse JSON, so always hand back a string
    const value = v == null ? null : typeof v === "string" ? v : JSON.stringify(v);
    return Response.json({ value }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: "database error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const key = keyFrom(req);
  if (!key) return Response.json({ error: "missing or invalid key" }, { status: 400 });
  const value = await req.text();
  if (value.length > 1_000_000) return Response.json({ error: "too large" }, { status: 413 });
  try {
    JSON.parse(value);
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  try {
    await redis.set(key, value);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "database error" }, { status: 500 });
  }
}
