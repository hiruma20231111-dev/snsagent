import { NextResponse } from "next/server";
import { getRankConfig, saveRankConfig } from "@/lib/server-store";
import { findPlace, placesKey } from "@/lib/places";
import type { RankConfig } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/rank/config → business config + whether the Places key is set
export async function GET() {
  try {
    const cfg = await getRankConfig();
    return NextResponse.json({ ok: true, config: cfg, hasKey: !!placesKey() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), hasKey: !!placesKey() }, { status: 200 });
  }
}

// POST /api/rank/config { businessName, address?, apiKey? } → resolves place
export async function POST(req: Request) {
  let b: Partial<RankConfig> & { apiKey?: string } = {};
  try {
    b = (await req.json()) as Partial<RankConfig> & { apiKey?: string };
  } catch {
    /* ignore */
  }
  if (!b.businessName?.trim()) {
    return NextResponse.json({ ok: false, error: "店舗名は必須です。" }, { status: 400 });
  }
  const key = placesKey(b.apiKey);
  const cfg: RankConfig = {
    businessName: b.businessName.trim(),
    address: b.address?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  // Try to resolve the place now (so checks are instant later).
  let resolved = false;
  if (key) {
    const q = [cfg.businessName, cfg.address].filter(Boolean).join(" ");
    const p = await findPlace(q, b.apiKey);
    if (p) {
      cfg.placeId = p.placeId;
      cfg.lat = p.lat;
      cfg.lng = p.lng;
      resolved = true;
    }
  }
  try {
    await saveRankConfig(cfg);
    return NextResponse.json({ ok: true, config: cfg, resolved, hasKey: !!key });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
