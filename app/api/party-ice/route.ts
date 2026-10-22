import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_TTL_SECONDS = 3600;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Authentication required" }, {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const sharedSecret = process.env.TURN_SHARED_SECRET;
  const urls = (process.env.TURN_URLS ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.startsWith("turn:") || url.startsWith("turns:"));

  // Keep rooms working with their STUN fallback until a TURN provider is configured.
  if (!sharedSecret || urls.length === 0) {
    return NextResponse.json({ iceServers: [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const configuredTtl = Number.parseInt(process.env.TURN_TTL_SECONDS ?? "", 10);
  const ttl = Number.isFinite(configuredTtl)
    ? Math.min(Math.max(configuredTtl, 300), 86400)
    : DEFAULT_TTL_SECONDS;
  const username = `${Math.floor(Date.now() / 1000) + ttl}:${user.id}`;
  const credential = createHmac("sha1", sharedSecret).update(username).digest("base64");

  return NextResponse.json({
    iceServers: [{ urls, username, credential }],
    expiresAt: Math.floor(Date.now() / 1000) + ttl,
  }, {
    headers: {
      "Cache-Control": "no-store, private",
      "Vary": "Cookie",
    },
  });
}
