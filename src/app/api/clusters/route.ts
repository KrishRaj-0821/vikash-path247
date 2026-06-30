import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/clusters
 * List all clusters with their complaints count and total votes.
 */
export async function GET() {
  try {
    const clusters = await db.cluster.findMany({
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      include: {
        _count: { select: { complaints: true } },
      },
    });

    // Compute total votes across all complaints in each cluster
    const clusterIds = clusters.map((c) => c.id);
    const voteAggregates = await db.vote.groupBy({
      by: ["complaintId"],
      _count: { _all: true },
      where: { complaint: { clusterId: { in: clusterIds } } },
    });

    // Map complaintId -> clusterId for vote attribution
    const complaintsInClusters = await db.complaint.findMany({
      where: { clusterId: { in: clusterIds } },
      select: { id: true, clusterId: true },
    });
    const complaintToCluster = new Map<string, string>();
    for (const c of complaintsInClusters) {
      if (c.clusterId) complaintToCluster.set(c.id, c.clusterId);
    }

    const votesByCluster = new Map<string, number>();
    for (const v of voteAggregates) {
      const cid = complaintToCluster.get(v.complaintId);
      if (!cid) continue;
      votesByCluster.set(cid, (votesByCluster.get(cid) ?? 0) + v._count._all);
    }

    const result = clusters.map((c) => ({
      ...c,
      complaintCount: c._count.complaints,
      totalVotes: votesByCluster.get(c.id) ?? c.totalVotes,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[clusters GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch clusters." },
      { status: 500 }
    );
  }
}
