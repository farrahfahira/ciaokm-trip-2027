import { NextResponse } from "next/server";
import { redis, KEY, VERSION_KEY, SNAP_PREFIX, SNAP_INDEX, KEEP_DAYS, parse } from "./store";

export const dynamic = "force-dynamic";

const REASONS = new Set(["reset", "restore"]);
const TIME_ZONE = "Asia/Jakarta"; // decides when a "day" starts for daily backups

// Atomically: check version → back up the old data → save the new data.
// The backup uses NX, so a daily key is only written by the first save of that day.
const SAVE_SCRIPT = `
local current = tonumber(redis.call("GET", KEYS[2]) or "0")
if current ~= tonumber(ARGV[2]) then
  return {0, current}
end
local old = redis.call("GET", KEYS[1])
if old then
  if redis.call("SET", KEYS[3], old, "EX", ARGV[4], "NX") then
    redis.call("ZADD", KEYS[4], ARGV[3], KEYS[3])
  end
end
redis.call("ZREMRANGEBYSCORE", KEYS[4], "-inf", ARGV[5])
redis.call("SET", KEYS[1], ARGV[1])
return {1, redis.call("INCR", KEYS[2])}
`;

async function readTrip() {
  const [data, version] = await redis.mget(KEY, VERSION_KEY);
  return { data: parse(data), version: Number(version ?? 0) };
}

export async function GET() {
  return NextResponse.json(await readTrip());
}

export async function PUT(req) {
  const { data, baseVersion, reason } = await req.json();
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const now = Date.now();
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD
  const snapKey = REASONS.has(reason) ? `${SNAP_PREFIX}${reason}:${now}` : `${SNAP_PREFIX}daily:${today}`;
  const keepSeconds = KEEP_DAYS * 86400;

  const [ok, version] = await redis.eval(SAVE_SCRIPT, [KEY, VERSION_KEY, snapKey, SNAP_INDEX], [JSON.stringify(data), String(baseVersion ?? 0), String(now), String(keepSeconds), String(now - keepSeconds * 1000)]);

  if (ok === 1) return NextResponse.json({ version });

  // Someone saved first: send back the latest so the client can merge.
  return NextResponse.json(await readTrip(), { status: 409 });
}
