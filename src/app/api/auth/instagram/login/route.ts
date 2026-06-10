import { NextResponse } from "next/server";

// GET /api/auth/instagram/login
// Kicks off the Facebook OAuth dialog for Instagram Graph API.
// The user logs in & authorizes; Facebook redirects back to /callback.
// Requires META_APP_ID (and the redirect URI registered in the Meta app).

const OAUTH_DIALOG = "https://www.facebook.com/v21.0/dialog/oauth";
const SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_comments",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
].join(",");

export async function GET(req: Request) {
  const appId = process.env.META_APP_ID;
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  if (!appId) {
    return NextResponse.redirect(
      `${origin}/settings?ig=error&reason=missing_app_id`
    );
  }

  const state = crypto.randomUUID();
  const url =
    `${OAUTH_DIALOG}?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code&state=${state}`;

  const res = NextResponse.redirect(url);
  // CSRF guard — verified on callback.
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
