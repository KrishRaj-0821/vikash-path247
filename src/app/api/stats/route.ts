import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/stats
 * Dashboard metrics for Vikash Path.
 */
export async function GET() {
  try {
    const [
      totalComplaints,
      statusGroups,
      categoryGroups,
      wardGroups,
      resolvedResolutions,
      totalCitizens,
      totalOfficials,
      coinsAgg,
    ] = await Promise.all([
      db.complaint.count(),
      db.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
      db.complaint.groupBy({ by: ["category"], _count: { _all: true } }),
      db.complaint.groupBy({ by: ["ward"], _count: { _all: true } }),
      db.resolution.findMany({
        select: {
          resolvedAt: true,
          complaint: { select: { createdAt: true } },
        },
      }),
      db.user.count({ where: { role: "CITIZEN" } }),
      db.user.count({ where: { role: "MUNICIPAL" } }),
      db.user.aggregate({ _sum: { swachhCoins: true } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const g of statusGroups) byStatus[g.status] = g._count._all;

    const byCategory: Record<string, number> = {};
    for (const g of categoryGroups) byCategory[g.category] = g._count._all;

    const topWards = wardGroups
      .filter((g) => g.ward)
      .map((g) => ({ ward: g.ward as string, count: g._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Average resolution time in hours
    let avgResolutionHours = 0;
    if (resolvedResolutions.length > 0) {
      const totalHours = resolvedResolutions.reduce((sum, r) => {
        const ms =
          (r.resolvedAt?.getTime() ?? 0) - (r.complaint.createdAt.getTime() ?? 0);
        return sum + (ms > 0 ? ms / (1000 * 60 * 60) : 0);
      }, 0);
      avgResolutionHours = Math.round((totalHours / resolvedResolutions.length) * 10) / 10;
    }

    return NextResponse.json({
      totalComplaints,
      byStatus,
      byCategory,
      resolvedCount: resolvedResolutions.length,
      avgResolutionHours,
      totalCitizens,
      totalOfficials,
      totalSwachhCoins: coinsAgg._sum.swachhCoins ?? 0,
      topWards,
    });
  } catch (err) {
    console.error("[stats GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch stats." },
      { status: 500 }
    );
  }
}
