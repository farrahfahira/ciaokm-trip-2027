import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024; // photos are shrunk on the phone first, so they're far below this

export async function POST(req) {
  const type = req.headers.get("content-type") || "";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images can be uploaded." }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return NextResponse.json({ error: "That photo was empty." }, { status: 400 });
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: "That photo is too big." }, { status: 413 });

  try {
    const blob = await put("trip-photos/photo.jpg", buf, {
      access: "public",
      contentType: type,
      addRandomSuffix: true, // gives every photo a long, unguessable link
    });
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "Couldn't store the photo. Check that Vercel Blob is connected to the project." }, { status: 500 });
  }
}
