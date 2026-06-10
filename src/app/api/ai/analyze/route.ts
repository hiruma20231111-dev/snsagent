import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/adapter";
import type { AIToneId } from "@/lib/types";

// POST /api/ai/analyze
// Body: { hint?: string, tone?: AIToneId, brandName?: string }
// Returns AIAnalysis. The provider is chosen by the adapter factory
// (Gemini if GEMINI_API_KEY is set, otherwise the local mock).
export async function POST(req: Request) {
  let body: { hint?: string; tone?: AIToneId; brandName?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  const provider = getAIProvider();
  const result = await provider.analyzePhoto({
    hint: body.hint,
    tone: body.tone ?? "friendly",
    brandName: body.brandName ?? "お店",
  });

  return NextResponse.json({ ok: true, provider: provider.id, result });
}
