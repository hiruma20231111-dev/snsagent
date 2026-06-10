import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// GET /api/auth/google/callback?code=...&state=...
// Exchanges the authorization code for tokens. The refresh token (long-lived)
// is what lets us keep posting without re-login; the access token is short.
// Both are stored in httpOnly cookies; the client secret stays server-side.

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const settings = `${origin}/settings`;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expectedState = jar.get("gbp_oauth_state")?.value;

  if (url.searchParams.get("error")) {
    return NextResponse.redirect(`${settings}?gbp=error&reason=denied`);
  }
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(`${settings}?gbp=error&reason=state`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settings}?gbp=error&reason=missing_keys`);
  }
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }).toString(),
      cache: "no-store",
    });
    const tok = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };
    if (!tok.access_token && !tok.refresh_token) {
      return NextResponse.redirect(
        `${settings}?gbp=error&reason=${encodeURIComponent(tok.error || "token")}`
      );
    }

    const res = NextResponse.redirect(`${settings}?gbp=connected`);
    if (tok.refresh_token) {
      res.cookies.set("gbp_refresh_token", tok.refresh_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 180, // ~180 days
        path: "/",
      });
    }
    if (tok.access_token) {
      res.cookies.set("gbp_access_token", tok.access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: tok.expires_in ?? 3600,
        path: "/",
      });
    }
    res.cookies.delete("gbp_oauth_state");
    return res;
  } catch (e) {
    return NextResponse.redirect(`${settings}?gbp=error&reason=${encodeURIComponent(String(e))}`);
  }
}
