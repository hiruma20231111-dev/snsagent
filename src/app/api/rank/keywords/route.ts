import { NextResponse } from "next/server";
import { listRankKeywords, saveRankKeyword, deleteRankKeyword } from "@/lib/server-store";
import type { RankKeyword } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/rank/keywords → all tracked keywords (with history)
export async function GET() {
  try {
    const keywords = await listRankKeywords();
    return NextResponse.json({ ok: true, keywords });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), keywords: [] }, { status: 200 });
  }
}

// POST /api/rank/keywords { keyword } → add a keyword to track
export async function POST(req: Request) {
  let b: { keyword?: string } = {};
  try {
    b = await req.json();
  } catch {
    /* ignore */
  }
  if (!b.keyword?.trim()) {
    return NextResponse.json({ ok: false, error: "キーワードが空です。" }, { status: 400 });
  }
  const kw: RankKeyword = {
    id: "kw_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    keyword: b.keyword.trim(),
    addedAt: new Date().toISOString(),
    history: [],
  };
  try {
    await saveRankKeyword(kw);
    return NextResponse.json({ ok: true, keyword: kw });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// DELETE /api/rank/keywords?id=...
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id がありません。" }, { status: 400 });
  try {
    await deleteRankKeyword(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
