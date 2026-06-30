import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/notifications
 * Returns notifications for the current user (newest first), with complaint title.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const notifications = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        complaint: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(notifications);
  } catch (err) {
    console.error("[notifications GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}
