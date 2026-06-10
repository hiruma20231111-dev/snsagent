import { NextResponse } from "next/server";
import { GBP_SCOPE } from "@/lib/gbp";

// GET /api/auth/google/login
// Sends the user to Google's consent screen for Google Business Profile
// (scope business.manage), requesting offline access so we get a refresh
// token. On approval Google redirects back to /callback with a code.

const AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const settings = `${origin}/settings`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${settings}?gbp=error&reason=missing_client_id`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const state = crypto.randomUUID();
  const url =
    `${AUTHORIZE}?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(GBP_SCOPE)}` +
    `&access_type=offline&prompt=consent&include_granted_scopes=true` +
    `&state=${state}`;

  const res = NextResponse.redirect(url);
  res.cookies.set("gbp_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
