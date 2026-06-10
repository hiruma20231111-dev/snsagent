import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/inbox
// Aggregates REAL comments on the connected account's recent media into
// the conversation shape the 受信ボックス renders. Uses the already-granted
// `instagram_business_manage_comments` scope (no extra Meta review).
//
// Flow:
//   1) GET /me/media (recent post ids + permalink)
//   2) for each recent media: GET /{media-id}/comments
//   3) map each comment to a Conversation (kind: "comment")
//
// NOTE: DMs require `instagram_business_manage_messages` + Meta App Review +
// a webhook, which is STEP2. This endpoint covers comments only.

const GRAPH = "https://graph.instagram.com";
const MEDIA_SCAN_LIMIT = 12; // how many recent posts to scan for comments

interface ConversationOut {
  id: string;
  companyId: string;
  channel: "instagram";
  kind: "comment";
  user: string;
  avatar: string;
  lastMessage: string;
  unread: boolean;
  autoReplied: boolean;
  at: string;
  permalink: string | null;
  thread: { from: "them" | "us"; text: string; auto?: boolean; at: string }[];
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false, conversations: [] });

  try {
    // 1) recent media
    const mediaRes = await fetch(
      `${GRAPH}/me/media?fields=id,caption,permalink&limit=${MEDIA_SCAN_LIMIT}&access_token=${token}`,
      { cache: "no-store" }
    );
    const mediaJson = (await mediaRes.json()) as {
      data?: Array<{ id: string; caption?: string; permalink?: string }>;
      error?: { message?: string };
    };
    if (mediaJson.error) {
      return NextResponse.json({
        connected: true,
        conversations: [],
        error: mediaJson.error.message,
      });
    }

    const media = mediaJson.data ?? [];

    // 2) comments per media (in parallel)
    const perMedia = await Promise.all(
      media.map(async (m) => {
        try {
          const cRes = await fetch(
            `${GRAPH}/${m.id}/comments?fields=id,text,username,timestamp&access_token=${token}`,
            { cache: "no-store" }
          );
          const cJson = (await cRes.json()) as {
            data?: Array<{ id: string; text?: string; username?: string; timestamp?: string }>;
          };
          return { media: m, comments: cJson.data ?? [] };
        } catch {
          return { media: m, comments: [] as Array<{ id: string; text?: string; username?: string; timestamp?: string }> };
        }
      })
    );

    // 3) map to conversations
    const conversations: ConversationOut[] = [];
    for (const { media: m, comments } of perMedia) {
      for (const c of comments) {
        const text = c.text ?? "";
        conversations.push({
          id: `cmt_${c.id}`,
          companyId: "cmp_pinkdolphin",
          channel: "instagram",
          kind: "comment",
          user: c.username ? `@${c.username}` : "Instagramユーザー",
          avatar: "💬",
          lastMessage: text,
          unread: true,
          autoReplied: false,
          at: c.timestamp ?? new Date().toISOString(),
          permalink: m.permalink ?? null,
          thread: [{ from: "them", text, at: c.timestamp ?? new Date().toISOString() }],
        });
      }
    }

    // newest first
    conversations.sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json({ connected: true, conversations });
  } catch (e) {
    return NextResponse.json({ connected: true, conversations: [], error: String(e) });
  }
}
