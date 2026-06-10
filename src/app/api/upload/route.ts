import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

// POST /api/upload  { dataUrl: "data:image/...;base64,..." }
// Stores an image in Vercel Blob and returns its PUBLIC url — required
// because Instagram's publishing API only accepts publicly reachable
// image URLs (not data URLs). Needs BLOB_READ_WRITE_TOKEN (auto-injected
// once the Blob store is connected to the project).
export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "画像ストレージ未接続です。Vercelでblobストア『lumina-media』をプロジェクトに接続してください。",
      },
      { status: 503 }
    );
  }

  let body: { dataUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  if (!body.dataUrl?.startsWith("data:")) {
    return NextResponse.json({ ok: false, error: "画像データがありません。" }, { status: 400 });
  }

  try {
    const [meta, b64] = body.dataUrl.split(",");
    const mime = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
    const ext = mime.split("/")[1] ?? "jpg";
    const buffer = Buffer.from(b64, "base64");
    const blob = await put(`posts/${Date.now()}.${ext}`, buffer, {
      access: "public",
      contentType: mime,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "アップロードに失敗しました: " + String(e) },
      { status: 500 }
    );
  }
}
