import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getZai } from "@/lib/ai";

export const runtime = "nodejs";

interface JanSamvaadBody {
  complaintId?: string;
}

const SYSTEM_PROMPT =
  "You are the Jan Samvaad feedback engine. Write a warm, encouraging 2-line notification in Hinglish (Hindi+English mix) to inform citizens that their reported issue has been resolved by the municipal corporation. Mention the complaint title. Be friendly and proud (Swachh Bharat tone).";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = (await req.json().catch(() => ({}))) as JanSamvaadBody;
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
        category: true,
        severity: true,
        address: true,
        ward: true,
        resolution: {
          select: {
            resolutionNote: true,
            actualCost: true,
            resolvedAt: true,
            resolvedBy: true,
          },
        },
      },
    });

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 },
      );
    }

    const resolutionContext = complaint.resolution
      ? {
          note: complaint.resolution.resolutionNote,
          actualCost: complaint.resolution.actualCost,
          resolvedAt: complaint.resolution.resolvedAt,
        }
      : null;

    const zai = await getZai();

    let message = "";
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Complaint title: ${complaint.title}\nCategory: ${complaint.category}\nWard: ${complaint.ward ?? "N/A"}\nAddress: ${complaint.address}\nResolution: ${JSON.stringify(
              resolutionContext,
            )}\n\nGenerate the 2-line Hinglish notification now. Reply with only the notification text — no JSON, no markdown.`,
          },
        ],
        thinking: { type: "disabled" },
      });
      message =
        (completion?.choices?.[0]?.message?.content as string | undefined)?.trim() ??
        "";
    } catch (err) {
      console.error("[ai/jan-samvaad] LLM error:", err);
      // Soft fallback so the UI never breaks.
      message = `Bharat mata ki jai! Aapki shikayat "${complaint.title}" municipal corporation dwara resolve kar di gayi hai. Swachh Bharat, Samarth Bharat — aapke sahyog ke liye dhanyawaad! 🇮🇳`;
    }

    if (!message) {
      message = `Aapki shikayat "${complaint.title}" resolve ho chuki hai. Swachh Nagar, Swachh Bharat — aapke sahyog ke liye dhanyawaad!`;
    }

    return NextResponse.json({ message }, { status: 200 });
  } catch (err) {
    console.error("[ai/jan-samvaad] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error while generating Jan Samvaad message" },
      { status: 500 },
    );
  }
}
