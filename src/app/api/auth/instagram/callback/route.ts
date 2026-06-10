import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/auth/instagram/callback?code=...&state=...
// "Instagram API with Instagram Login" token exchange.
//   1) code  -> short-lived token        POST api.instagram.com/oauth/access_token
//   2) short -> long-lived (60d) token   GET  graph.instagram.com/access_token
// The App Secret is used server-side only; the browser never sees it.

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

  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.redirect(`${settings}?ig=error&reason=missing_keys`);
  }
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  try {
    // 1) code -> short-lived token (form-encoded POST)
    const form = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });
    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    const short = (await shortRes.json()) as {
      access_token?: string;
      user_id?: string | number;
      error_message?: string;
    };
    if (!short.access_token) {
      return NextResponse.redirect(`${settings}?ig=error&reason=token`);
    }

    // 2) short-lived -> long-lived token (~60 days)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` +
        `&client_secret=${appSecret}&access_token=${short.access_token}`,
      { cache: "no-store" }
    );
    const long = (await longRes.json()) as { access_token?: string };
    const token = long.access_token ?? short.access_token;

    const res = NextResponse.redirect(`${settings}?ig=connected`);
    res.cookies.set("ig_user_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 55,
      path: "/",
    });
    if (short.user_id != null) {
      res.cookies.set("ig_user_id", String(short.user_id), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 55,
        path: "/",
      });
    }
    res.cookies.delete("ig_oauth_state");
    return res;
  } catch (e) {
    return NextResponse.redirect(`${settings}?ig=error&reason=${encodeURIComponent(String(e))}`);
  }
}
