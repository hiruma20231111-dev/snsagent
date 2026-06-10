import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/auth/instagram/callback?code=...&state=...
// Exchanges the OAuth code for a long-lived user access token using
// the App Secret (server-side only), then stores it in an httpOnly
// cookie. The browser never sees the secret or the raw token.

const GRAPH = "https://graph.facebook.com/v21.0";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settings = `${origin}/settings`;

  const jar = await cookies();
  const expectedState = jar.get("ig_oauth_state")?.value;

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${settings}?ig=error&reason=denied`);
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${settings}?ig=error&reason=state`);
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${settings}?ig=error&reason=missing_keys`);
  }

  const redirectUri = `${origin}/api/auth/instagram/callback`;

  try {
    // 1) code -> short-lived user token
    const tokRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code=${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );
    const tok = (await tokRes.json()) as { access_token?: string; error?: { message?: string } };
    if (!tok.access_token) {
      return NextResponse.redirect(`${settings}?ig=error&reason=token`);
    }

    // 2) short-lived -> long-lived token (~60 days)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
        `&client_id=${appId}&client_secret=${appSecret}` +
        `&fb_exchange_token=${tok.access_token}`,
      { cache: "no-store" }
    );
    const long = (await longRes.json()) as { access_token?: string };
    const token = long.access_token ?? tok.access_token;

    const res = NextResponse.redirect(`${settings}?ig=connected`);
    res.cookies.set("ig_user_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 55,
      path: "/",
    });
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    return NextResponse.redirect(`${settings}?ig=error&reason=${encodeURIComponent(String(e))}`);
  }
}
