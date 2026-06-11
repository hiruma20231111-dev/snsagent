// ============================================================
// image.ts — tiny client-side helpers for shrinking data URLs
// ============================================================
// Scheduled posts persist to localStorage. Full-resolution photos and
// 1080x1920 Story composites would blow the ~5MB quota fast, so we keep
// a downscaled copy for the source photo and an even smaller one for the
// calendar thumbnail.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
    img.src = src;
  });
}

/**
 * Re-encode a data URL so its longest side is at most `maxDim` px.
 * Returns a JPEG data URL. Falls back to the original on any failure.
 */
export async function downscaleDataUrl(
  dataUrl: string,
  maxDim = 900,
  quality = 0.78
): Promise<string> {
  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return dataUrl;
  }
}
