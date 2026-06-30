import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * POST /api/notifications/[id]/read
 * Mark a notification as read (verifying ownership).
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }

    const { id } = await ctx.params;
    const notif = await db.notification.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!notif) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }
    if (notif.userId !== user.id) {
      return NextResponse.json(
        { error: "You do not have access to this notification." },
        { status: 403 }
      );
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/[id]/read] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to mark notification." },
      { status: 500 }
    );
  }
}
