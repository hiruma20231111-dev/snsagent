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
// The photo now FILLS the 9:16 frame edge-to-edge (cover) — no letterbox
// bars, no "split" look. Each text layer is positioned freely (normalized
// x/y) and sized independently, matching the drag-and-resize editor in the
// composer. Output is a 1080x1920 (9:16) JPEG data URL.

import type { StoryElement, StoryElementId } from "./types";

export type { StoryElement, StoryElementId };

// Instagram Story canvas.
export const STORY_CANVAS = { W: 1080, H: 1920 } as const;
const { W, H } = STORY_CANVAS;
const PANEL_PAD = 26; // padding of the legibility panel around each layer

export const STORY_FONT_FAMILY =
  '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,sans-serif';

// Per-layer font weight + default size (as a fraction of canvas height).
export const STORY_ELEMENT_META: Record<
  StoryElementId,
  { weight: number; size: number; label: string }
> = {
  title: { weight: 800, size: 0.054, label: "見出し" },
  subtitle: { weight: 600, size: 0.034, label: "サブ" },
  caption: { weight: 500, size: 0.024, label: "キャプション" },
  hashtags: { weight: 600, size: 0.022, label: "ハッシュタグ" },
};

/** Build the default set of Story layers from the editable text fields. */
export function defaultStoryElements(opts: {
  title?: string;
  subtitle?: string;
  caption?: string;
  hashtags?: string[];
  color?: string;
}): StoryElement[] {
  const color = opts.color ?? "#ffffff";
  return [
    {
      id: "title",
      text: opts.title ?? "",
      x: 0.5,
      y: 0.6,
      size: STORY_ELEMENT_META.title.size,
      color,
      enabled: !!opts.title?.trim(),
    },
    {
      id: "subtitle",
      text: opts.subtitle ?? "",
      x: 0.5,
      y: 0.69,
      size: STORY_ELEMENT_META.subtitle.size,
      color,
      enabled: !!opts.subtitle?.trim(),
    },
    {
      id: "caption",
      text: opts.caption ?? "",
      x: 0.5,
      y: 0.8,
      size: STORY_ELEMENT_META.caption.size,
      color,
      enabled: false,
    },
    {
      id: "hashtags",
      text: (opts.hashtags ?? []).join(" "),
      x: 0.5,
      y: 0.9,
      size: STORY_ELEMENT_META.hashtags.size,
      color,
      enabled: false,
    },
  ];
}

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
  h: number
) {
  const s = Math.max(w / img.width, h / img.height);
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

/** Relative luminance (0=black .. 1=white) of a #rrggbb / #rgb color. */
function luminance(hex: string): number {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export interface ComposeStoryOpts {
  /** Source photo (data URL or same-origin/CORS-enabled URL). */
  photo: string;
  /** Free-positioned text layers. */
  elements: StoryElement[];
  /** Optional: output longest side cap (used for small calendar thumbnails). */
  maxDim?: number;
  quality?: number;
}

/**
 * Compose a 1080x1920 Instagram Story image: the photo fills the frame
 * (cover) and every enabled text layer is burned in at its own position
 * and size. Returns a JPEG data URL ready to hand to /api/upload.
 */
export async function composeStoryImage(opts: ComposeStoryOpts): Promise<string> {
  const { photo, elements, maxDim, quality = 0.92 } = opts;
  const img = await loadImage(photo);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvasを初期化できませんでした");

  // 1) Photo fills the whole frame edge-to-edge (no bars / no split look).
  drawCover(ctx, img, W, H);

  // 2) Each enabled text layer, burned in at its normalized position/size.
  const maxTextW = W * 0.86;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (const el of elements) {
    const text = el.text?.trim();
    if (!el.enabled || !text) continue;

    const meta = STORY_ELEMENT_META[el.id];
    const fontPx = Math.max(16, el.size * H);
    const lh = fontPx * 1.25;
    ctx.font = `${meta.weight} ${fontPx}px ${STORY_FONT_FAMILY}`;
    const lines = wrapText(ctx, text, maxTextW);

    let lineW = 0;
    for (const l of lines) lineW = Math.max(lineW, ctx.measureText(l).width);
    const blockH = lines.length * lh;

    const cx = el.x * W;
    const cy = el.y * H;
    const top = cy - blockH / 2;

    // legibility panel — dark behind light text, light behind dark text
    const lightText = luminance(el.color) > 0.55;
    const panelW = Math.min(lineW + PANEL_PAD * 2, W - 24);
    const panelH = blockH + PANEL_PAD * 1.4;
    const panelX = Math.min(Math.max(cx - panelW / 2, 12), W - panelW - 12);
    const panelY = top - PANEL_PAD * 0.7;
    ctx.fillStyle = lightText ? "rgba(0,0,0,0.34)" : "rgba(255,255,255,0.42)";
    roundRectPath(ctx, panelX, panelY, panelW, panelH, 24);
    ctx.fill();

    // text
    ctx.fillStyle = el.color;
    ctx.shadowColor = lightText ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.18)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    let y = top;
    for (const line of lines) {
      ctx.fillText(line, cx, y);
      y += lh;
    }
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  }

  // Optional downscale for lightweight thumbnails.
  if (maxDim && maxDim < W) {
    const scale = maxDim / H; // H is the longest side (9:16)
    const out = document.createElement("canvas");
    out.width = Math.round(W * scale);
    out.height = Math.round(H * scale);
    const octx = out.getContext("2d");
    if (octx) {
      octx.drawImage(canvas, 0, 0, out.width, out.height);
      return out.toDataURL("image/jpeg", quality);
    }
  }

  return canvas.toDataURL("image/jpeg", quality);
}
