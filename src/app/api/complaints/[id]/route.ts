import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/complaints/[id]
 * Single complaint with reporter, votes (with voter name), cluster,
 * budgetEstimate, resolution (with resolver name).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const complaint = await db.complaint.findUnique({
      where: { id },
      include: {
        reporter: {
          select: { id: true, name: true, phone: true, verified: true },
        },
        votes: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { id: true, name: true, verified: true } },
          },
        },
        cluster: true,
        budgetEstimate: {
          include: {
            creator: { select: { id: true, name: true } },
          },
        },
        resolution: {
          include: {
            resolver: { select: { id: true, name: true, department: true } },
          },
        },
        _count: { select: { votes: true } },
      },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
    }
    return NextResponse.json(complaint);
  } catch (err) {
    console.error("[complaint/[id] GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch complaint." },
      { status: 500 }
    );
  }
}
