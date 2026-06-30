import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/rewards
 * Returns { swachhCoins, badges } for the current user.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const fresh = await db.user.findUnique({
      where: { id: user.id },
      select: { swachhCoins: true },
    });

    const badges = await db.badge.findMany({
      where: { userId: user.id },
      orderBy: { earnedAt: "desc" },
    });

    return NextResponse.json({
      swachhCoins: fresh?.swachhCoins ?? user.swachhCoins,
      badges,
    });
  } catch (err) {
    console.error("[rewards GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch rewards." },
      { status: 500 }
    );
  }
}
