import { type NextRequest, NextResponse } from "next/server";

export async function middleware(_request: NextRequest) {
  // TODO: Add Supabase auth session refresh when Supabase is fully integrated
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
