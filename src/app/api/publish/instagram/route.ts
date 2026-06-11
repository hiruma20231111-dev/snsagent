import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { publishToInstagram } from "@/lib/instagram";

// POST /api/publish/instagram  { imageUrl, caption, format }
// Interactive ("post now") publish. The scheduled path lives in
// /api/cron/publish; both share lib/instagram.ts.

export const maxDuration = 30;

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Instagram未連携です。設定からログイン連携してください。" },
      { status: 401 }
    );
  }

  let body: { imageUrl?: string; caption?: string; format?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.imageUrl) {
    return NextResponse.json({ ok: false, error: "画像URLがありません。" }, { status: 400 });
  }

  const result = await publishToInstagram({
    token,
    imageUrl: body.imageUrl,
    caption: body.caption ?? "",
    format: body.format,
  });
  return NextResponse.json(result, { status: 200 });
}
