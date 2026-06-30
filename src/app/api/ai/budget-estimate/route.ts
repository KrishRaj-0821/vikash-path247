import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getZai, parseJsonFromLLM } from "@/lib/ai";

export const runtime = "nodejs";

interface BudgetEstimateBody {
  complaintId?: string;
}

interface BudgetMaterial {
  item: string;
  qty: string;
  cost: number;
}

interface BudgetDraft {
  estimatedCost: number;
  costMin: number;
  costMax: number;
  materials: BudgetMaterial[];
  timeline: string;
  engineeringDraft: string;
  laborRequired: string;
  equipmentNeeded: string;
  riskLevel: string;
}

const SYSTEM_PROMPT =
  "You are a senior municipal engineer and cost estimator for an Indian municipal corporation. Given a civic complaint, produce a professional engineering draft. Respond STRICTLY as JSON: { estimatedCost (INR number), costMin, costMax, materials (array of {item, qty, cost}), timeline (string like '3-5 working days'), engineeringDraft (multi-line string with full scope of work), laborRequired, equipmentNeeded, riskLevel (LOW/MEDIUM/HIGH) }. Use realistic Indian rates. Be conservative on cost.";

const VALID_RISKS = new Set(["LOW", "MEDIUM", "HIGH"]);

function toNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function clampRisk(v: unknown): string {
  const s = typeof v === "string" ? v.toUpperCase() : "LOW";
  return VALID_RISKS.has(s) ? s : "LOW";
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    if (user.role !== "MUNICIPAL") {
      return NextResponse.json(
        { error: "Only municipal officials can request budget estimates" },
        { status: 403 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as BudgetEstimateBody;
    const { complaintId } = body;
    if (!complaintId || typeof complaintId !== "string") {
      return NextResponse.json(
        { error: "complaintId is required" },
        { status: 400 },
      );
    }

    const complaint = await db.complaint.findUnique({
      where: { id: complaintId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        severity: true,
        address: true,
        ward: true,
        imageUrl: true,
        aiAnalysis: true,
        lat: true,
        lng: true,
        budgetEstimate: { select: { id: true } },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 },
      );
    }
    if (complaint.budgetEstimate) {
      return NextResponse.json(
        { error: "A budget estimate already exists for this complaint" },
        { status: 409 },
      );
    }

    const complaintContext = {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      severity: complaint.severity,
      address: complaint.address,
      ward: complaint.ward,
      lat: complaint.lat,
      lng: complaint.lng,
      imageUrl: complaint.imageUrl ?? null,
      aiAnalysis: complaint.aiAnalysis ?? null,
    };

    const zai = await getZai();

    let raw = "";
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Complaint details (JSON):\n${JSON.stringify(
              complaintContext,
              null,
              2,
            )}\n\nProduce the engineering JSON draft now.`,
          },
        ],
        thinking: { type: "disabled" },
      });
      raw =
        (completion?.choices?.[0]?.message?.content as string | undefined) ??
        "";
    } catch (err) {
      console.error("[ai/budget-estimate] LLM error:", err);
      return NextResponse.json(
        { error: "AI failed to produce a budget estimate" },
        { status: 502 },
      );
    }

    const parsed = parseJsonFromLLM<Partial<BudgetDraft>>(raw);
    if (!parsed) {
      return NextResponse.json(
        { error: "AI returned a malformed engineering draft", raw },
        { status: 502 },
      );
    }

    const estimatedCost = Math.max(0, toNumber(parsed.estimatedCost, 0));
    const costMin = Math.max(0, toNumber(parsed.costMin, estimatedCost));
    const costMax = Math.max(costMin, toNumber(parsed.costMax, estimatedCost));
    const materials: BudgetMaterial[] = Array.isArray(parsed.materials)
      ? parsed.materials
          .filter(
            (m): m is BudgetMaterial =>
              !!m && typeof m === "object" && typeof (m as BudgetMaterial).item === "string",
          )
          .map((m) => ({
            item: String(m.item),
            qty: String(m.qty ?? ""),
            cost: toNumber(m.cost, 0),
          }))
      : [];
    const timeline =
      typeof parsed.timeline === "string" && parsed.timeline.trim()
        ? parsed.timeline.trim()
        : "3-5 working days";
    const engineeringDraft =
      typeof parsed.engineeringDraft === "string" && parsed.engineeringDraft.trim()
        ? parsed.engineeringDraft.trim()
        : raw;
    const laborRequired =
      typeof parsed.laborRequired === "string" && parsed.laborRequired.trim()
        ? parsed.laborRequired.trim()
        : "1 supervisor + 2 workers";
    const equipmentNeeded =
      typeof parsed.equipmentNeeded === "string" && parsed.equipmentNeeded.trim()
        ? parsed.equipmentNeeded.trim()
        : "Standard municipal repair kit";
    const riskLevel = clampRisk(parsed.riskLevel);

    const created = await db.budgetEstimate.create({
      data: {
        complaintId: complaint.id,
        estimatedCost,
        costMin,
        costMax,
        materials: JSON.stringify(materials),
        timeline,
        engineeringDraft,
        laborRequired,
        equipmentNeeded,
        riskLevel,
        createdBy: user.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[ai/budget-estimate] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error while estimating budget" },
      { status: 500 },
    );
  }
}
