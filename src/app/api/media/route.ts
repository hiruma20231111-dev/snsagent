import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/media
// Reads the connected account's REAL published posts from
// graph.instagram.com using the OAuth cookie token. This is what makes
// "今すぐ投稿" results actually show up inside the app.
//   GET /me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count
// Only requires the already-granted `instagram_business_basic` scope.

const GRAPH = "https://graph.instagram.com";
const FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count";

export interface IgMedia {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false, posts: [] });

  try {
    const res = await fetch(
      `${GRAPH}/me/media?fields=${FIELDS}&limit=24&access_token=${token}`,
      { cache: "no-store" }
    );
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type?: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        timestamp?: string;
        like_count?: number;
        comments_count?: number;
      }>;
      error?: { message?: string };
    };
    if (json.error) {
      return NextResponse.json({ connected: true, posts: [], error: json.error.message });
    }
    const posts: IgMedia[] = (json.data ?? []).map((m) => ({
      id: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type ?? null,
      // For videos, media_url may be the video; thumbnail_url is the still.
      mediaUrl: m.media_url ?? null,
      thumbnailUrl: m.thumbnail_url ?? null,
      permalink: m.permalink ?? null,
      timestamp: m.timestamp ?? null,
      likeCount: typeof m.like_count === "number" ? m.like_count : null,
      commentsCount: typeof m.comments_count === "number" ? m.comments_count : null,
    }));
    return NextResponse.json({ connected: true, posts });
  } catch (e) {
    return NextResponse.json({ connected: true, posts: [], error: String(e) });
  }
}
