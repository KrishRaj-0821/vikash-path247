import { NextRequest, NextResponse } from "next/server";
import { getZai, parseJsonFromLLM } from "@/lib/ai";

export const runtime = "nodejs";

interface BhashaBody {
  audioBase64?: string;
}

interface BhashaResult {
  transcript: string;
  sourceLanguage: string;
  administrativeSummary: string;
}

const SYSTEM_PROMPT =
  "You are a Bhasha translation engine for an Indian municipal complaint system. The user spoke in Hindi/Hinglish/Maithili/Bhojpuri. Convert the spoken text into a clean professional administrative summary in English (1-2 sentences). Detect the source language. Respond STRICTLY as JSON with fields: sourceLanguage (string, e.g. 'Hindi', 'Maithili', 'Bhojpuri', 'Hinglish'), administrativeSummary (string, English, 1-2 sentences, professional tone).";

/**
 * Strip the optional `data:audio/...;base64,` prefix that <audio> blobs /
 * recorder libraries often attach before storing/sending the base64 payload.
 */
function stripDataUriPrefix(s: string): string {
  const idx = s.indexOf(";base64,");
  if (idx !== -1) return s.slice(idx + ";base64,".length);
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as BhashaBody;
    const { audioBase64 } = body;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return NextResponse.json(
        { error: "audioBase64 is required" },
        { status: 400 },
      );
    }

    const cleanAudio = stripDataUriPrefix(audioBase64.trim());
    if (!cleanAudio) {
      return NextResponse.json(
        { error: "audioBase64 payload is empty" },
        { status: 400 },
      );
    }

    // Detect MIME type (default to audio/wav)
    let mimeType = "audio/wav";
    const mimeMatch = audioBase64.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      mimeType = mimeMatch[1];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[ai/bhasha-translate] GEMINI_API_KEY is not set in environment");
      return NextResponse.json(
        { error: "AI service is currently misconfigured" },
        { status: 500 },
      );
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: "You are a Bhasha translation engine for an Indian municipal complaint system. The user spoke in Hindi/Hinglish/Maithili/Bhojpuri. Transcribe the audio verbatim. Also convert the spoken text into a clean professional administrative summary in English (1-2 sentences). Detect the source language. Respond STRICTLY as JSON with fields: transcript (verbatim transcription of the spoken audio in its native script or transliterated Hinglish), sourceLanguage (string, e.g. 'Hindi', 'Maithili', 'Bhojpuri', 'Hinglish'), administrativeSummary (string, English, 1-2 sentences, professional tone)." },
            {
              inlineData: {
                mimeType,
                data: cleanAudio,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    let transcript = "";
    let sourceLanguage = "Hinglish";
    let administrativeSummary = "";
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
          const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          
          const parsed = parseJsonFromLLM<{
            transcript?: string;
            sourceLanguage?: string;
            administrativeSummary?: string;
          }>(raw);

          if (parsed) {
            transcript = parsed.transcript?.trim() ?? "";
            sourceLanguage = parsed.sourceLanguage?.trim() ?? "Hinglish";
            administrativeSummary = parsed.administrativeSummary?.trim() ?? "";
            success = true;
            break;
          }
        }

        const errText = await response.text();
        console.warn(`[ai/bhasha-translate] Model ${modelName} returned status ${response.status}: ${errText}`);
      } catch (err: any) {
        console.warn(`[ai/bhasha-translate] Model ${modelName} fetch failed:`, err.message);
      }
    }

    if (!success) {
      return NextResponse.json(
        { error: "Speech recognition service is currently experiencing high demand. Please try again later." },
        { status: 502 },
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "Could not transcribe the audio — please try speaking again" },
        { status: 422 },
      );
    }

    const result: BhashaResult = {
      transcript,
      sourceLanguage,
      administrativeSummary: administrativeSummary || transcript,
    };
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[ai/bhasha-translate] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error during Bhasha translation" },
      { status: 500 },
    );
  }
}
