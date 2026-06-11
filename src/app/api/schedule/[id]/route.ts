import { NextResponse } from "next/server";
import { deletePost, updatePost, type StoredPost } from "@/lib/server-store";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/schedule/:id  { scheduledAt?, caption?, title?, channels?, status? }
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  let patch: Partial<StoredPost> = {};
  try {
    patch = (await req.json()) as Partial<StoredPost>;
  } catch {
    /* ignore */
  }
  // only allow editable fields through
  const allowed: Partial<StoredPost> = {};
  if (patch.scheduledAt != null) allowed.scheduledAt = patch.scheduledAt;
  if (patch.caption != null) allowed.caption = patch.caption;
  if (patch.title != null) allowed.title = patch.title;
  if (patch.channels != null) allowed.channels = patch.channels;
  if (patch.imageUrl != null) allowed.imageUrl = patch.imageUrl;
  if (patch.status != null) allowed.status = patch.status;

  try {
    const updated = await updatePost(id, allowed);
    if (!updated) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    return NextResponse.json({ ok: true, post: updated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

// DELETE /api/schedule/:id
export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
