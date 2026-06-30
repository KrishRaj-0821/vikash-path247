import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getZai, haversine, parseJsonFromLLM } from "@/lib/ai";

export const runtime = "nodejs";

const NEIGHBOR_RADIUS_METERS = 50;

interface ClusterPayload {
  name: string;
  complaintIds: string[];
  summary: string;
  priorityScore: number;
}

interface ClusterResult {
  clustersCreated: number;
  complaintsClustered: number;
  clusters: Array<{
    id: string;
    name: string;
    category: string;
    complaintCount: number;
    priorityScore: number;
    summary: string | null;
  }>;
}

const SYSTEM_PROMPT = `You are a semantic clustering engine for civic complaints. Group complaints that are within 50 meters of each other (use haversine distance) AND share the same category. Return JSON: { clusters: [ { name, complaintIds: [], summary, priorityScore (0-100) } ] }. Only group complaints that are genuinely close (within 50m). Single complaints that have no neighbors should NOT be clustered.`;

/**
 * Deterministic fallback: group complaints by exact category, then greedily
 * merge any pair within NEIGHBOR_RADIUS_METERS of each other. Used when the
 * LLM returns malformed JSON.
 */
function geographicFallback(
  complaints: Array<{
    id: string;
    lat: number;
    lng: number;
    category: string;
    description: string;
    title: string;
  }>,
): ClusterPayload[] {
  // Index by category for the same-category constraint.
  const byCategory = new Map<string, typeof complaints>();
  for (const c of complaints) {
    const arr = byCategory.get(c.category) ?? [];
    arr.push(c);
    byCategory.set(c.category, arr);
  }

  const clusters: ClusterPayload[] = [];
  for (const [, list] of byCategory) {
    const visited = new Set<string>();
    for (const seed of list) {
      if (visited.has(seed.id)) continue;
      const group = [seed];
      visited.add(seed.id);
      // Greedy BFS expansion from the seed.
      const queue = [seed];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const other of list) {
          if (visited.has(other.id)) continue;
          const d = haversine(cur.lat, cur.lng, other.lat, other.lng);
          if (d <= NEIGHBOR_RADIUS_METERS) {
            visited.add(other.id);
            group.push(other);
            queue.push(other);
          }
        }
      }
      if (group.length > 1) {
        const titles = group.map((g) => g.title).join("; ");
        clusters.push({
          name: `${seed.category} cluster (${group.length} reports)`,
          complaintIds: group.map((g) => g.id),
          summary: `Auto-grouped nearby ${seed.category.toLowerCase()} reports: ${titles}`,
          priorityScore: Math.min(100, 40 + group.length * 10),
        });
      }
    }
  }
  return clusters;
}

function categoryLabel(cat: string): string {
  return cat
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export async function POST() {
  try {
    // Auth: any logged-in user (citizen or municipal) can trigger clustering
    // for demo purposes.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Fetch pending / voting complaints that are not already clustered.
    const complaints = await db.complaint.findMany({
      where: {
        status: { in: ["PENDING", "VOTING"] },
        clusterId: null,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        severity: true,
        lat: true,
        lng: true,
        ward: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (complaints.length === 0) {
      const empty: ClusterResult = {
        clustersCreated: 0,
        complaintsClustered: 0,
        clusters: [],
      };
      return NextResponse.json(empty, { status: 200 });
    }

    // Build a compact payload for the LLM.
    const llmInput = complaints.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      severity: c.severity,
      description: c.description,
      lat: c.lat,
      lng: c.lng,
      ward: c.ward,
    }));

    let llmClusters: ClusterPayload[] | null = null;

    try {
      const zai = await getZai();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Complaints to cluster (JSON array):\n${JSON.stringify(
              llmInput,
            )}\n\nReturn only the JSON object described in the instructions.`,
          },
        ],
        thinking: { type: "disabled" },
      });
      const raw =
        (completion?.choices?.[0]?.message?.content as string | undefined) ??
        "";
      const parsed = parseJsonFromLLM<{ clusters?: ClusterPayload[] }>(raw);
      if (parsed && Array.isArray(parsed.clusters)) {
        llmClusters = parsed.clusters.filter(
          (cl) => cl && Array.isArray(cl.complaintIds) && cl.complaintIds.length > 1,
        );
      }
    } catch (err) {
      console.error("[ai/cluster] LLM error:", err);
    }

    // Fall back to deterministic geographic clustering if LLM fails validation.
    if (!llmClusters || llmClusters.length === 0) {
      llmClusters = geographicFallback(complaints);
    }

    // Validate every LLM-claimed cluster against the 50m + same-category rule
    // to defend against model hallucinations.
    const complaintMap = new Map(complaints.map((c) => [c.id, c]));
    const validated: ClusterPayload[] = [];
    const assignedComplaintIds = new Set<string>();

    for (const cluster of llmClusters) {
      const members = cluster.complaintIds
        .map((id) => complaintMap.get(id))
        .filter((c): c is NonNullable<typeof c> => Boolean(c))
        .filter((c) => !assignedComplaintIds.has(c.id));

      if (members.length <= 1) continue;

      // Same-category gate.
      const firstCat = members[0].category;
      const sameCat = members.every((m) => m.category === firstCat);
      if (!sameCat) {
        // Split: re-cluster members of each category separately so we don't
        // wrongly bucket mixed categories together.
        const perCat = new Map<string, typeof members>();
        for (const m of members) {
          const arr = perCat.get(m.category) ?? [];
          arr.push(m);
          perCat.set(m.category, arr);
        }
        for (const [, list] of perCat) {
          if (list.length <= 1) continue;
          if (!allWithinRadius(list)) continue;
          for (const m of list) assignedComplaintIds.add(m.id);
          validated.push({
            name: cluster.name || `${categoryLabel(firstCat)} cluster`,
            complaintIds: list.map((m) => m.id),
            summary: cluster.summary || `Grouped ${list.length} nearby ${firstCat} reports.`,
            priorityScore: clampPriority(cluster.priorityScore),
          });
        }
        continue;
      }

      // Distance gate.
      if (!allWithinRadius(members)) continue;

      for (const m of members) assignedComplaintIds.add(m.id);
      validated.push({
        name: cluster.name || `${categoryLabel(firstCat)} cluster (${members.length} reports)`,
        complaintIds: members.map((m) => m.id),
        summary: cluster.summary || `Grouped ${members.length} nearby ${firstCat} reports.`,
        priorityScore: clampPriority(cluster.priorityScore),
      });
    }

    // Persist clusters in a single transaction.
    const created = await db.$transaction(async (tx) => {
      const out: ClusterResult["clusters"] = [];
      for (const cluster of validated) {
        const members = cluster.complaintIds
          .map((id) => complaintMap.get(id)!)
          .filter(Boolean);
        if (members.length === 0) continue;

        const centerLat =
          members.reduce((s, m) => s + m.lat, 0) / members.length;
        const centerLng =
          members.reduce((s, m) => s + m.lng, 0) / members.length;
        const category = members[0].category;

        const createdCluster = await tx.cluster.create({
          data: {
            name: cluster.name,
            centerLat,
            centerLng,
            radius: NEIGHBOR_RADIUS_METERS,
            category,
            complaintCount: members.length,
            priorityScore: cluster.priorityScore,
            summary: cluster.summary,
            status: "VOTING",
          },
        });

        await tx.complaint.updateMany({
          where: { id: { in: cluster.complaintIds } },
          data: { clusterId: createdCluster.id, status: "CLUSTERED" },
        });

        out.push({
          id: createdCluster.id,
          name: createdCluster.name,
          category: createdCluster.category,
          complaintCount: createdCluster.complaintCount,
          priorityScore: createdCluster.priorityScore,
          summary: createdCluster.summary,
        });
      }
      return out;
    });

    const result: ClusterResult = {
      clustersCreated: created.length,
      complaintsClustered: created.reduce((s, c) => s + c.complaintCount, 0),
      clusters: created,
    };
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[ai/cluster] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error during clustering" },
      { status: 500 },
    );
  }
}

function allWithinRadius(
  list: Array<{ lat: number; lng: number }>,
): boolean {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      if (
        haversine(list[i].lat, list[i].lng, list[j].lat, list[j].lng) >
        NEIGHBOR_RADIUS_METERS
      ) {
        return false;
      }
    }
  }
  return true;
}

function clampPriority(score: unknown): number {
  const n = typeof score === "number" ? score : Number(score);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
