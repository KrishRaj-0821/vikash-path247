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
 * GET /api/complaints
 * Query: status, category, ward, clustered (bool), limit
 * Order by priorityScore desc, createdAt desc.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const ward = searchParams.get("ward") || undefined;
    const clusteredParam = searchParams.get("clustered");
    const clustered =
      clusteredParam === "true" ? true : clusteredParam === "false" ? false : undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 100, 200) : 100;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (ward) where.ward = ward;
    if (clustered === true) where.clusterId = { not: null };
    if (clustered === false) where.clusterId = null;

    const complaints = await db.complaint.findMany({
      where,
      orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        reporter: {
          select: { id: true, name: true, verified: true },
        },
        _count: { select: { votes: true } },
      },
    });

    return NextResponse.json(complaints);
  } catch (err) {
    console.error("[complaints GET] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch complaints." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/complaints — citizens only.
 * On create:
 *   - First-time reporters earn a FIRST_REPORT badge.
 *   - +10 Swachh Coins to the reporter.
 *   - priorityScore = base + (0 votes * 3) + severityWeight.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    if (user.role !== "CITIZEN") {
      return NextResponse.json(
        { error: "Only citizens can file complaints." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      category,
      severity = "MEDIUM",
      address,
      lat,
      lng,
      ward,
      imageUrl,
      audioTranscript,
      voiceLang,
      aiAnalysis,
    } = body as {
      title?: string;
      description?: string;
      category?: string;
      severity?: string;
      address?: string;
      lat?: number;
      lng?: number;
      ward?: string;
      imageUrl?: string;
      audioTranscript?: string;
      voiceLang?: string;
      aiAnalysis?: string;
    };

    if (!title || !description || !category || !address || lat == null || lng == null) {
      return NextResponse.json(
        { error: "Missing required fields: title, description, category, address, lat, lng." },
        { status: 400 }
      );
    }

    const sev = (severity || "MEDIUM").toUpperCase();
    const priorityScore = computePriority(sev, 0);

    // Create complaint + award first-report badge + 10 coins atomically
    const [complaint] = await db.$transaction([
      db.complaint.create({
        data: {
          title: String(title),
          description: String(description),
          category: String(category).toUpperCase(),
          severity: sev,
          status: "PENDING",
          address: String(address),
          lat: Number(lat),
          lng: Number(lng),
          ward: ward ? String(ward) : null,
          imageUrl: imageUrl || null,
          audioTranscript: audioTranscript || null,
          voiceLang: voiceLang || null,
          aiAnalysis: aiAnalysis || null,
          priorityScore,
          reporterId: user.id,
        },
        include: {
          reporter: { select: { id: true, name: true, verified: true } },
          _count: { select: { votes: true } },
        },
      }),
      db.user.update({
        where: { id: user.id },
        data: { swachhCoins: { increment: 10 } },
      }),
      db.badge.upsert({
        where: {
          userId_badgeType: { userId: user.id, badgeType: "FIRST_REPORT" },
        },
        create: { userId: user.id, badgeType: "FIRST_REPORT" },
        update: {},
      }),
    ]);

    // Also drop a notification to the reporter about the badge/coins earned
    await db.notification
      .create({
        data: {
          userId: user.id,
          complaintId: complaint.id,
          type: "BADGE_EARNED",
          title: "First Report badge earned! +10 Swachh Coins",
          message: `Aapne "${complaint.title}" complaint darj ki. Aapko FIRST_REPORT badge aur 10 Swachh Coins mile.`,
        },
      })
      .catch(() => undefined);

    return NextResponse.json(complaint, { status: 201 });
  } catch (err) {
    console.error("[complaints POST] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create complaint." },
      { status: 500 }
    );
  }
}
