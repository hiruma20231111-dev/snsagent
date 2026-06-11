import { NextResponse } from "next/server";
import { listPosts, updatePost, getIgToken, saveIgToken } from "@/lib/server-store";
import { publishToInstagram, refreshLongLivedToken, resolveIgUserId } from "@/lib/instagram";
import { planAutopilot } from "@/lib/autopilot";

// node:crypto (token decryption) + enough wall-clock for container polling.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_PER_RUN = 5;
const REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24 * 10; // refresh if <10d left

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // no secret set → allow (e.g. local/dev)
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true; // Vercel Cron sends this
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret; // external pinger fallback
}

async function run(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // 0) Autopilot: top up the upcoming queue from the photo bank (persona-timed).
  let planned = { created: 0 } as { created: number; reason?: string };
  try {
    planned = await planAutopilot();
  } catch {
    /* planning is best-effort; never block publishing */
  }

  // 1) Token (persisted by the OAuth callback). Without it, cron can't post.
  let tok = await getIgToken();
  if (!tok?.accessToken) {
    return NextResponse.json({
      ok: false,
      error: "保存済みのInstagramトークンがありません。設定から再ログインしてください。",
      processed: 0,
      planned: planned.created,
    });
  }

  // 2) Refresh if close to expiry (long-lived tokens must be ≥24h old).
  if (tok.expiresAt && new Date(tok.expiresAt).getTime() - Date.now() < REFRESH_WINDOW_MS) {
    const r = await refreshLongLivedToken(tok.accessToken);
    if (r) {
      tok = {
        ...tok,
        accessToken: r.accessToken,
        expiresAt: new Date(Date.now() + r.expiresIn * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveIgToken(tok);
    }
  }

  const igUserId = tok.userId ?? (await resolveIgUserId(tok.accessToken)) ?? undefined;

  // 3) Find due posts.
  const now = Date.now();
  const all = await listPosts();
  const due = all
    .filter((p) => p.status === "scheduled" && new Date(p.scheduledAt).getTime() <= now)
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
    .slice(0, MAX_PER_RUN);

  const results: { id: string; status: string; error?: string }[] = [];

  for (const post of due) {
    // claim to avoid a double-post on overlapping runs
    await updatePost(post.id, { status: "publishing" });

    if (!post.channels.includes("instagram")) {
      // GBP-only: auto-posting awaits Business Profile API allowlisting.
      await updatePost(post.id, {
        status: "skipped",
        error: "GBP自動投稿はAPI利用承認待ちのためスキップしました。",
      });
      results.push({ id: post.id, status: "skipped" });
      continue;
    }

    const pub = await publishToInstagram({
      token: tok.accessToken,
      imageUrl: post.imageUrl,
      caption: post.caption,
      format: post.format,
      igUserId,
    });

    if (pub.ok) {
      await updatePost(post.id, { status: "published", igMediaId: pub.mediaId, error: undefined });
      results.push({ id: post.id, status: "published" });
    } else {
      await updatePost(post.id, { status: "failed", error: pub.error });
      results.push({ id: post.id, status: "failed", error: pub.error });
    }
  }

  return NextResponse.json({
    ok: true,
    now: new Date(now).toISOString(),
    planned: planned.created,
    processed: due.length,
    published: results.filter((r) => r.status === "published").length,
    failed: results.filter((r) => r.status === "failed").length,
    results,
  });
}

export async function GET(req: Request) {
  return run(req);
}
export async function POST(req: Request) {
  return run(req);
}
