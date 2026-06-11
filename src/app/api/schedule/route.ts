import { NextResponse } from "next/server";
import { listPosts, savePost, type StoredPost } from "@/lib/server-store";
import type { Channel, PostFormat } from "@/lib/types";

// Node runtime: server-store imports node:crypto (token encryption).
export const runtime = "nodejs";

// GET /api/schedule  → all persisted scheduled posts (cron ledger)
export async function GET() {
  try {
    const posts = await listPosts();
    posts.sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), posts: [] }, { status: 200 });
  }
}

// POST /api/schedule  { id, imageUrl, caption, title?, format, channels, scheduledAt }
// Persists a scheduled post so the cron job can publish it later.
export async function POST(req: Request) {
  let b: Partial<StoredPost> = {};
  try {
    b = (await req.json()) as Partial<StoredPost>;
  } catch {
    /* ignore */
  }
  if (!b.imageUrl || !b.scheduledAt) {
    return NextResponse.json(
      { ok: false, error: "imageUrl と scheduledAt は必須です。" },
      { status: 400 }
    );
  }
  const now = new Date().toISOString();
  const post: StoredPost = {
    id: b.id || "post_" + Date.now(),
    imageUrl: b.imageUrl,
    caption: b.caption ?? "",
    title: b.title,
    format: (b.format as PostFormat) ?? "feed",
    channels: (b.channels as Channel[]) ?? ["instagram"],
    scheduledAt: b.scheduledAt,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
  try {
    await savePost(post);
    return NextResponse.json({ ok: true, id: post.id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
