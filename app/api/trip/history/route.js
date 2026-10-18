import { NextResponse } from "next/server";
import { redis, SNAP_PREFIX, SNAP_INDEX, parse } from "../store";

export const dynamic = "force-dynamic";

// GET /api/trip/history          → list of backups, newest first
// GET /api/trip/history?id=...   → one backup's data
export async function GET(req) {
  const id = new URL(req.url).searchParams.get("id");

  if (id) {
    if (!id.startsWith(SNAP_PREFIX)) return NextResponse.json({ error: "Unknown backup" }, { status: 400 });
    const data = parse(await redis.get(id));
    if (!data) return NextResponse.json({ error: "That backup has expired" }, { status: 404 });
    return NextResponse.json({ data });
  }

  const flat = await redis.zrange(SNAP_INDEX, 0, -1, { withScores: true });
  const snapshots = [];
  for (let i = 0; i < flat.length; i += 2) {
    const key = String(flat[i]);
    const [type, stamp] = key.slice(SNAP_PREFIX.length).split(":");
    snapshots.push({ id: key, type, day: type === "daily" ? stamp : null, at: Number(flat[i + 1]) });
  }
  snapshots.reverse();
  return NextResponse.json({ snapshots });
}
