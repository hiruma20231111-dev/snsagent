import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// POST /api/publish/instagram  { imageUrl, caption }
// Publishes a single image to the connected Instagram account using the
// "Instagram API with Instagram Login" content-publishing flow:
//   1) create media container   POST graph.instagram.com/{ig-id}/media
//   2) publish the container     POST graph.instagram.com/{ig-id}/media_publish
// The token is read from the httpOnly cookie set during OAuth.

const GRAPH = "https://graph.instagram.com";

// Allow enough wall-clock for container polling (default would cut us off).
export const maxDuration = 30;

function fmtErr(err: { message?: string; code?: number } | undefined, fallback: string): string {
  if (!err) return fallback;
  const msg = err.message ?? fallback;
  return typeof err.code === "number" ? `${msg}（code ${err.code}）` : msg;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Poll the media container until Instagram finishes processing it.
// status_code: IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED
async function waitForContainer(
  creationId: string,
  token: string,
  maxTries = 8
): Promise<{ ok: boolean; error?: string }> {
  for (let i = 0; i < maxTries; i++) {
    try {
      const res = await fetch(
        `${GRAPH}/${creationId}?fields=status_code,status&access_token=${token}`,
        { cache: "no-store" }
      );
      const j = (await res.json()) as {
        status_code?: string;
        status?: string;
        error?: { message?: string; code?: number };
      };
      if (j.status_code === "FINISHED") return { ok: true };
      if (j.status_code === "ERROR" || j.status_code === "EXPIRED") {
        return { ok: false, error: j.status ?? `画像の処理に失敗しました（${j.status_code}）。` };
      }
      // IN_PROGRESS (or unknown) — wait and retry with light backoff.
    } catch {
      /* transient — retry */
    }
    await sleep(1200 + i * 300);
  }
  return { ok: false, error: "画像の処理がタイムアウトしました。もう一度お試しください。" };
}

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

    // 1) create media container
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
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!created.id) {
      return NextResponse.json(
        { ok: false, error: fmtErr(created.error, "メディア作成に失敗しました。") },
        { status: 200 }
      );
    }

    // 1.5) wait for the container to finish processing.
    // Publishing before the container is FINISHED returns
    // "Media ID is not available", so poll status_code first.
    const ready = await waitForContainer(created.id, token);
    if (!ready.ok) {
      return NextResponse.json(
        { ok: false, error: ready.error ?? "画像の処理が完了しませんでした。少し待って再試行してください。" },
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
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message?: string; code?: number };
    };
    if (!published.id) {
      return NextResponse.json(
        { ok: false, error: fmtErr(published.error, "公開に失敗しました。") },
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
