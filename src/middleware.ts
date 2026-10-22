import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Forces every authenticated app page to skip caching entirely, at the
 * browser/proxy level, not just inside Next.js.
 *
 * `export const dynamic = "force-dynamic"` on each page already makes the
 * SERVER render fresh on every request — but that alone doesn't stop a
 * client from reusing an old cached response, and this app is installed as
 * a standalone PWA (manifest.json `display: "standalone"`), where iOS/WebKit
 * in particular is known to aggressively cache pages even across a full
 * app close-and-reopen. That's the most likely explanation for live values
 * (like a student's Cogs balance right after a manual adjustment) appearing
 * "stuck" on a page that has already been visited once.
 */
export function middleware() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/student/:path*"],
};
