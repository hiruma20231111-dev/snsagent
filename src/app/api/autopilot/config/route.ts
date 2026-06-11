import { NextResponse } from "next/server";
import { getAutopilotConfig, saveAutopilotConfig } from "@/lib/server-store";
import { defaultAutopilotConfig } from "@/lib/persona";
import type { AutopilotConfig } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/autopilot/config → current config (or defaults)
export async function GET() {
  try {
    const cfg = (await getAutopilotConfig()) ?? defaultAutopilotConfig();
    return NextResponse.json({ ok: true, config: cfg });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e), config: defaultAutopilotConfig() },
      { status: 200 }
    );
  }
}

// POST /api/autopilot/config  { ...AutopilotConfig }
export async function POST(req: Request) {
  let body: Partial<AutopilotConfig> = {};
  try {
    body = (await req.json()) as Partial<AutopilotConfig>;
  } catch {
    /* ignore */
  }
  const base = defaultAutopilotConfig();
  const cfg: AutopilotConfig = {
    enabled: body.enabled ?? base.enabled,
    persona: { ...base.persona, ...(body.persona ?? {}) },
    postsPerWeek: clampNum(body.postsPerWeek, 1, 14, base.postsPerWeek),
    preferredDays: Array.isArray(body.preferredDays) ? body.preferredDays : base.preferredDays,
    timeBand: body.timeBand ?? base.timeBand,
    channels: body.channels ?? base.channels,
    format: body.format ?? base.format,
    lookaheadDays: clampNum(body.lookaheadDays, 3, 30, base.lookaheadDays),
    updatedAt: new Date().toISOString(),
  };
  try {
    await saveAutopilotConfig(cfg);
    return NextResponse.json({ ok: true, config: cfg });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

function clampNum(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
