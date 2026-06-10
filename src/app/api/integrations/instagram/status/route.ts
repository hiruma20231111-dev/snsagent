import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/integrations/instagram/status
// Reports whether a user has completed the Facebook/Instagram OAuth.
// Reads the httpOnly token cookie server-side and resolves the linked
// Instagram business account (id + username) for display.

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false });

  try {
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?fields=name,instagram_business_account{username,id}&access_token=${token}`,
      { cache: "no-store" }
    );
    const pages = (await pagesRes.json()) as {
      data?: { name: string; instagram_business_account?: { id: string; username: string } }[];
      error?: { message?: string };
    };
    if (pages.error) {
      return NextResponse.json({ connected: true, account: null, warning: pages.error.message });
    }
    const linked = pages.data?.find((p) => p.instagram_business_account);
    return NextResponse.json({
      connected: true,
      page: linked?.name ?? null,
      account: linked?.instagram_business_account ?? null,
    });
  } catch (e) {
    return NextResponse.json({ connected: true, account: null, warning: String(e) });
  }
}
