// ============================================================
// AI Adapter pattern
// ------------------------------------------------------------
// The app never talks to a model directly. It talks to this
// interface, so swapping Gemini 1.5 Flash → next model is a
// one-line change. Cost discipline: the AI only *extracts text*
// (caption / headline / hashtags). Image rendering is delegated
// to a banner-compositing service (Bannerbear), never to a
// generative image model.
// ============================================================

import type { AIAnalysis, AIToneId } from "@/lib/types";

export interface AnalyzeInput {
  /** Filename / inferred subject of the uploaded photo. */
  hint?: string;
  tone: AIToneId;
  brandName: string;
}

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  /** Cheap text-only call: looks at the photo, returns copy + layout intent. */
  analyzePhoto(input: AnalyzeInput): Promise<AIAnalysis>;
}

const TONE_FLAVOR: Record<AIToneId, { lead: string; tail: string; emoji: string }> = {
  friendly: { lead: "今日のおすすめ", tail: "ぜひ遊びにきてくださいね！", emoji: "✨" },
  polite: { lead: "本日のご案内", tail: "ご来店を心よりお待ちしております。", emoji: "☕️" },
  energetic: { lead: "きました!!", tail: "見逃したらもったいない🔥 急げ〜！", emoji: "🔥" },
  calm: { lead: "そっと、ひと息。", tail: "穏やかな時間をどうぞ。", emoji: "🌿" },
  luxury: { lead: "特別な一皿を。", tail: "上質なひとときを、あなたに。", emoji: "🥂" },
};

const SUBJECTS = [
  { word: "ラテ", emoji: "☕️", grad: "linear-gradient(135deg,#ff7a45,#ff2e74)" },
  { word: "スイーツ", emoji: "🍰", grad: "linear-gradient(135deg,#ff2e74,#b026ff)" },
  { word: "ランチプレート", emoji: "🍽️", grad: "linear-gradient(135deg,#2ee6a6,#5b6dff)" },
  { word: "新メニュー", emoji: "🌟", grad: "linear-gradient(135deg,#ffbe3d,#ff2e74)" },
  { word: "店内の様子", emoji: "🪑", grad: "linear-gradient(135deg,#5b6dff,#b026ff)" },
];

function pickSubject(hint?: string) {
  if (hint) {
    const found = SUBJECTS.find((s) => hint.includes(s.word));
    if (found) return found;
  }
  return SUBJECTS[Math.floor(Math.random() * SUBJECTS.length)];
}

/**
 * Local, zero-cost adapter used for the demo / offline mode.
 * Mirrors the exact shape a real Gemini call would return.
 */
export class MockAdapter implements AIProvider {
  readonly id = "mock-local";
  readonly label = "Lumina Local (デモ)";

  async analyzePhoto({ hint, tone, brandName }: AnalyzeInput): Promise<AIAnalysis> {
    // Simulate model latency so the UI animation has something to breathe with.
    await new Promise((r) => setTimeout(r, 600));
    const subj = pickSubject(hint);
    const flavor = TONE_FLAVOR[tone];
    const title = `${flavor.lead}`;
    const subtitle = `自慢の${subj.word}`;
    const caption =
      `${flavor.emoji} ${brandName}より${flavor.emoji}\n\n` +
      `自慢の${subj.word}が登場しました${subj.emoji}\n` +
      `写真ではお伝えしきれない美味しさを、ぜひ店頭で。\n\n${flavor.tail}`;
    const hashtags = [
      "#梅田カフェ",
      `#${subj.word}`,
      "#大阪グルメ",
      "#カフェ巡り",
      "#今日のおすすめ",
    ];
    return {
      title,
      subtitle,
      caption,
      hashtags,
      emoji: subj.emoji,
      banner: subj.grad,
      model: this.label,
    };
  }
}

/**
 * Real provider placeholder. Wire GEMINI_API_KEY and uncomment the
 * fetch to go live — the rest of the app needs no changes.
 */
export class GeminiFlashAdapter implements AIProvider {
  readonly id = "gemini-1.5-flash";
  readonly label = "Gemini 1.5 Flash";
  constructor(
    private apiKey: string,
    private imageBase64?: string,
    private mimeType = "image/jpeg"
  ) {}

  async analyzePhoto(input: AnalyzeInput): Promise<AIAnalysis> {
    const toneJa: Record<AIToneId, string> = {
      friendly: "フレンドリーで親しみやすい",
      polite: "ていねいで上品な",
      energetic: "元気でテンション高めの",
      calm: "おだやかで落ち着いた",
      luxury: "上質で高級感のある",
    };
    const prompt =
      `あなたは実店舗「${input.brandName}」のSNS運用担当です。` +
      `アップされた写真を見て、${toneJa[input.tone]}トーンで、` +
      `Instagram投稿用の素材を日本語で作ってください。` +
      `次のJSONだけを返してください（前後に説明文やコードブロックは不要）:\n` +
      `{"title":"バナー用の短い見出し(全角12字以内)","subtitle":"サブ見出し(全角20字以内)",` +
      `"caption":"本文キャプション(絵文字込み・3〜5文)","hashtags":["#〜","#〜","#〜","#〜","#〜"],"emoji":"絵文字1つ"}`;

    const parts: Record<string, unknown>[] = [{ text: prompt }];
    if (this.imageBase64) {
      parts.push({ inline_data: { mime_type: this.mimeType, data: this.imageBase64 } });
    }

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.9, responseMimeType: "application/json" },
          }),
          cache: "no-store",
        }
      );
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
        error?: { message?: string };
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(data.error?.message ?? "no content");

      const parsed = JSON.parse(text) as Partial<AIAnalysis> & { hashtags?: string[] };
      const grad =
        "linear-gradient(135deg,#ff7a45,#ff2e74)"; // banner photo overlays this
      return {
        title: parsed.title ?? "今日のおすすめ",
        subtitle: parsed.subtitle ?? "",
        caption: parsed.caption ?? "",
        hashtags: parsed.hashtags ?? [],
        emoji: parsed.emoji ?? "✨",
        banner: grad,
        model: this.label,
      };
    } catch {
      // Network/parse failure — degrade gracefully to the local copywriter.
      return new MockAdapter().analyzePhoto(input);
    }
  }
}

/** Factory — the single switch point for the whole app. */
export function getAIProvider(opts?: {
  apiKey?: string;
  imageBase64?: string;
  mimeType?: string;
}): AIProvider {
  const key = opts?.apiKey || process.env.GEMINI_API_KEY;
  if (key) return new GeminiFlashAdapter(key, opts?.imageBase64, opts?.mimeType);
  return new MockAdapter();
}
