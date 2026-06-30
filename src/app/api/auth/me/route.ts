import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

/** GET /api/auth/me — return the currently logged-in user (or null). */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
