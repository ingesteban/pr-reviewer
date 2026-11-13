import { GoogleGenAI, type Part, ThinkingLevel } from "@google/genai";
import { log } from "../../lib/log.ts";
import { type Capture, type Context, type Script, ScriptSchema, clampScript } from "../../lib/schema.ts";
import type { LayoutFact } from "./facts.ts";
import type { PreparedImages } from "./images.ts";

export const DEFAULT_MODEL = "gemini-4-hydrogen";
export const DEFAULT_FALLBACK_MODEL = "gemini-3.8-flash";
const TIMEOUT_MS = 30_000;

export interface NarrationInput {
  context: Context;
  captures: { capture: Capture; images: PreparedImages }[];
  facts: LayoutFact[];
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Trailer title, at most 8 words, catchy, no code identifiers" },
    summary: { type: "string", description: "What changed overall, at most 20 words" },
    verdict: { type: "string", enum: ["looks-good", "needs-a-look"] },
    scenes: {
      type: "array",
      description: "One scene per capture, in the order given",
      items: {
        type: "object",
        properties: {
          captureId: { type: "string" },
          caption: { type: "string", description: "At most 12 words, present tense, plain English" },
          detail: { type: "string", description: "At most 25 words" },
          focusBox: { type: "integer", description: "Index of the most important change box for this capture" },
        },
        required: ["captureId", "caption", "detail", "focusBox"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          captureId: { type: "string" },
          description: { type: "string", description: "At most 25 words, what looks broken and where" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["captureId", "description", "severity"],
      },
    },
  },
  required: ["title", "summary", "verdict", "scenes", "risks"],
};

function buildPrompt({ context, captures, facts }: NarrationInput): string {
  const lines = [
    "You are a senior product reviewer making a 30-second video trailer of a pull request for the team that will review it.",
    "",
    `PR #${context.pr.number}: ${context.pr.title}`,
    `Author: @${context.pr.author} · ${context.pr.head} → ${context.pr.base}`,
    context.pr.body ? `Description: ${context.pr.body}` : "",
    "",
    "For each capture below you get a BEFORE image (base branch) and an AFTER image (this PR) of the same page and viewport.",
    "Change boxes are rectangles {x,y,w,h} in the image's pixel coordinates where pixels changed.",
    "",
    "Rules:",
    "- Describe only what is visible in the AFTER images compared with the BEFORE images. Never invent functionality.",
    "- Look carefully for layout problems, especially on mobile: horizontal overflow, content wider than the screen, overlapping or clipped text, squeezed columns, broken alignment. Report each one as a risk with a severity.",
    "- verdict is \"needs-a-look\" if there is any medium or high risk, otherwise \"looks-good\".",
    "- Captions: plain English, present tense, no code identifiers or file names.",
    "- Use exactly the captureId values given. One scene per capture.",
    "",
  ];
  if (facts.length) {
    lines.push("Measured facts (from the browser, reliable):");
    for (const f of facts) lines.push(`- ${f.captureId}: the AFTER page is ${f.pageWidth}px wide on a ${f.viewportWidth}px-wide viewport.`);
    lines.push("");
  }
  lines.push("Code diff (may be truncated):", "```diff", context.diff, "```");
  return lines.filter((l) => l !== undefined).join("\n");
}

function buildParts(input: NarrationInput): Part[] {
  const parts: Part[] = [{ text: buildPrompt(input) }];
  for (const { capture, images } of input.captures) {
    parts.push({
      text: `Capture ${capture.id} (route ${capture.route}, ${capture.viewport}, ${images.width}×${images.height}px, ${(capture.diffRatio * 100).toFixed(1)}% changed). Change boxes: ${JSON.stringify(images.boxes)}. BEFORE ${capture.id}:`,
    });
    parts.push({ inlineData: { mimeType: "image/png", data: images.base } });
    parts.push({ text: `AFTER ${capture.id}:` });
    parts.push({ inlineData: { mimeType: "image/png", data: images.head } });
  }
  return parts;
}

/** Parse, validate and repair Gemini's JSON (unknown capture ids dropped, focusBox clamped). */
export function parseScript(text: string, input: NarrationInput, model: string): Script {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    throw new Error("Gemini returned invalid JSON");
  }
  const ids = new Map(input.captures.map(({ capture, images }) => [capture.id, images.boxes.length]));
  const r = raw as Record<string, unknown>;
  const scenes = (Array.isArray(r.scenes) ? r.scenes : [])
    .filter((s: Record<string, unknown>) => ids.has(String(s?.captureId)))
    .map((s: Record<string, unknown>) => ({
      ...s,
      focusBox: Math.max(0, Math.min(Number(s.focusBox) || 0, Math.max(0, (ids.get(String(s.captureId)) ?? 1) - 1))),
    }));
  const risks = (Array.isArray(r.risks) ? r.risks : []).filter((x: Record<string, unknown>) => ids.has(String(x?.captureId)));
  const parsed = ScriptSchema.safeParse({ ...r, source: "gemini", model, scenes, risks });
  if (!parsed.success) {
    throw new Error(`Gemini output failed validation: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  }
  return clampScript(parsed.data);
}

async function callModel(ai: GoogleGenAI, model: string, parts: Part[], thinking: boolean): Promise<string> {
  const level = (process.env.GEMINI_THINKING_LEVEL || "LOW").toUpperCase() as ThinkingLevel;
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      ...(thinking ? { thinkingConfig: { thinkingLevel: level } } : {}),
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

const shortError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (/abort|timeout/i.test(message)) return `timed out after ${TIMEOUT_MS / 1000}s`;
  return message.replace(/\s+/g, " ").slice(0, 180);
};

/**
 * Try the primary model, then the fallback model (each once with thinking, once without if the
 * error is about thinking). Throws if every attempt fails; the caller then uses the template script.
 */
export async function narrateWithGemini(input: NarrationInput): Promise<Script> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set (.env)");
  const ai = new GoogleGenAI({ apiKey, ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}) });
  const models = [process.env.GEMINI_MODEL || DEFAULT_MODEL, process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL];
  const parts = buildParts(input);

  let lastError: unknown;
  for (const model of [...new Set(models)]) {
    for (const thinking of [true, false]) {
      try {
        log.info(`asking ${model}${thinking ? ` (thinking ${process.env.GEMINI_THINKING_LEVEL || "low"})` : ""} · ${input.captures.length} capture(s), ${input.captures.length * 2} images`);
        const text = await callModel(ai, model, parts, thinking);
        return parseScript(text, input, model);
      } catch (error) {
        lastError = error;
        log.warn(`${model}: ${shortError(error)}`);
        // Retry the same model without thinking only when the error is about thinking.
        if (!(thinking && /thinking/i.test(String((error as Error)?.message)))) break;
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
