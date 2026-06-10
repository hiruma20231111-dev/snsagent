import { NextResponse } from "next/server";

// POST /api/banner
// Stand-in for an external banner-compositing API (e.g. Bannerbear).
// Real flow: pick a designer-made template, inject the AI text + the
// user's photo, let the service handle Auto-fit so text never overflows.
// Here we compute an Auto-fit font size and echo a layout the client
// can render on a <canvas>/CSS, proving the contract end-to-end.

interface BannerRequest {
  templateId?: string;
  title?: string;
  subtitle?: string;
  banner?: string; // gradient stand-in for the photo
}

function autoFit(text: string, max = 1100, base = 64, min = 30) {
  // Shrink headline until it fits the template's text box width.
  const approxCharW = 0.62;
  let size = base;
  while (text.length * size * approxCharW > max && size > min) size -= 2;
  return size;
}

export async function POST(req: Request) {
  let body: BannerRequest = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const title = (body.title ?? "タイトル").slice(0, 40);
  const subtitle = (body.subtitle ?? "").slice(0, 60);

  return NextResponse.json({
    ok: true,
    service: process.env.BANNERBEAR_API_KEY ? "bannerbear" : "mock-composer",
    layout: {
      templateId: body.templateId ?? "tpl_minimal",
      width: 1080,
      height: 1080,
      background: body.banner ?? "linear-gradient(135deg,#ff7a45,#ff2e74)",
      title: { text: title, fontSize: autoFit(title), overflow: "auto-fit" },
      subtitle: { text: subtitle, fontSize: autoFit(subtitle, 1100, 40, 22) },
    },
  });
}
