import { NextResponse } from "next/server";

// POST /api/integrations/instagram/verify
// ------------------------------------------------------------
// "Instagram API with Instagram Login" flavor.
// There is no client_credentials grant here, so we validate the
// App ID by asking Instagram's authorize endpoint whether it
// recognises the client: a valid app 302-redirects to the
// authorization screen; an unknown app returns an error.
// (The App Secret can only be checked at token-exchange, which
// requires the user to log in — that happens in the OAuth step.)
//
// Body (optional): { appId }. Falls back to env.
// ------------------------------------------------------------

const IG_AUTHORIZE = "https://www.instagram.com/oauth/authorize";

export async function POST(req: Request) {
  let body: { appId?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty ok */
  }

  const appId =
    body.appId || process.env.INSTAGRAM_APP_ID || process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ ok: false, error: "App ID を入力してください。" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/auth/instagram/callback`;
  const url =
    `${IG_AUTHORIZE}?client_id=${encodeURIComponent(appId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=instagram_business_basic&response_type=code`;

  try {
    const res = await fetch(url, { redirect: "manual", cache: "no-store" });
    const loc = res.headers.get("location") ?? "";
    const recognised =
      (res.status === 302 || res.status === 301) &&
      /instagram\.com\/(oauth\/authorize|accounts\/login)/.test(loc) &&
      !/error/i.test(loc);

    if (recognised) {
      return NextResponse.json({
        ok: true,
        appId,
        message:
          "Instagramアプリを認識しました（App ID有効）。あとはログインで投稿連携が完了します。",
      });
    }
    return NextResponse.json({
      ok: false,
      error:
        "このApp IDがInstagramで認識されませんでした。Instagramアプリの設定をご確認ください。",
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Instagramへの問い合わせに失敗しました: " + String(e) },
      { status: 200 }
    );
  }
}
