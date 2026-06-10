import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/insights
// Pulls REAL stats for the connected Instagram account from
// graph.instagram.com using the OAuth cookie token:
//   - account fields: followers / follows / media count (reliable)
//   - account insights: reach over the last 7 days (best-effort;
//     small/new accounts may not have insight data yet)

const GRAPH = "https://graph.instagram.com";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false });

  try {
    const meRes = await fetch(
      `${GRAPH}/me?fields=user_id,username,account_type,followers_count,follows_count,media_count&access_token=${token}`,
      { cache: "no-store" }
    );
    const me = (await meRes.json()) as {
      user_id?: string;
      username?: string;
      account_type?: string;
      followers_count?: number;
      follows_count?: number;
      media_count?: number;
      error?: { message?: string };
    };
    if (me.error) {
      return NextResponse.json({ connected: true, error: me.error.message });
    }

    const result: Record<string, unknown> = {
      connected: true,
      username: me.username ?? null,
      accountType: me.account_type ?? null,
      followersCount: me.followers_count ?? null,
      followsCount: me.follows_count ?? null,
      mediaCount: me.media_count ?? null,
      reach7d: null as number | null,
      insightsAvailable: false,
    };

    // Best-effort insights (reach, last 7 days).
    try {
      const igId = me.user_id;
      if (igId) {
        const until = Math.floor(Date.now() / 1000);
        const since = until - 7 * 86400;
        const insRes = await fetch(
          `${GRAPH}/${igId}/insights?metric=reach&period=day&metric_type=total_value` +
            `&since=${since}&until=${until}&access_token=${token}`,
          { cache: "no-store" }
        );
        const ins = (await insRes.json()) as {
          data?: { name: string; total_value?: { value?: number } }[];
          error?: { message?: string };
        };
        const reach = ins.data?.find((d) => d.name === "reach")?.total_value?.value;
        if (typeof reach === "number") {
          result.reach7d = reach;
          result.insightsAvailable = true;
        }
      }
    } catch {
      /* insights are optional */
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ connected: true, error: String(e) });
  }
}
