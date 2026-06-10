// ============================================================
// story-image.ts — client-side Instagram Story compositor
// ============================================================
// The Instagram Content Publishing API CANNOT add text / stickers to a
// Story — `media_type=STORIES` only accepts a plain image URL and ignores
// captions. So the only way to "put text on a Story" is to BURN the text
// into the image before uploading. We do that here, in the browser, on a
// <canvas>, so that:
//   1) the preview the user sees IS the published image (WYSIWYG), and
//   2) Japanese text renders with the device's own fonts (no server-side
//      font bundling, which is fragile on serverless).
//
// Output is a 1080x1920 (9:16) JPEG data URL — Instagram's Story canvas.

export type StoryTextPos = "top" | "center" | "bottom";

export interface ComposeStoryOpts {
  /** Source photo (data URL or same-origin/CORS-enabled URL). */
  photo: string;
  title?: string;
  subtitle?: string;
  /** Vertical placement of the text block within the safe area. */
  position?: StoryTextPos;
}

// Instagram Story canvas + the UI-reserved "safe zones" (top profile row /
// bottom reply bar). Keep text out of these so it isn't covered.
const W = 1080;
const H = 1920;
const SAFE_TOP = 250;
const SAFE_BOTTOM = 250;
const PAD = 90; // horizontal text inset
const PANEL_PAD = 34; // padding of the legibility panel around the text
const FONT_FAMILY =
  '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/** Draw an image so it fully COVERS w×h (cropping overflow), centered. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  boost = 1
) {
  const s = Math.max(w / img.width, h / img.height) * boost;
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Draw an image so it fully fits inside w×h (letterboxed), centered. */
function drawContain(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
) {
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Wrap text to a max pixel width. Breaks per character (CJK-safe). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of Array.from(para)) {
      const test = line + ch;
      if (line !== "" && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = ch === " " ? "" : ch;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

/** Shrink the font until the text fits maxLines, then clamp + ellipsize. */
function layoutText(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  maxWidth: number,
  startSize: number,
  minSize: number,
  maxLines: number
): { size: number; lines: string[] } {
  let size = startSize;
  let lines: string[] = [];
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
    lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) break;
    size -= 3;
  }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length > 1 ? last.slice(0, -1) + "…" : "…";
  }
  return { size, lines };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Compose a 1080x1920 Instagram Story image with the photo and burned-in
 * text. Returns a JPEG data URL ready to hand to /api/upload.
 */
export async function composeStoryImage(opts: ComposeStoryOpts): Promise<string> {
  const { photo, title = "", subtitle = "", position = "bottom" } = opts;
  const img = await loadImage(photo);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを初期化できませんでした");

  // 1) Background: a blurred, darkened cover of the photo fills the frame
  //    edge-to-edge (no letterbox bars), looks native to Stories.
  ctx.save();
  ctx.filter = "blur(36px) brightness(0.5)";
  drawCover(ctx, img, W, H, 1.12);
  ctx.restore();

  // 2) Foreground: the full photo, contained so nothing important is cropped.
  drawContain(ctx, img, W, H);

  // 3) Text block (burned in). Skip entirely if there's nothing to show.
  const hasTitle = title.trim() !== "";
  const hasSub = subtitle.trim() !== "";
  if (hasTitle || hasSub) {
    const maxTextW = W - PAD * 2;

    const titleLayout = hasTitle
      ? layoutText(ctx, title.trim(), 800, maxTextW, 78, 46, 4)
      : { size: 0, lines: [] as string[] };
    const subLayout = hasSub
      ? layoutText(ctx, subtitle.trim(), 600, maxTextW, 44, 30, 3)
      : { size: 0, lines: [] as string[] };

    const titleLH = titleLayout.size * 1.2;
    const subLH = subLayout.size * 1.28;
    const gap = hasTitle && hasSub ? 22 : 0;
    const titleH = titleLayout.lines.length * titleLH;
    const subH = subLayout.lines.length * subLH;
    const blockH = titleH + (hasSub ? gap + subH : 0);

    // widest line → panel width
    let maxLineW = 0;
    ctx.font = `800 ${titleLayout.size}px ${FONT_FAMILY}`;
    for (const l of titleLayout.lines) maxLineW = Math.max(maxLineW, ctx.measureText(l).width);
    ctx.font = `600 ${subLayout.size}px ${FONT_FAMILY}`;
    for (const l of subLayout.lines) maxLineW = Math.max(maxLineW, ctx.measureText(l).width);

    const usableTop = SAFE_TOP;
    const usableBottom = H - SAFE_BOTTOM;
    let blockTop: number;
    if (position === "top") blockTop = usableTop + 24;
    else if (position === "center") blockTop = (H - blockH) / 2;
    else blockTop = usableBottom - blockH - 8;

    // legibility panel behind the text
    const panelW = Math.min(maxLineW + PANEL_PAD * 2, W - 56);
    const panelX = (W - panelW) / 2;
    const panelY = blockTop - PANEL_PAD;
    const panelH = blockH + PANEL_PAD * 2;
    ctx.fillStyle = "rgba(0,0,0,0.34)";
    roundRectPath(ctx, panelX, panelY, panelW, panelH, 30);
    ctx.fill();

    // text
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;

    let y = blockTop;
    if (hasTitle) {
      ctx.font = `800 ${titleLayout.size}px ${FONT_FAMILY}`;
      for (const line of titleLayout.lines) {
        ctx.fillText(line, W / 2, y);
        y += titleLH;
      }
    }
    if (hasSub) {
      y += gap;
      ctx.font = `600 ${subLayout.size}px ${FONT_FAMILY}`;
      for (const line of subLayout.lines) {
        ctx.fillText(line, W / 2, y);
        y += subLH;
      }
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}
