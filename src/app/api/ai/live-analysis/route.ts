import { NextRequest, NextResponse } from "next/server";
import { getZai, parseJsonFromLLM } from "@/lib/ai";

export const runtime = "nodejs";

const DEFAULT_PROMPT =
  "You are an expert civic infrastructure inspector for an Indian municipal corporation. Analyze this image and identify the infrastructure issue. Respond STRICTLY as JSON with fields: category (one of POTHOLE, GARBAGE, WATER, STREETLIGHT, DRAINAGE, ROAD, OTHER), severity (LOW/MEDIUM/HIGH/CRITICAL), analysis (2-3 sentence description in Hinglish for citizens), recommendedAction (1 sentence).";

const VALID_CATEGORIES = new Set([
  "POTHOLE",
  "GARBAGE",
  "WATER",
  "STREETLIGHT",
  "DRAINAGE",
  "ROAD",
  "OTHER",
]);

const VALID_SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

interface LiveAnalysisBody {
  imageUrl?: string;
  prompt?: string;
}

interface LiveAnalysisResult {
  category: string;
  severity: string;
  analysis: string;
  recommendedAction: string;
  raw: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as LiveAnalysisBody;
    const { imageUrl, prompt } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "imageUrl is required" },
        { status: 400 },
      );
    }

    const userPrompt = prompt?.trim() ? prompt.trim() : DEFAULT_PROMPT;

    // Parse image URL
    let mimeType = "image/jpeg";
    let base64Data = imageUrl;
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[ai/live-analysis] GEMINI_API_KEY is not set in environment");
      return NextResponse.json(
        { error: "AI service is currently misconfigured" },
        { status: 500 },
      );
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    let raw = "";
    let success = false;
    const candidateModels = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];
    
    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const data = await response.json();
          raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          success = true;
          break;
        }

        const errText = await response.text();
        console.warn(`[ai/live-analysis] Model ${modelName} returned status ${response.status}: ${errText}`);
      } catch (err: any) {
        console.warn(`[ai/live-analysis] Model ${modelName} fetch failed:`, err.message);
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: "Vision model is currently experiencing high demand. Please try again later." },
        { status: 502 },
      );
    }

    if (!raw) {
      return NextResponse.json(
        { error: "Vision model returned an empty response" },
        { status: 502 },
      );
    }

    const parsed = parseJsonFromLLM<Record<string, unknown>>(raw);

    const category =
      parsed && typeof parsed.category === "string"
        ? String(parsed.category).toUpperCase()
        : "OTHER";
    const severity =
      parsed && typeof parsed.severity === "string"
        ? String(parsed.severity).toUpperCase()
        : "MEDIUM";
    const analysis =
      parsed && typeof parsed.analysis === "string"
        ? parsed.analysis
        : "Image analyzed; please review manually.";
    const recommendedAction =
      parsed && typeof parsed.recommendedAction === "string"
        ? parsed.recommendedAction
        : "Forward to the concerned municipal ward office for inspection.";

    const result: LiveAnalysisResult = {
      category: VALID_CATEGORIES.has(category) ? category : "OTHER",
      severity: VALID_SEVERITIES.has(severity) ? severity : "MEDIUM",
      analysis,
      recommendedAction,
      raw,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[ai/live-analysis] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error during live analysis" },
      { status: 500 },
    );
  }
}
