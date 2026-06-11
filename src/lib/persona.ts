// ============================================================
// persona.ts — turn a target persona into a posting time
// ============================================================
// The autopilot doesn't optimize for "max engagement" — it posts when the
// TARGET PERSONA is realistically reachable (lifestyle-driven). The owner
// can also pin an explicit time band.

import type { AutopilotConfig, Persona, TimeBand } from "./types";

export const BAND_TIME: Record<Exclude<TimeBand, "auto">, { hour: number; minute: number }> = {
  morning: { hour: 8, minute: 0 },
  lunch: { hour: 11, minute: 30 },
  afternoon: { hour: 15, minute: 0 },
  evening: { hour: 18, minute: 30 },
  night: { hour: 21, minute: 30 },
};

export const BAND_LABEL: Record<TimeBand, string> = {
  auto: "ペルソナでおまかせ",
  morning: "朝（8:00）",
  lunch: "昼（11:30）",
  afternoon: "午後（15:00）",
  evening: "夕方（18:30）",
  night: "夜（21:30）",
};

/** Infer a reachable time band from the persona's lifestyle/audience text. */
export function deriveBand(p: Persona): Exclude<TimeBand, "auto"> {
  const t = `${p.audience} ${p.lifestyle} ${p.label}`.toLowerCase();
  const has = (...ks: string[]) => ks.some((k) => t.includes(k));
  if (has("ランチ", "昼", "lunch", "主婦", "ママ", "ランチタイム")) return "lunch";
  if (has("朝", "モーニング", "通勤", "morning", "出勤")) return "morning";
  if (has("深夜", "夜型", "バー", "飲み", "night", "クラブ", "ダーツ", "二次会")) return "night";
  if (has("仕事帰り", "会社員", "退勤", "ディナー", "夕", "evening", "ビジネス", "残業")) return "evening";
  if (has("学生", "休日", "午後", "afternoon", "カフェ", "ティータイム")) return "afternoon";
  return "evening"; // sensible default for most shops
}

/** Resolve the band for a config (auto → derived). */
export function resolveBand(cfg: AutopilotConfig): Exclude<TimeBand, "auto"> {
  return cfg.timeBand === "auto" ? deriveBand(cfg.persona) : cfg.timeBand;
}

/** Pick a concrete posting time, with a little jitter so posts aren't identical. */
export function pickTime(cfg: AutopilotConfig): { hour: number; minute: number } {
  const base = BAND_TIME[resolveBand(cfg)];
  const jitter = [-15, -10, 0, 10, 15][Math.floor(Math.random() * 5)];
  let m = base.minute + jitter;
  let h = base.hour;
  if (m < 0) {
    m += 60;
    h -= 1;
  }
  if (m >= 60) {
    m -= 60;
    h += 1;
  }
  return { hour: (h + 24) % 24, minute: m };
}

export function defaultAutopilotConfig(): AutopilotConfig {
  return {
    enabled: false,
    persona: { label: "", audience: "", lifestyle: "", tone: "friendly" },
    postsPerWeek: 3,
    preferredDays: [1, 3, 5], // Mon / Wed / Fri
    timeBand: "auto",
    channels: ["instagram"],
    format: "story", // Instagram Stories by default
    lookaheadDays: 10,
    updatedAt: new Date().toISOString(),
  };
}
