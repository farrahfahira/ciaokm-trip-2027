import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const KEY = "trip:group-trip-shared-v1";
export const VERSION_KEY = `${KEY}:version`;
export const SNAP_PREFIX = `${KEY}:snap:`;
export const SNAP_INDEX = `${KEY}:snaps`;
export const KEEP_DAYS = 30;

// Older saves may come back as a JSON string or an already-parsed object.
export const parse = (v) => {
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
