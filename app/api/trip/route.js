import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEY = "trip:group-trip-shared-v1";
const VERSION_KEY = `${KEY}:version`;

// Runs atomically inside Redis: only write if nobody saved since baseVersion.
const SAVE_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[2]) or "0")
if current ~= tonumber(ARGV[2]) then
  return {0, current}
end
redis.call("SET", KEYS[1], ARGV[1])
return {1, redis.call("INCR", KEYS[2])}
`;

// Older saves may come back as a JSON string or an already-parsed object.
const parse = (v) => {
  if (v == null) return null;
  if (typeof v === "string") {
    try {
      return parse(JSON.parse(v));
    } catch {
      return null;
    }
  }
  return v;
};

async function readTrip() {
  const [data, version] = await redis.mget(KEY, VERSION_KEY);
  return { data: parse(data), version: Number(version ?? 0) };
}

export async function GET() {
  return NextResponse.json(await readTrip());
}

export async function PUT(req) {
  const { data, baseVersion } = await req.json();
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const [ok, version] = await redis.eval(SAVE_SCRIPT, [KEY, VERSION_KEY], [JSON.stringify(data), String(baseVersion ?? 0)]);

  if (ok === 1) return NextResponse.json({ version });

  // Someone saved first: send back the latest so the client can merge.
  return NextResponse.json(await readTrip(), { status: 409 });
}
