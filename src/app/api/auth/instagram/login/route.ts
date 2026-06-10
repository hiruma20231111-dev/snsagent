import { NextResponse } from "next/server";

// GET /api/auth/instagram/login
// "Instagram API with Instagram Login" — sends the user to Instagram's
// own authorization screen (no Facebook Page required). On approval,
// Instagram redirects back to /callback with a code.

const IG_AUTHORIZE = "https://www.instagram.com/oauth/authorize";
const SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_insights",
].join(",");

export async function GET(req: Request) {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  if (!appId) {
    return NextResponse.redirect(`${origin}/settings?ig=error&reason=missing_app_id`);
  }

  const state = crypto.randomUUID();
  const url =
    `${IG_AUTHORIZE}?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&response_type=code&state=${state}`;

  const res = NextResponse.redirect(url);
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
