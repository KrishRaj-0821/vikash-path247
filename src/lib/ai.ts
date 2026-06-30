/**
 * Shared AI helpers for Vikash Path.
 *
 * - getZai(): lazy singleton around `z-ai-web-dev-sdk` so we only init once.
 * - parseJsonFromLLM(text): strips ```json fences / surrounding prose and
 *   returns a parsed object (or null on failure).
 * - haversine(lat1, lng1, lat2, lng2): great-circle distance in meters.
 */
import ZAI, { type ZAI as ZAIType } from "z-ai-web-dev-sdk";

const globalForZai = globalThis as unknown as { __vikashZai?: ZAIType };

/**
 * Get the singleton ZAI client. The SDK reads its credentials from env vars
 * internally so we just need to call create() once.
 */
export async function getZai(): Promise<ZAIType> {
  if (!globalForZai.__vikashZai) {
    const zai = await ZAI.create();
    
    // Intercept completions create to replace unsupported model names
    const originalCreate = zai.chat.completions.create.bind(zai.chat.completions);
    zai.chat.completions.create = async function (body, ...args) {
      const { thinking, ...cleanedBody } = body;
      const requestBody = {
        ...cleanedBody,
        model: body.model && body.model !== "gemini-3.1-flash-lite" ? body.model : "gemini-flash-latest",
      };
      return originalCreate(requestBody, ...args);
    };

    globalForZai.__vikashZai = zai;
  }
  return globalForZai.__vikashZai;
}

/**
 * Robustly extract a JSON object/array from an LLM response that may include
 * ```json ... ``` fences, leading prose, trailing commentary, or smart quotes.
 * Returns null when no valid JSON can be located.
 */
export function parseJsonFromLLM<T = unknown>(text: string): T | null {
  if (!text || typeof text !== "string") return null;

  // Normalize smart quotes that some models emit inside JSON strings.
  let cleaned = text
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2018/g, "'")
    .replace(/\u2019/g, "'")
    .trim();

  // 1. Try fenced ```json ... ``` or ``` ... ``` blocks first.
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    const parsed = tryParse(candidate);
    if (parsed !== null) return parsed as T;
  }

  // 2. Try the whole string as JSON.
  const whole = tryParse(cleaned);
  if (whole !== null) return whole as T;

  // 3. Try to slice between the first { or [ and its matching closing brace.
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let startIdx = -1;
  let openCh = "";
  let closeCh = "";
  if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
    startIdx = firstObj;
    openCh = "{";
    closeCh = "}";
  } else if (firstArr !== -1) {
    startIdx = firstArr;
    openCh = "[";
    closeCh = "]";
  }
  if (startIdx !== -1) {
    const slice = extractBalanced(cleaned, startIdx, openCh, closeCh);
    if (slice) {
      const parsed = tryParse(slice);
      if (parsed !== null) return parsed as T;
    }
  }

  return null;
}

function tryParse(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractBalanced(
  s: string,
  startIdx: number,
  openCh: string,
  closeCh: string,
): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === openCh) depth++;
    else if (ch === closeCh) {
      depth--;
      if (depth === 0) return s.slice(startIdx, i + 1);
    }
  }
  return null;
}

const EARTH_RADIUS_METERS = 6_371_000;

/**
 * Great-circle distance between two lat/lng points in meters using the
 * haversine formula. Used to group hyperlocal complaints.
 */
export function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}
