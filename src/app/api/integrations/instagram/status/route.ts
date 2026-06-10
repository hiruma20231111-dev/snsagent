import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/integrations/instagram/status
// "Instagram API with Instagram Login": resolve the connected account
// from the httpOnly token via graph.instagram.com/me.

export async function GET() {
  const jar = await cookies();
  const token = jar.get("ig_user_token")?.value;
  if (!token) return NextResponse.json({ connected: false });

  try {
    const meRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,account_type&access_token=${token}`,
      { cache: "no-store" }
    );
    const me = (await meRes.json()) as {
      username?: string;
      account_type?: string;
      error?: { message?: string };
    };
    if (me.error) {
      return NextResponse.json({ connected: true, account: null, warning: me.error.message });
    }
    return NextResponse.json({
      connected: true,
      account: me.username ? { username: me.username, accountType: me.account_type } : null,
    });
  } catch (e) {
    return NextResponse.json({ connected: true, account: null, warning: String(e) });
  }
}
