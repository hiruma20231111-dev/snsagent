import { NextResponse } from "next/server";
import {
  getRankConfig,
  saveRankConfig,
  listRankKeywords,
  saveRankKeyword,
} from "@/lib/server-store";
import { findPlace, rankForKeyword, placesKey } from "@/lib/places";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_CAP = 30;

// POST /api/rank/check → measure the current rank of every keyword.
export async function POST() {
  if (!placesKey()) {
    return NextResponse.json({
      ok: false,
      needsKey: true,
      error:
        "Google Places APIキーが未設定です。Google CloudでPlaces APIを有効化し、GOOGLE_PLACES_API_KEY を設定してください。",
    });
  }

  let cfg = await getRankConfig();
  if (!cfg?.businessName) {
    return NextResponse.json({ ok: false, error: "先に店舗名を設定してください。" }, { status: 400 });
  }

  // Resolve the place once (and cache it on the config).
  if (!cfg.placeId || cfg.lat == null || cfg.lng == null) {
    const p = await findPlace([cfg.businessName, cfg.address].filter(Boolean).join(" "));
    if (!p) {
      return NextResponse.json({
        ok: false,
        error: "店舗をGoogle上で特定できませんでした。店舗名・住所を見直してください。",
      });
    }
    cfg = { ...cfg, placeId: p.placeId, lat: p.lat, lng: p.lng };
    await saveRankConfig(cfg);
  }

  const keywords = await listRankKeywords();
  const now = new Date().toISOString();
  const results: { id: string; keyword: string; rank: number | null }[] = [];

  for (const kw of keywords) {
    const r = await rankForKeyword(kw.keyword, cfg.lat!, cfg.lng!, cfg.placeId!);
    const point = { at: now, rank: r.rank };
    const history = [...kw.history, point].slice(-HISTORY_CAP);
    await saveRankKeyword({
      ...kw,
      history,
      lastRank: r.rank,
      lastChecked: now,
    });
    results.push({ id: kw.id, keyword: kw.keyword, rank: r.rank });
  }

  return NextResponse.json({ ok: true, checkedAt: now, results });
}
