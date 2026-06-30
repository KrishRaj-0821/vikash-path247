import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const SEVERITY_WEIGHT: Record<string, number> = {
  LOW: 3,
  MEDIUM: 8,
  HIGH: 15,
  CRITICAL: 25,
};
const BASE_PRIORITY = 10;

function computePriority(severity: string, voteCount: number): number {
  const w = SEVERITY_WEIGHT[severity] ?? SEVERITY_WEIGHT.MEDIUM;
  return BASE_PRIORITY + voteCount * 3 + w;
}

/**
 * POST /api/complaints/[id]/vote — citizens only. Toggle vote.
 * - If already voted -> remove vote.
 * - Else -> add vote, +2 Swachh Coins to voter.
 * - Recompute priorityScore = base + (votes * 3) + severityWeight.
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
    if (user.role !== "CITIZEN") {
      return NextResponse.json(
        { error: "Only citizens can vote." },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const complaint = await db.complaint.findUnique({
      where: { id },
      select: { id: true, severity: true, reporterId: true },
    });
    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }

    const existing = await db.vote.findUnique({
      where: { complaintId_userId: { complaintId: id, userId: user.id } },
    });

    let voted: boolean;
    if (existing) {
      // Toggle off
      await db.vote.delete({ where: { id: existing.id } });
      voted = false;
    } else {
      // Toggle on — award +2 Swachh Coins
      await db.$transaction([
        db.vote.create({
          data: { complaintId: id, userId: user.id },
        }),
        db.user.update({
          where: { id: user.id },
          data: { swachhCoins: { increment: 2 } },
        }),
      ]);
      voted = true;
    }

    // Recompute priority score based on updated vote count
    const voteCount = await db.vote.count({ where: { complaintId: id } });
    const newScore = computePriority(complaint.severity, voteCount);
    await db.complaint.update({
      where: { id },
      data: { priorityScore: newScore },
    });

    return NextResponse.json({ ok: true, votes: voteCount, voted });
  } catch (err) {
    console.error("[complaint/[id]/vote] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to vote." },
      { status: 500 }
    );
  }
}
