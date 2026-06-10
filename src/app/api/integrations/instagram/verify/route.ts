import { NextResponse } from "next/server";

// POST /api/integrations/instagram/verify
// ------------------------------------------------------------
// Validates a Meta (Instagram Graph API) app's credentials by
// requesting an APP access token via the client_credentials grant.
// This is a pure server-to-server call — the App Secret never
// touches the browser. A success proves the App ID + Secret pair
// is valid; it does NOT grant posting (that needs user OAuth).
//
// Body (optional): { appId, appSecret }
// Falls back to env META_APP_ID / META_APP_SECRET when omitted.
// ------------------------------------------------------------

const GRAPH = "https://graph.facebook.com/v21.0";

export async function POST(req: Request) {
  let body: { appId?: string; appSecret?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const appId = body.appId || process.env.META_APP_ID;
  const appSecret = body.appSecret || process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.json(
      { ok: false, error: "App ID と App Secret を入力してください。" },
      { status: 400 }
    );
  }

  try {
    const url =
      `${GRAPH}/oauth/access_token?client_id=${encodeURIComponent(appId)}` +
      `&client_secret=${encodeURIComponent(appSecret)}&grant_type=client_credentials`;
    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json()) as {
      access_token?: string;
      error?: { message?: string };
    };

    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            data.error?.message ??
            "認証に失敗しました。App ID / App Secret をご確認ください。",
        },
        { status: 200 }
      );
    }

    // Mask the token before returning — never expose the raw secret/token.
    const masked = data.access_token.replace(/\|.*/, "|••••••");
    return NextResponse.json({
      ok: true,
      appId,
      appTokenPreview: masked,
      message: "Instagram(Meta)アプリの認証に成功しました。キーは有効です。",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Facebookへの問い合わせに失敗しました: " + String(e) },
      { status: 200 }
    );
  }
}
