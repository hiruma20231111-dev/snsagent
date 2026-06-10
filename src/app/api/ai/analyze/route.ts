import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai/adapter";
import type { AIToneId } from "@/lib/types";

// POST /api/ai/analyze
// Body: { hint?, tone?, brandName?, imageBase64?, mimeType?, apiKey? }
// The adapter factory picks Gemini when a key is available (per-tenant
// key in the body, or the server's GEMINI_API_KEY), else the local mock.
export async function POST(req: Request) {
  let body: {
    hint?: string;
    tone?: AIToneId;
    brandName?: string;
    imageBase64?: string;
    mimeType?: string;
    apiKey?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine */
  }

  const provider = getAIProvider({
    apiKey: body.apiKey,
    imageBase64: body.imageBase64,
    mimeType: body.mimeType,
  });
  const result = await provider.analyzePhoto({
    hint: body.hint,
    tone: body.tone ?? "friendly",
    brandName: body.brandName ?? "お店",
  });

  return NextResponse.json({ ok: true, provider: provider.id, result });
}
