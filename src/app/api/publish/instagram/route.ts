import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/publish/instagram  { imageUrl, caption }
// Publishes a single image to the connected Instagram account using the
// "Instagram API with Instagram Login" content-publishing flow:
//   1) create media container   POST graph.instagram.com/{ig-id}/media
//   2) publish the container     POST graph.instagram.com/{ig-id}/media_publish
// The token is read from the httpOnly cookie set during OAuth.

const GRAPH = "https://graph.instagram.com";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Instagram未連携です。設定からログイン連携してください。" },
      { status: 401 }
    );
  }

  let body: { imageUrl?: string; caption?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.imageUrl) {
    return NextResponse.json({ ok: false, error: "画像URLがありません。" }, { status: 400 });
  }

  try {
    // Resolve the IG user id from the token.
    const meRes = await fetch(`${GRAPH}/me?fields=user_id&access_token=${token}`, {
      cache: "no-store",
    });
    const me = (await meRes.json()) as { user_id?: string; id?: string; error?: { message?: string } };
    const igId = me.user_id ?? me.id;
    if (!igId) {
      return NextResponse.json(
        { ok: false, error: me.error?.message ?? "アカウント情報を取得できませんでした。" },
        { status: 200 }
      );
    }

    // 1) container
    const createParams = new URLSearchParams({
      image_url: body.imageUrl,
      caption: body.caption ?? "",
      access_token: token,
    });
    const createRes = await fetch(`${GRAPH}/${igId}/media`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: createParams.toString(),
      cache: "no-store",
    });
    const created = (await createRes.json()) as { id?: string; error?: { message?: string } };
    if (!created.id) {
      return NextResponse.json(
        { ok: false, error: created.error?.message ?? "メディア作成に失敗しました。" },
        { status: 200 }
      );
    }

    // 2) publish
    const pubParams = new URLSearchParams({ creation_id: created.id, access_token: token });
    const pubRes = await fetch(`${GRAPH}/${igId}/media_publish`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: pubParams.toString(),
      cache: "no-store",
    });
    const published = (await pubRes.json()) as { id?: string; error?: { message?: string } };
    if (!published.id) {
      return NextResponse.json(
        { ok: false, error: published.error?.message ?? "公開に失敗しました。" },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, mediaId: published.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Instagram投稿に失敗しました: " + String(e) },
      { status: 200 }
    );
  }
}
