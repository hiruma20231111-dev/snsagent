import { NextResponse } from "next/server";
import { listBank, saveBankItem, deleteBankItem } from "@/lib/server-store";
import type { BankItem } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/autopilot/bank → all ready-to-post drafts
export async function GET() {
  try {
    const items = await listBank();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), items: [] }, { status: 200 });
  }
}

// POST /api/autopilot/bank  { imageUrl, caption, hashtags, title? }
// The image is already uploaded (via /api/upload) and the copy is generated
// client-side with the owner's AI key, tuned to the persona.
export async function POST(req: Request) {
  let b: Partial<BankItem> = {};
  try {
    b = (await req.json()) as Partial<BankItem>;
  } catch {
    /* ignore */
  }
  if (!b.imageUrl) {
    return NextResponse.json({ ok: false, error: "imageUrl は必須です。" }, { status: 400 });
  }
  const item: BankItem = {
    id: b.id || "bank_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    imageUrl: b.imageUrl,
    caption: b.caption ?? "",
    hashtags: Array.isArray(b.hashtags) ? b.hashtags : [],
    title: b.title,
    format: b.format ?? "feed",
    used: false,
    createdAt: new Date().toISOString(),
  };
  try {
    await saveBankItem(item);
    return NextResponse.json({ ok: true, item });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// DELETE /api/autopilot/bank?id=...
export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, error: "id がありません。" }, { status: 400 });
  try {
    await deleteBankItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
