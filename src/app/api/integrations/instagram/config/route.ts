import { NextResponse } from "next/server";

// GET /api/integrations/instagram/config
// Reports whether the server holds the Instagram app credentials
// (set as encrypted env vars). Never returns the secret — only a
// masked App ID tail for display. There is no way to pre-validate
// Instagram-Login credentials without a real user login, so we only
// report "configured", not "valid".

export async function GET() {
  const appId = process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID || "";
  const hasSecret = !!(process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET);
  const configured = !!appId && hasSecret;
  return NextResponse.json({
    configured,
    appIdTail: appId ? appId.slice(-4) : null,
  });
}
