import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/dm
// Reads REAL Instagram Direct messages for the connected account via the
// Instagram Messaging API (Instagram API with Instagram Login):
//   1) GET /me/conversations?platform=instagram   (conversation list)
//   2) GET /{conversation-id}?fields=messages{...} (messages per thread)
//
// Requires the `instagram_business_manage_messages` scope AND the account's
// "メッセージへのアクセスを許可 (Allow access to messages)" toggle enabled in
// the Instagram app. If the scope isn't granted yet, Graph returns an error
// and we surface a friendly hint instead of breaking the inbox.

const GRAPH = "https://graph.instagram.com";
const CONV_LIMIT = 20;

interface ConversationOut {
  id: string;
  companyId: string;
  channel: "instagram";
  kind: "dm";
  user: string;
  avatar: string;
  lastMessage: string;
  unread: boolean;
  autoReplied: boolean;
  at: string;
  thread: { from: "them" | "us"; text: string; auto?: boolean; at: string }[];
}

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false, conversations: [] });

  try {
    // Resolve our own IG user id (to tell "us" from "them").
    let myId = jar.get("ig_user_id")?.value ?? "";
    if (!myId) {
      const meRes = await fetch(`${GRAPH}/me?fields=user_id&access_token=${token}`, {
        cache: "no-store",
      });
      const me = (await meRes.json()) as { user_id?: string; id?: string };
      myId = me.user_id ?? me.id ?? "";
    }

    // 1) conversation list (Instagram-Login API: graph.instagram.com, no
    //    `platform` param — that param is for the Facebook-Page messaging API)
    const convRes = await fetch(
      `${GRAPH}/me/conversations?fields=id,updated_time&limit=${CONV_LIMIT}&access_token=${token}`,
      { cache: "no-store" }
    );
    const convJson = (await convRes.json()) as {
      data?: Array<{ id: string; updated_time?: string }>;
      error?: { message?: string; code?: number };
    };
    if (convJson.error) {
      // Most common: scope not granted yet, or messages access not enabled.
      return NextResponse.json({
        connected: true,
        conversations: [],
        error: convJson.error.message,
        needsSetup: true,
      });
    }

    const convs = convJson.data ?? [];

    // 2) messages per conversation (in parallel)
    const threads = await Promise.all(
      convs.map(async (cv) => {
        try {
          const mRes = await fetch(
            `${GRAPH}/${cv.id}?fields=messages.limit(25){id,from,message,created_time}&access_token=${token}`,
            { cache: "no-store" }
          );
          const mJson = (await mRes.json()) as {
            messages?: {
              data?: Array<{
                id: string;
                message?: string;
                created_time?: string;
                from?: { id?: string; username?: string };
              }>;
            };
          };
          return { cv, msgs: mJson.messages?.data ?? [] };
        } catch {
          return { cv, msgs: [] as Array<{ id: string; message?: string; created_time?: string; from?: { id?: string; username?: string } }> };
        }
      })
    );

    const conversations: ConversationOut[] = [];
    for (const { cv, msgs } of threads) {
      if (!msgs.length) continue;
      // Graph returns newest-first; render oldest-first.
      const ordered = [...msgs].reverse();
      const them = ordered.find((m) => m.from?.id && m.from.id !== myId)?.from;
      const last = ordered[ordered.length - 1];
      conversations.push({
        id: `dm_${cv.id}`,
        companyId: "cmp_pinkdolphin",
        channel: "instagram",
        kind: "dm",
        user: them?.username ? `@${them.username}` : "Instagramユーザー",
        avatar: "✉️",
        lastMessage: last?.message ?? "",
        unread: last?.from?.id !== myId, // last message from them = unread
        autoReplied: false,
        at: cv.updated_time ?? last?.created_time ?? new Date().toISOString(),
        thread: ordered.map((m) => ({
          from: m.from?.id === myId ? ("us" as const) : ("them" as const),
          text: m.message ?? "",
          at: m.created_time ?? new Date().toISOString(),
        })),
      });
    }

    conversations.sort((a, b) => (a.at < b.at ? 1 : -1));
    return NextResponse.json({ connected: true, conversations });
  } catch (e) {
    return NextResponse.json({ connected: true, conversations: [], error: String(e) });
  }
}
