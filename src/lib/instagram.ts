// ============================================================
// instagram.ts — server-side Instagram publishing (shared)
// ============================================================
// Used by both the interactive route (/api/publish/instagram) and the
// cron job (/api/cron/publish). Implements the "Instagram API with
// Instagram Login" content-publishing flow:
//   1) create media container   POST graph.instagram.com/{ig-id}/media
//   2) poll until FINISHED       GET  graph.instagram.com/{creation-id}
//   3) publish                   POST graph.instagram.com/{ig-id}/media_publish

const GRAPH = "https://graph.instagram.com";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmtErr(err: { message?: string; code?: number } | undefined, fallback: string): string {
  if (!err) return fallback;
  const msg = err.message ?? fallback;
  return typeof err.code === "number" ? `${msg}（code ${err.code}）` : msg;
}

/** Resolve the IG user id that owns a token. */
export async function resolveIgUserId(token: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH}/me?fields=user_id,username&access_token=${token}`, {
      cache: "no-store",
    });
    const me = (await res.json()) as { user_id?: string; id?: string };
    return me.user_id ?? me.id ?? null;
  } catch {
    return null;
  }
}

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
      };
      if (j.status_code === "FINISHED") return { ok: true };
      if (j.status_code === "ERROR" || j.status_code === "EXPIRED") {
        return { ok: false, error: j.status ?? `画像の処理に失敗しました（${j.status_code}）。` };
      }
    } catch {
      /* transient — retry */
    }
    await sleep(1200 + i * 300);
  }
  return { ok: false, error: "画像の処理がタイムアウトしました。" };
}

export interface PublishResult {
  ok: boolean;
  mediaId?: string;
  isStory?: boolean;
  error?: string;
}

/**
 * Publish a single image to Instagram. `format === "story"` posts to Stories
 * (caption ignored by IG); anything else is a feed image post with caption.
 */
export async function publishToInstagram(opts: {
  token: string;
  imageUrl: string;
  caption?: string;
  format?: string;
  igUserId?: string;
}): Promise<PublishResult> {
  const { token, imageUrl, caption = "", format } = opts;
  const isStory = format === "story";

  const igId = opts.igUserId ?? (await resolveIgUserId(token));
  if (!igId) return { ok: false, error: "アカウント情報を取得できませんでした。" };

  try {
    // 1) create media container
    const createParams = new URLSearchParams({ image_url: imageUrl, access_token: token });
    if (isStory) createParams.set("media_type", "STORIES");
    else createParams.set("caption", caption);

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
      return { ok: false, error: fmtErr(created.error, "メディア作成に失敗しました。") };
    }

    // 2) wait until the container is processed
    const ready = await waitForContainer(created.id, token);
    if (!ready.ok) return { ok: false, error: ready.error ?? "画像の処理が完了しませんでした。" };

    // 3) publish
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
      return { ok: false, error: fmtErr(published.error, "公開に失敗しました。") };
    }
    return { ok: true, mediaId: published.id, isStory };
  } catch (e) {
    return { ok: false, error: "Instagram投稿に失敗しました: " + String(e) };
  }
}

/**
 * Refresh a long-lived token (extends ~60 days). Only valid for tokens at
 * least 24h old. Returns the new token + seconds-until-expiry, or null.
 */
export async function refreshLongLivedToken(
  token: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const res = await fetch(
      `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
      { cache: "no-store" }
    );
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!j.access_token) return null;
    return { accessToken: j.access_token, expiresIn: j.expires_in ?? 60 * 60 * 24 * 60 };
  } catch {
    return null;
  }
}
