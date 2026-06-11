"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Sparkles,
  ImagePlus,
  Wand2,
  MapPin,
  Check,
  RotateCcw,
  Clock,
  CalendarClock,
  Zap,
  Minus,
  Plus,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, Button, Chip } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { AIAnalysis, Channel, PostFormat, StoryElement, StoryElementId } from "@/lib/types";
import { BANNER_GRADIENTS } from "@/lib/mock-data";
import {
  composeStoryImage,
  defaultStoryElements,
  STORY_ELEMENT_META,
  STORY_FONT_FAMILY,
} from "@/lib/story-image";
import { downscaleDataUrl } from "@/lib/image";

type Step = "setup" | "analyzing" | "edit";
type PublishMode = "now" | "schedule";

const STORY_COLORS = ["#ffffff", "#111111", "#ff2e74", "#ffd24a", "#5b6dff"];

export default function CreatePage() {
  const router = useRouter();
  const { company, addAsset, addSchedule, showToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("setup");

  // ---- setup choices (made BEFORE uploading — no longer feed-first) ----
  const [channels, setChannels] = useState<Channel[]>(["instagram", "gbp"]);
  const [format, setFormat] = useState<PostFormat>("feed"); // feed | story

  const [photo, setPhoto] = useState<string | null>(null);
  const [ai, setAi] = useState<AIAnalysis | null>(null);

  // editable fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [banner, setBanner] = useState(BANNER_GRADIENTS[0]);
  const [publishing, setPublishing] = useState(false);

  // ---- Story layout: each text layer is freely positioned + sized ----
  const [storyElements, setStoryElements] = useState<StoryElement[]>(() =>
    defaultStoryElements({})
  );
  const [selectedEl, setSelectedEl] = useState<StoryElementId | null>("title");

  // ---- publish method ----
  const [publishMode, setPublishMode] = useState<PublishMode>("schedule");
  const [schedDate, setSchedDate] = useState(() => isoDate(new Date()));
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);

  const igSelected = channels.includes("instagram");
  const isStory = igSelected && format === "story";

  // Real Instagram profile (name / bio / area) to ground AI copy.
  type Profile = { name?: string | null; username?: string | null; biography?: string | null; website?: string | null };
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => setProfile(null));
  }, []);

  // Keep a Story layer's text in sync when the corresponding field changes.
  function syncEl(id: StoryElementId, text: string) {
    setStoryElements((els) => els.map((e) => (e.id === id ? { ...e, text } : e)));
  }
  function patchEl(id: StoryElementId, patch: Partial<StoryElement>) {
    setStoryElements((els) => els.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function onPick(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhoto(dataUrl);
      runAI(file.name, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function runAI(hint: string, dataUrl: string) {
    setStep("analyzing");
    const [meta, b64] = dataUrl.split(",");
    const mimeType = /data:(.*?);/.exec(meta)?.[1] ?? "image/jpeg";
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          hint,
          tone: company.aiTone,
          brandName: profile?.name || company.name,
          imageBase64: b64,
          mimeType,
          apiKey: company.credentials?.geminiKey,
          profile: profile ?? undefined,
        }),
      });
      const data = await res.json();
      const r: AIAnalysis = data.result;
      setAi(r);
      setTitle(r.title);
      setSubtitle(r.subtitle);
      setCaption(r.caption);
      setHashtags(r.hashtags);
      setBanner(r.banner);
      setStoryElements(
        defaultStoryElements({
          title: r.title,
          subtitle: r.subtitle,
          caption: r.caption,
          hashtags: r.hashtags,
        })
      );
      setSelectedEl("title");
      // give the lovely animation a moment to land
      setTimeout(() => setStep("edit"), 900);
    } catch {
      showToast("AI解析に失敗しました。もう一度お試しください。");
      setStep("setup");
    }
  }

  function toggleChannel(c: Channel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function reset() {
    setStep("setup");
    setPhoto(null);
    setAi(null);
  }

  async function buildStoryFull(): Promise<string> {
    if (!photo) return "";
    return composeStoryImage({ photo, elements: storyElements });
  }

  async function publishNow() {
    if (!photo) return;
    setPublishing(true);
    try {
      const st = await fetch("/api/integrations/instagram/status").then((r) => r.json());
      if (!st.connected) {
        showToast("先に設定からInstagram連携をしてください");
        return;
      }
      // Stories carry no caption — text only shows if burned into the image.
      const imageToUpload = isStory ? await buildStoryFull() : photo;
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl: imageToUpload }),
      }).then((r) => r.json());
      if (!up.ok) {
        showToast(up.error ?? "画像アップロードに失敗しました");
        return;
      }
      const fullCaption = `${caption}\n\n${hashtags.join(" ")}`.trim();
      const pub = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: up.url, caption: fullCaption, format }),
      }).then((r) => r.json());
      if (pub.ok) {
        showToast(pub.isStory ? "ストーリーズに投稿しました🎉" : "Instagramに投稿しました🎉");
        router.push("/dashboard");
      } else {
        showToast("投稿に失敗: " + (pub.error ?? ""));
      }
    } catch {
      showToast("投稿に失敗しました");
    } finally {
      setPublishing(false);
    }
  }

  async function schedule() {
    if (!photo) return;
    setPublishing(true);
    const assetId = "ast_" + Date.now();
    const schedId = "sch_" + Date.now();
    const baseFormat: PostFormat = igSelected ? format : "feed";
    const at = new Date(`${schedDate}T${pad(hour)}:${pad(minute)}:00`);

    // Lightweight copies for localStorage: a small preview + a capped source.
    const previewImage = isStory
      ? await composeStoryImage({ photo, elements: storyElements, maxDim: 540, quality: 0.8 })
      : await downscaleDataUrl(photo, 540, 0.8);
    const storedPhoto = await downscaleDataUrl(photo, 1000, 0.82);

    addAsset({
      id: assetId,
      companyId: company.id,
      title,
      subtitle,
      caption,
      hashtags,
      banner,
      emoji: ai?.emoji ?? "✨",
      templateId: "tpl_minimal",
      createdAt: new Date().toISOString(),
      format: baseFormat,
      photo: storedPhoto,
      previewImage,
      storyElements: isStory ? storyElements : undefined,
    });
    addSchedule({
      id: schedId,
      companyId: company.id,
      assetId,
      channels,
      formats: channels.includes("gbp") ? [baseFormat, "gbp_update"] : [baseFormat],
      at: at.toISOString(),
      recurrence: "none",
      status: "scheduled",
      postOnClosedDays: false,
    });

    // Persist to the server ledger so the cron job can publish it.
    // The final (already-composed) image is uploaded to Blob → public URL.
    try {
      const finalImage = isStory ? await composeStoryImage({ photo, elements: storyElements }) : photo;
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl: finalImage }),
      }).then((r) => r.json());
      if (up.ok) {
        const fullCaption = isStory ? "" : `${caption}\n\n${hashtags.join(" ")}`.trim();
        await fetch("/api/schedule", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            id: schedId,
            imageUrl: up.url,
            caption: fullCaption,
            title,
            format: baseFormat,
            channels,
            scheduledAt: at.toISOString(),
          }),
        });
        showToast("予約しました！指定日時に自動投稿されます📅");
      } else {
        showToast("予約は保存しましたが自動投稿の登録に失敗しました（" + (up.error ?? "") + "）");
      }
    } catch {
      showToast("予約は保存しましたが自動投稿サーバーに接続できませんでした");
    } finally {
      setPublishing(false);
      router.push("/calendar");
    }
  }

  return (
    <Page>
      <AnimatePresence mode="wait">
        {/* ---------------- SETUP (投稿先 → 形式 → 写真) ---------------- */}
        {step === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h1 className="text-2xl font-black tracking-tight">投稿をつくる</h1>
            <p className="mt-1 text-sm text-[var(--fg-dim)]">
              投稿先と形式をえらんでから、写真を1枚。あとはAIにおまかせ。
            </p>

            {/* ① 投稿先 */}
            <p className="mb-2 mt-6 text-sm font-bold">① 投稿先</p>
            <div className="flex gap-2">
              <ChannelToggle
                active={channels.includes("instagram")}
                onClick={() => toggleChannel("instagram")}
                icon={<Instagram size={16} />}
                label="Instagram"
              />
              <ChannelToggle
                active={channels.includes("gbp")}
                onClick={() => toggleChannel("gbp")}
                icon={<MapPin size={16} />}
                label="GBP"
              />
            </div>

            {/* ② 形式 */}
            <p className="mb-2 mt-5 text-sm font-bold">② 形式</p>
            {igSelected ? (
              <div className="flex gap-2">
                {(["feed", "story"] as PostFormat[]).map((f) => (
                  <FormatCard
                    key={f}
                    active={format === f}
                    onClick={() => setFormat(f)}
                    label={f === "feed" ? "フィード" : "ストーリーズ"}
                    sub={f === "feed" ? "1:1 の通常投稿" : "9:16・24時間で消える"}
                  />
                ))}
              </div>
            ) : (
              <p className="glass px-4 py-3 text-xs text-[var(--fg-dim)]">
                GBP（Googleビジネスプロフィール）の最新情報として投稿します。
              </p>
            )}

            {/* ③ 写真 */}
            <p className="mb-2 mt-5 text-sm font-bold">③ 写真をえらぶ</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => fileRef.current?.click()}
              disabled={channels.length === 0}
              className="glass-strong mt-1 flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/15 py-12 disabled:opacity-40"
            >
              <motion.span
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.4 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-glow)]"
                style={{ background: "var(--grad-brand)" }}
              >
                <ImagePlus size={30} />
              </motion.span>
              <span className="text-sm font-bold">タップして写真を選ぶ</span>
              <span className="text-[11px] text-[var(--fg-faint)]">
                {channels.length === 0
                  ? "先に投稿先を選んでください"
                  : "JPG / PNG・店内やメニューの写真でOK"}
              </span>
            </motion.button>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: Camera, t: "撮る" },
                { icon: Wand2, t: "AI生成" },
                { icon: Check, t: "予約" },
              ].map(({ icon: Icon, t }, i) => (
                <div key={t} className="glass flex flex-col items-center gap-1 py-3">
                  <Icon size={18} className="text-[var(--brand-2)]" />
                  <span className="text-[11px] font-semibold">
                    {i + 1}. {t}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ---------------- ANALYZING ---------------- */}
        {step === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center pt-10"
          >
            <div className="relative">
              {photo && (
                <motion.img
                  src={photo}
                  alt=""
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="h-56 w-56 rounded-3xl object-cover"
                />
              )}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                className="absolute -inset-2 rounded-[28px] border-2 border-dashed border-[var(--brand-2)]/50"
              />
              <motion.div
                initial={{ top: 0 }}
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                className="absolute inset-x-2 h-1 rounded-full"
                style={{ background: "var(--grad-brand)", boxShadow: "0 0 18px #ff2e74" }}
              />
            </div>

            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              className="mt-8 flex items-center gap-2 text-[var(--brand-2)]"
            >
              <Sparkles size={18} />
              <span className="text-sm font-bold">AIが写真を読み取っています…</span>
            </motion.div>
            <div className="mt-5 w-full space-y-2">
              {["被写体を認識", "キャプションを執筆", "バナー文字を最適化"].map((t, i) => (
                <motion.div
                  key={t}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.5 }}
                  className="glass flex items-center gap-2.5 px-4 py-2.5"
                >
                  <Check size={15} className="text-[var(--ok)]" />
                  <span className="text-xs">{t}</span>
                </motion.div>
              ))}
              <div className="shimmer h-9 rounded-2xl" />
            </div>
          </motion.div>
        )}

        {/* ---------------- EDIT / PREVIEW ---------------- */}
        {step === "edit" && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-black tracking-tight">プレビューと微調整</h1>
                <p className="text-[11px] text-[var(--fg-faint)]">
                  生成: {ai?.model} ・ {isStory ? "文字はドラッグで配置・バーでサイズ調整" : "文字は自由に手直しできます"}
                </p>
              </div>
              <button
                onClick={reset}
                className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-[var(--fg-dim)]"
              >
                <RotateCcw size={12} /> やり直す
              </button>
            </div>

            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
              <div className="lg:sticky lg:top-6">
                {isStory ? (
                  <StoryEditor
                    photo={photo}
                    elements={storyElements}
                    selected={selectedEl}
                    onSelect={setSelectedEl}
                    onMove={(id, x, y) => patchEl(id, { x, y })}
                    onPatch={patchEl}
                    colors={STORY_COLORS}
                  />
                ) : (
                  <>
                    {/* Banner preview (auto-fit headline over photo) */}
                    <div
                      className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl lg:max-w-[420px]"
                      style={{ background: banner }}
                    >
                      {photo && (
                        <img
                          src={photo}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover opacity-55"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(180deg,transparent 35%,rgba(0,0,0,0.6))" }}
                      />
                      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                        <p
                          className="font-black leading-tight drop-shadow"
                          style={{ fontSize: title.length > 10 ? 22 : 30 }}
                        >
                          {title || "タイトル"}
                        </p>
                        <p className="mt-1 text-sm font-semibold opacity-90 drop-shadow">
                          {subtitle}
                        </p>
                      </div>
                      <div className="absolute right-3 top-3 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold backdrop-blur">
                        {ai?.emoji} AI生成
                      </div>
                    </div>

                    {/* template gradient picker */}
                    <div className="mt-3 flex justify-center gap-2">
                      {BANNER_GRADIENTS.map((g) => (
                        <button
                          key={g}
                          onClick={() => setBanner(g)}
                          className={`h-7 w-7 rounded-full transition-transform ${
                            banner === g ? "scale-110 ring-2 ring-white" : "opacity-70"
                          }`}
                          style={{ background: g }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="min-w-0">
                {/* editable text */}
                <div className="mt-5 space-y-3 lg:mt-0">
                  <Field label={isStory ? "見出し" : "バナー見出し"}>
                    <input
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        syncEl("title", e.target.value);
                      }}
                      className="w-full bg-transparent text-sm font-bold outline-none"
                    />
                  </Field>
                  <Field label="サブ見出し">
                    <input
                      value={subtitle}
                      onChange={(e) => {
                        setSubtitle(e.target.value);
                        syncEl("subtitle", e.target.value);
                      }}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </Field>
                  <Field label="キャプション">
                    <textarea
                      value={caption}
                      onChange={(e) => {
                        setCaption(e.target.value);
                        syncEl("caption", e.target.value);
                      }}
                      rows={5}
                      className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                    />
                  </Field>
                  <Field label="ハッシュタグ（タップで削除）">
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {hashtags.map((h) => (
                        <button
                          key={h}
                          onClick={() => {
                            const next = hashtags.filter((x) => x !== h);
                            setHashtags(next);
                            syncEl("hashtags", next.join(" "));
                          }}
                          className="rounded-full bg-[var(--brand-3)]/20 px-2.5 py-1 text-[11px] font-semibold text-[#d9b8ff]"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                {/* 投稿先まとめ（setupで決定済み・確認用） */}
                <div className="mt-5 flex items-center gap-2 text-[11px] text-[var(--fg-faint)]">
                  <span className="font-semibold text-[var(--fg-dim)]">投稿先:</span>
                  {channels.includes("instagram") && (
                    <span className="flex items-center gap-1"><Instagram size={12} /> {isStory ? "ストーリーズ" : "フィード"}</span>
                  )}
                  {channels.includes("gbp") && (
                    <span className="flex items-center gap-1"><MapPin size={12} /> GBP</span>
                  )}
                </div>

                {/* ---- 公開方法 ---- */}
                <p className="mb-2 mt-6 text-sm font-bold">公開方法</p>
                <div className="grid grid-cols-2 gap-2">
                  <ModeCard
                    active={publishMode === "now"}
                    onClick={() => setPublishMode("now")}
                    icon={<Zap size={16} />}
                    label="今すぐ投稿"
                    sub="すぐに公開"
                  />
                  <ModeCard
                    active={publishMode === "schedule"}
                    onClick={() => setPublishMode("schedule")}
                    icon={<CalendarClock size={16} />}
                    label="予約投稿"
                    sub="日時を指定"
                  />
                </div>

                {publishMode === "schedule" && (
                  <div className="glass mt-3 space-y-4 p-4">
                    <div>
                      <p className="mb-1.5 text-[11px] font-semibold text-[var(--fg-faint)]">日付</p>
                      <input
                        type="date"
                        value={schedDate}
                        min={isoDate(new Date())}
                        onChange={(e) => setSchedDate(e.target.value)}
                        className="w-full rounded-xl bg-white/8 px-3 py-2.5 text-sm font-semibold outline-none [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-[var(--fg-faint)]">
                        <Clock size={12} /> 時刻
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <TimeStepper
                          value={hour}
                          label="時"
                          onMinus={() => setHour((v) => (v + 24 - 1) % 24)}
                          onPlus={() => setHour((v) => (v + 1) % 24)}
                        />
                        <span className="text-2xl font-black">:</span>
                        <TimeStepper
                          value={minute}
                          label="分"
                          pad
                          onMinus={() => setMinute((m) => (m + 60 - 5) % 60)}
                          onPlus={() => setMinute((m) => (m + 5) % 60)}
                        />
                      </div>
                      <div className="mt-3 flex justify-center gap-2">
                        {([
                          [7, 30],
                          [12, 0],
                          [18, 0],
                          [21, 0],
                        ] as [number, number][]).map(([h, m]) => (
                          <Chip
                            key={`${h}:${m}`}
                            active={hour === h && minute === m}
                            onClick={() => {
                              setHour(h);
                              setMinute(m);
                            }}
                          >
                            {pad(h)}:{pad(m)}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {publishMode === "schedule" ? (
                  <Button
                    onClick={schedule}
                    className="mt-5 w-full"
                    disabled={channels.length === 0 || publishing}
                  >
                    <CalendarClock size={16} />{" "}
                    {publishing
                      ? "登録中…"
                      : `${schedDate.replaceAll("-", "/")} ${pad(hour)}:${pad(minute)} に予約する`}
                  </Button>
                ) : (
                  <Button
                    onClick={publishNow}
                    className="mt-5 w-full"
                    disabled={publishing || !igSelected}
                  >
                    <Zap size={16} /> {publishing ? "投稿中…" : "今すぐInstagramに投稿"}
                  </Button>
                )}
                {publishMode === "now" && !igSelected && (
                  <p className="mt-2 text-center text-[10px] text-[var(--warn)]">
                    ※ 即時投稿はInstagram選択時のみ。GBP単体は予約投稿をご利用ください。
                  </p>
                )}
                <p className="mt-2 text-center text-[10px] text-[var(--fg-faint)]">
                  ※ 実投稿はInstagram連携＆画像ストレージ接続後に有効
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}

// ===================== Story drag-and-resize editor =====================

function StoryEditor({
  photo,
  elements,
  selected,
  onSelect,
  onMove,
  onPatch,
  colors,
}: {
  photo: string | null;
  elements: StoryElement[];
  selected: StoryElementId | null;
  onSelect: (id: StoryElementId) => void;
  onMove: (id: StoryElementId, x: number, y: number) => void;
  onPatch: (id: StoryElementId, patch: Partial<StoryElement>) => void;
  colors: string[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sel = elements.find((e) => e.id === selected) ?? null;

  function startDrag(e: React.PointerEvent, id: StoryElementId) {
    e.preventDefault();
    onSelect(id);
    const stage = stageRef.current;
    if (!stage) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const x = clamp((ev.clientX - rect.left) / rect.width, 0.06, 0.94);
      const y = clamp((ev.clientY - rect.top) / rect.height, 0.05, 0.95);
      onMove(id, round3(x), round3(y));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <>
      <div
        ref={stageRef}
        className="relative mx-auto aspect-[9/16] w-full max-w-[260px] touch-none select-none overflow-hidden rounded-2xl bg-black/40 lg:max-w-[300px]"
        style={{ containerType: "size" }}
      >
        {photo ? (
          // Photo FILLS the frame (cover) — no split / letterbox bars.
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="shimmer h-full w-full" />
        )}

        {elements
          .filter((el) => el.enabled && el.text.trim())
          .map((el) => (
            <div
              key={el.id}
              onPointerDown={(e) => startDrag(e, el.id)}
              className={`absolute cursor-grab whitespace-pre-wrap break-words text-center leading-tight active:cursor-grabbing ${
                selected === el.id ? "ring-2 ring-white/80" : ""
              }`}
              style={{
                left: `${el.x * 100}%`,
                top: `${el.y * 100}%`,
                transform: "translate(-50%,-50%)",
                maxWidth: "86%",
                fontSize: `${el.size * 100}cqh`,
                fontFamily: STORY_FONT_FAMILY,
                fontWeight: STORY_ELEMENT_META[el.id].weight,
                color: el.color,
                padding: "2px 8px",
                borderRadius: 8,
                background:
                  luminance(el.color) > 0.55 ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.4)",
                textShadow:
                  luminance(el.color) > 0.55
                    ? "0 1px 6px rgba(0,0,0,0.5)"
                    : "0 1px 4px rgba(0,0,0,0.18)",
              }}
            >
              {el.text}
            </div>
          ))}

        <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur">
          ドラッグで配置
        </div>
      </div>

      {/* layer chips (select + show/hide) */}
      <p className="mt-3 text-center text-[11px] font-semibold text-[var(--fg-faint)]">
        文字レイヤー（タップで選択 / 長タップ風トグルで表示切替）
      </p>
      <div className="mt-1.5 flex flex-wrap justify-center gap-2">
        {elements.map((el) => (
          <button
            key={el.id}
            onClick={() => onSelect(el.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              selected === el.id
                ? "border-transparent text-white"
                : "border-white/12 bg-white/5 text-[var(--fg-dim)]"
            } ${!el.enabled ? "opacity-45" : ""}`}
            style={selected === el.id ? { background: "var(--grad-brand)" } : undefined}
          >
            {STORY_ELEMENT_META[el.id].label}
            <span
              onClick={(e) => {
                e.stopPropagation();
                onPatch(el.id, { enabled: !el.enabled });
              }}
              className="rounded-full bg-black/25 px-1 text-[10px]"
            >
              {el.enabled ? "ON" : "OFF"}
            </span>
          </button>
        ))}
      </div>

      {/* selected-layer controls: size slider + color */}
      {sel && (
        <div className="glass mt-3 space-y-3 p-3">
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-[var(--fg-faint)]">
              <span>「{STORY_ELEMENT_META[sel.id].label}」のサイズ</span>
              <span className="tabular-nums">{Math.round(sel.size * 1000)}</span>
            </div>
            <input
              type="range"
              min={20}
              max={95}
              value={Math.round(sel.size * 1000)}
              onChange={(e) => onPatch(sel.id, { size: Number(e.target.value) / 1000 })}
              className="w-full accent-[var(--brand-2)]"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold text-[var(--fg-faint)]">色</span>
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => onPatch(sel.id, { color: c })}
                aria-label={`文字色 ${c}`}
                className={`h-6 w-6 rounded-full border border-white/30 transition-transform ${
                  sel.color === c ? "scale-110 ring-2 ring-white" : "opacity-80"
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--fg-faint)]">
        Instagramの仕様上ストーリーズに文字は直接載せられないため、ここで配置した文字を画像に焼き込みます。
      </p>
    </>
  );
}

// ===================== small UI bits =====================

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass px-4 py-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function ChannelToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-colors ${
        active ? "text-white" : "bg-white/5 text-[var(--fg-faint)] border border-white/10"
      }`}
      style={active ? { background: "var(--grad-brand)" } : undefined}
    >
      {icon}
      {label}
      {active && <Check size={14} />}
    </motion.button>
  );
}

function FormatCard({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? "border-transparent text-white" : "border-white/10 bg-white/5 text-[var(--fg-dim)]"
      }`}
      style={active ? { background: "var(--grad-brand-soft)", borderColor: "var(--brand-3)" } : undefined}
    >
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[10px] text-[var(--fg-faint)]">{sub}</span>
    </motion.button>
  );
}

function ModeCard({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-2xl border px-4 py-3 text-left transition-colors ${
        active ? "border-transparent text-white" : "border-white/10 bg-white/5 text-[var(--fg-dim)]"
      }`}
      style={active ? { background: "var(--grad-brand)" } : undefined}
    >
      <span className="flex items-center gap-1.5 text-sm font-bold">{icon}{label}</span>
      <span className="text-[10px] opacity-80">{sub}</span>
    </motion.button>
  );
}

function TimeStepper({
  value,
  label,
  pad: padded,
  onMinus,
  onPlus,
}: {
  value: number;
  label: string;
  pad?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button whileTap={{ scale: 0.85 }} onClick={onPlus} className="rounded-full bg-white/8 p-2">
        <Plus size={18} />
      </motion.button>
      <div className="flex h-14 w-16 flex-col items-center justify-center rounded-2xl glass-strong">
        <span className="text-2xl font-black tabular-nums">
          {padded ? pad(value) : value}
        </span>
        <span className="text-[10px] text-[var(--fg-faint)]">{label}</span>
      </div>
      <motion.button whileTap={{ scale: 0.85 }} onClick={onMinus} className="rounded-full bg-white/8 p-2">
        <Minus size={18} />
      </motion.button>
    </div>
  );
}

// ===================== helpers =====================

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function round3(v: number) {
  return Math.round(v * 1000) / 1000;
}
function luminance(hex: string): number {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
