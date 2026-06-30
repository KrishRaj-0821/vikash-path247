import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { broadcastResolution } from "@/lib/jan-samvaad";

/**
 * POST /api/complaints/[id]/resolve — MUNICIPAL only.
 * Body: { proofImageUrl?, resolutionNote, actualCost? }
 *
 * - Create a Resolution record.
 * - Set complaint.status = "RESOLVED".
 * - Find all voters, create a RESOLUTION_ALERT Notification for each.
 * - Broadcast via Jan Samvaad WebSocket.
 * - Return { resolution, votersNotified }.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    if (user.role !== "MUNICIPAL") {
      return NextResponse.json(
        { error: "Only municipal officials can resolve complaints." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const complaint = await db.complaint.findUnique({
      where: { id },
      select: { id: true, title: true },
    });
    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { proofImageUrl, resolutionNote, actualCost } = body as {
      proofImageUrl?: string;
      resolutionNote?: string;
      actualCost?: number;
    };

    if (!resolutionNote || !String(resolutionNote).trim()) {
      return NextResponse.json(
        { error: "resolutionNote is required." },
        { status: 400 }
      );
    }

    // Create resolution + mark complaint resolved (transaction)
    const resolution = await db.$transaction(async (tx) => {
      const res = await tx.resolution.create({
        data: {
          complaintId: id,
          resolvedBy: user.id,
          proofImageUrl: proofImageUrl || null,
          resolutionNote: String(resolutionNote).trim(),
          actualCost:
            actualCost != null && !Number.isNaN(Number(actualCost))
              ? Number(actualCost)
              : null,
        },
      });
      await tx.complaint.update({
        where: { id },
        data: { status: "RESOLVED" },
      });
      return res;
    });

    // Find all voters
    const voters = await db.vote.findMany({
      where: { complaintId: id },
      select: { userId: true },
    });
    const voterIds = Array.from(new Set(voters.map((v) => v.userId)));

    // Create notifications for each voter
    const message = `Aapki complaint "${complaint.title}" resolve ho gayi! Official note: ${String(
      resolutionNote
    ).trim()}`;

    if (voterIds.length > 0) {
      await db.notification.createMany({
        data: voterIds.map((uid) => ({
          userId: uid,
          complaintId: id,
          type: "RESOLUTION_ALERT",
          title: "Aapki complaint resolve ho gayi!",
          message,
        })),
      });

      // Broadcast via Jan Samvaad WebSocket (best-effort, non-blocking)
      broadcastResolution({
        complaintId: id,
        voterIds,
        title: "Aapki complaint resolve ho gayi!",
        message,
      }).catch((e) => {
        console.error("[resolve] broadcastResolution failed:", e);
      });
    }

    return NextResponse.json({ resolution, votersNotified: voterIds.length });
  } catch (err) {
    console.error("[complaint/[id]/resolve] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve complaint." },
      { status: 500 }
    );
  }
}
