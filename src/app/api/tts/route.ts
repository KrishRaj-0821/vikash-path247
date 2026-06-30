import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/ai";

export const runtime = "nodejs";

const MAX_TEXT_CHARS = 1000;
const TTS_VOICE = "tongtong";
const TTS_SPEED = 1.0;

interface TtsBody {
  text?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as TtsBody;
    const rawText = body.text;
    if (typeof rawText !== "string" || !rawText.trim()) {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 },
      );
    }

    const text = rawText.length > MAX_TEXT_CHARS
      ? rawText.slice(0, MAX_TEXT_CHARS)
      : rawText;

    const zai = await getZai();

    let arrayBuffer: ArrayBuffer;
    try {
      const response = await zai.audio.tts.create({
        input: text,
        voice: TTS_VOICE,
        speed: TTS_SPEED,
        response_format: "wav",
        stream: false,
      });
      arrayBuffer = await response.arrayBuffer();
    } catch (err) {
      console.error("[tts] TTS error:", err);
      return NextResponse.json(
        { error: "Text-to-speech synthesis failed" },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(new Uint8Array(arrayBuffer));
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "TTS service returned an empty audio buffer" },
        { status: 502 },
      );
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (err) {
    console.error("[tts] unhandled error:", err);
    return NextResponse.json(
      { error: "Internal server error during TTS synthesis" },
      { status: 500 },
    );
  }
}
