"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Wand2,
  ImagePlus,
  Trash2,
  Clock,
  CalendarClock,
  Check,
  Loader2,
} from "lucide-react";
import { Page, Button, Chip, Toggle } from "@/components/ui";
import { useApp } from "@/lib/store";
import { BAND_LABEL, defaultAutopilotConfig } from "@/lib/persona";
import type { AutopilotConfig, AIToneId, BankItem, TimeBand } from "@/lib/types";

const WD = ["日", "月", "火", "水", "木", "金", "土"];
const TONES: { id: AIToneId; label: string }[] = [
  { id: "friendly", label: "親しみ" },
  { id: "polite", label: "丁寧" },
  { id: "energetic", label: "元気" },
  { id: "calm", label: "落ち着き" },
  { id: "luxury", label: "高級感" },
];
const BANDS: TimeBand[] = ["auto", "morning", "lunch", "afternoon", "evening", "night"];

interface QueueItem {
  id: string;
  scheduledAt: string;
  caption: string;
  imageUrl: string;
  status: string;
  source?: string;
}

export default function AutopilotPage() {
  const { company, showToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [cfg, setCfg] = useState<AutopilotConfig>(defaultAutopilotConfig);
  const [bank, setBank] = useState<BankItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, b] = await Promise.all([
          fetch("/api/autopilot/config").then((r) => r.json()),
          fetch("/api/autopilot/bank").then((r) => r.json()),
        ]);
        if (c.config) setCfg(c.config);
        if (b.items) setBank(b.items);
      } catch {
        /* keep defaults */
      }
      await refreshQueue();
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshQueue() {
    try {
      const d = await fetch("/api/schedule").then((r) => r.json());
      const now = Date.now();
      setQueue(
        (d.posts ?? [])
          .filter(
            (p: QueueItem) => p.source === "autopilot" && new Date(p.scheduledAt).getTime() > now
          )
          .sort((a: QueueItem, b: QueueItem) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt))
      );
    } catch {
      /* ignore */
    }
  }

  function patch(p: Partial<AutopilotConfig>) {
    setCfg((c) => ({ ...c, ...p }));
  }
  function patchPersona(p: Partial<AutopilotConfig["persona"]>) {
    setCfg((c) => ({ ...c, persona: { ...c.persona, ...p } }));
  }
  function toggleDay(d: number) {
    setCfg((c) => ({
      ...c,
      preferredDays: c.preferredDays.includes(d)
        ? c.preferredDays.filter((x) => x !== d)
        : [...c.preferredDays, d].sort(),
    }));
  }

  async function save(thenPlan = false) {
    setSaving(true);
    try {
      const r = await fetch("/api/autopilot/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      }).then((res) => res.json());
      if (r.config) setCfg(r.config);
      if (thenPlan) {
        const p = await fetch("/api/autopilot/plan", { method: "POST" }).then((res) => res.json());
        await refreshQueue();
        showToast(
          p.created > 0
            ? `おまかせON！ ${p.created}件を自動予約しました📅`
            : p.reason === "bank-empty"
            ? "ONにしました。写真バンクに写真を追加すると自動で予約されます"
            : "保存しました"
        );
      } else {
        showToast("おまかせ設定を保存しました");
      }
    } catch {
      showToast("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  // Upload photos → AI writes persona-tuned copy (client, owner's key) → bank.
  async function onPickFiles(files: FileList) {
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setUploadMsg(`${i + 1}/${list.length} 枚目をAIが仕上げています…`);
      try {
        const dataUrl = await readAsDataURL(file);
        const up = await fetch("/api/upload", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        }).then((r) => r.json());
        if (!up.ok) {
          showToast(up.error ?? "画像アップロードに失敗しました");
          continue;
        }
        const [meta, b64] = dataUrl.split(",");
        const mimeType = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
        const hint = `次のターゲットに刺さる投稿にしてください: ${cfg.persona.label}（${cfg.persona.audience} / ${cfg.persona.lifestyle}）`;
        const ai = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            hint,
            tone: cfg.persona.tone,
            brandName: company.name,
            imageBase64: b64,
            mimeType,
            apiKey: company.credentials?.geminiKey,
          }),
        }).then((r) => r.json());
        const r = ai.result ?? {};
        const saved = await fetch("/api/autopilot/bank", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            imageUrl: up.url,
            caption: r.caption ?? "",
            hashtags: r.hashtags ?? [],
            title: r.title ?? "",
          }),
        }).then((res) => res.json());
        if (saved.item) setBank((prev) => [...prev, saved.item]);
      } catch {
        showToast("写真の取り込みに失敗しました");
      }
    }
    setUploadMsg(null);
    // if autopilot is on, immediately schedule from the new photos
    if (cfg.enabled) {
      await fetch("/api/autopilot/plan", { method: "POST" }).catch(() => {});
      await refreshQueue();
    }
    showToast("写真バンクに追加しました📸");
  }

  async function removeBank(id: string) {
    setBank((prev) => prev.filter((b) => b.id !== id));
    await fetch(`/api/autopilot/bank?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  const unused = bank.filter((b) => !b.used).length;
  const band = cfg.timeBand;

  return (
    <Page>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          <Sparkles size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">おまかせ自動投稿</h1>
          <p className="text-[11px] text-[var(--fg-faint)]">
            ペルソナと頻度を決めて写真を入れておくだけ。AIが内容と時間を決めて自動投稿します。
          </p>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="space-y-4">
          {/* ON/OFF */}
          <div className="glass flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-bold">おまかせモード</p>
              <p className="text-[11px] text-[var(--fg-dim)]">
                {cfg.enabled ? "稼働中：自動で予約を埋めます" : "停止中"}
              </p>
            </div>
            <Toggle on={cfg.enabled} onChange={(v) => patch({ enabled: v })} />
          </div>

          {/* persona */}
          <div className="glass space-y-3 p-4">
            <p className="text-sm font-bold">① 投稿ターゲット（ペルソナ）</p>
            <LabeledInput
              label="呼び名"
              placeholder="例：仕事帰りの常連さん"
              value={cfg.persona.label}
              onChange={(v) => patchPersona({ label: v })}
            />
            <LabeledInput
              label="属性・年齢層"
              placeholder="例：30〜40代・会社員・男女"
              value={cfg.persona.audience}
              onChange={(v) => patchPersona({ audience: v })}
            />
            <LabeledInput
              label="生活動線・興味（時間帯の手がかり）"
              placeholder="例：仕事帰りに一杯／ダーツ好き／週末は深夜まで"
              value={cfg.persona.lifestyle}
              textarea
              onChange={(v) => patchPersona({ lifestyle: v })}
            />
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-[var(--fg-faint)]">トーン</p>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <Chip
                    key={t.id}
                    active={cfg.persona.tone === t.id}
                    onClick={() => patchPersona({ tone: t.id })}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {/* cadence */}
          <div className="glass space-y-4 p-4">
            <p className="text-sm font-bold">② 頻度と時間帯</p>

            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--fg-dim)]">週の投稿数</span>
              <div className="flex items-center gap-3">
                <StepBtn onClick={() => patch({ postsPerWeek: Math.max(1, cfg.postsPerWeek - 1) })}>
                  −
                </StepBtn>
                <span className="w-10 text-center text-xl font-black tabular-nums">
                  {cfg.postsPerWeek}
                </span>
                <StepBtn onClick={() => patch({ postsPerWeek: Math.min(7, cfg.postsPerWeek + 1) })}>
                  ＋
                </StepBtn>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-[var(--fg-faint)]">曜日</p>
              <div className="flex gap-1.5">
                {WD.map((w, d) => {
                  const on = cfg.preferredDays.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`h-9 flex-1 rounded-xl text-xs font-bold transition-colors ${
                        on ? "text-white" : "bg-white/5 text-[var(--fg-faint)] border border-white/10"
                      } ${d === 0 ? "text-[var(--danger)]" : ""}`}
                      style={on ? { background: "var(--grad-brand)" } : undefined}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-faint)]">
                <Clock size={12} /> 投稿する時間帯
              </p>
              <div className="flex flex-wrap gap-2">
                {BANDS.map((b) => (
                  <Chip key={b} active={band === b} onClick={() => patch({ timeBand: b })}>
                    {BAND_LABEL[b]}
                  </Chip>
                ))}
              </div>
              {band === "auto" && (
                <p className="mt-1.5 text-[10px] text-[var(--fg-faint)]">
                  ※「ペルソナでおまかせ」は生活動線から最適な時間帯をAIが選びます。
                </p>
              )}
            </div>
          </div>

          <Button onClick={() => save(true)} className="w-full" disabled={saving}>
            {saving ? "保存中…" : cfg.enabled ? "保存してキューに反映" : "設定を保存"}
          </Button>
        </div>

        {/* right column: photo bank + queue */}
        <div className="mt-4 space-y-4 lg:mt-0">
          {/* photo bank */}
          <div className="glass p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">③ 写真バンク</p>
              <span className="text-[11px] text-[var(--fg-faint)]">未使用 {unused}枚</span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files?.length && onPickFiles(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={!!uploadMsg}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-white/5 py-6 disabled:opacity-60"
            >
              {uploadMsg ? (
                <>
                  <Loader2 size={22} className="animate-spin text-[var(--brand-2)]" />
                  <span className="text-xs font-semibold">{uploadMsg}</span>
                </>
              ) : (
                <>
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <ImagePlus size={22} />
                  </span>
                  <span className="text-xs font-bold">写真をまとめて追加</span>
                  <span className="text-[10px] text-[var(--fg-faint)]">
                    <Wand2 size={10} className="mr-0.5 inline" />
                    1枚ごとにAIがペルソナ向けの文章を自動生成
                  </span>
                </>
              )}
            </button>

            {bank.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {bank.map((b) => (
                  <div key={b.id} className="relative overflow-hidden rounded-xl">
                    <img src={b.imageUrl} alt="" className="aspect-square w-full object-cover" />
                    {b.used && (
                      <span className="absolute left-1 top-1 rounded-full bg-[var(--ok)]/85 px-1.5 py-0.5 text-[9px] font-bold text-black">
                        投稿予約済
                      </span>
                    )}
                    <button
                      onClick={() => removeBank(b.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/55 p-1 text-white"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* upcoming auto queue */}
          <div className="glass p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <CalendarClock size={15} /> 自動予約キュー（{queue.length}）
            </p>
            {queue.length === 0 ? (
              <p className="py-6 text-center text-xs text-[var(--fg-faint)]">
                {loaded
                  ? "まだありません。ONにして写真を入れると自動で並びます。"
                  : "読み込み中…"}
              </p>
            ) : (
              <div className="space-y-2">
                {queue.map((q) => {
                  const d = new Date(q.scheduledAt);
                  return (
                    <div key={q.id} className="flex items-center gap-3 rounded-xl bg-white/5 p-2">
                      <img src={q.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold">
                          {q.caption || "（自動生成）"}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--fg-faint)]">
                          <Check size={11} className="text-[var(--brand-2)]" />
                          {d.getMonth() + 1}/{d.getDate()}（{WD[d.getDay()]}）
                          {String(d.getHours()).padStart(2, "0")}:
                          {String(d.getMinutes()).padStart(2, "0")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--fg-faint)]">
              キューは自動投稿(cron)で順次Instagramへ。実投稿には設定でのInstagram再ログインが必要です。
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold text-[var(--fg-faint)]">{label}</p>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full resize-none rounded-xl bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-[var(--fg-faint)]"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-[var(--fg-faint)]"
        />
      )}
    </div>
  );
}

function StepBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-lg font-bold"
    >
      {children}
    </motion.button>
  );
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
