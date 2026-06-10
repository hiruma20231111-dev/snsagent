"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, Button, Chip } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { AIAnalysis, Channel, PostFormat } from "@/lib/types";
import { BANNER_GRADIENTS } from "@/lib/mock-data";

type Step = "upload" | "analyzing" | "edit";

export default function CreatePage() {
  const router = useRouter();
  const { company, addAsset, addSchedule, showToast } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [photo, setPhoto] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [ai, setAi] = useState<AIAnalysis | null>(null);

  // editable fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [banner, setBanner] = useState(BANNER_GRADIENTS[0]);
  const [channels, setChannels] = useState<Channel[]>(["instagram", "gbp"]);
  const [format, setFormat] = useState<PostFormat>("feed");
  const [publishing, setPublishing] = useState(false);

  function onPick(file: File) {
    setFilename(file.name);
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
          brandName: company.name,
          imageBase64: b64,
          mimeType,
          apiKey: company.credentials?.geminiKey,
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
      // give the lovely animation a moment to land
      setTimeout(() => setStep("edit"), 900);
    } catch {
      showToast("AI解析に失敗しました。もう一度お試しください。");
      setStep("upload");
    }
  }

  function toggleChannel(c: Channel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function reset() {
    setStep("upload");
    setPhoto(null);
    setAi(null);
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
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataUrl: photo }),
      }).then((r) => r.json());
      if (!up.ok) {
        showToast(up.error ?? "画像アップロードに失敗しました");
        return;
      }
      const fullCaption = `${caption}\n\n${hashtags.join(" ")}`.trim();
      const pub = await fetch("/api/publish/instagram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageUrl: up.url, caption: fullCaption }),
      }).then((r) => r.json());
      if (pub.ok) {
        showToast("Instagramに投稿しました🎉");
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

  function schedule() {
    const assetId = "ast_" + Date.now();
    addAsset({
      id: assetId,
      companyId: company.id,
      title,
      caption,
      hashtags,
      banner,
      emoji: ai?.emoji ?? "✨",
      templateId: "tpl_minimal",
      createdAt: new Date().toISOString(),
    });
    const at = new Date();
    at.setHours(18, 0, 0, 0);
    if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
    addSchedule({
      id: "sch_" + Date.now(),
      companyId: company.id,
      assetId,
      channels,
      formats: channels.includes("gbp") ? [format, "gbp_update"] : [format],
      at: at.toISOString(),
      recurrence: "none",
      status: "scheduled",
      postOnClosedDays: false,
    });
    showToast("予約しました！カレンダーで確認できます📅");
    router.push("/calendar");
  }

  return (
    <Page>
      <AnimatePresence mode="wait">
        {/* ---------------- UPLOAD ---------------- */}
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <h1 className="text-2xl font-black tracking-tight">投稿をつくる</h1>
            <p className="mt-1 text-sm text-[var(--fg-dim)]">
              写真を1枚えらぶだけ。あとはAIにおまかせ。
            </p>

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
              className="glass-strong mt-6 flex w-full flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-white/15 py-14"
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
                JPG / PNG・店内やメニューの写真でOK
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
              {/* scanning line */}
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
                  生成: {ai?.model} ・ 文字は自由に手直しできます
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
            {/* Banner preview (Auto-fit headline over photo) */}
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
            </div>

            <div className="min-w-0">
            {/* editable text */}
            <div className="mt-5 space-y-3 lg:mt-0">
              <Field label="バナー見出し">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
              </Field>
              <Field label="サブ見出し">
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </Field>
              <Field label="キャプション">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={5}
                  className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
                />
              </Field>
              <Field label="ハッシュタグ（タップで削除）">
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {hashtags.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHashtags((p) => p.filter((x) => x !== h))}
                      className="rounded-full bg-[var(--brand-3)]/20 px-2.5 py-1 text-[11px] font-semibold text-[#d9b8ff]"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {/* channels + format */}
            <p className="mb-2 mt-5 text-sm font-bold">投稿先</p>
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

            {channels.includes("instagram") && (
              <div className="mt-3 flex gap-2">
                {(["feed", "reel", "story"] as PostFormat[]).map((f) => (
                  <Chip key={f} active={format === f} onClick={() => setFormat(f)}>
                    {f === "feed" ? "フィード" : f === "reel" ? "リール" : "ストーリーズ"}
                  </Chip>
                ))}
              </div>
            )}

            <Button onClick={schedule} className="mt-6 w-full" disabled={channels.length === 0}>
              <Sparkles size={16} /> この内容で予約する
            </Button>
            <button
              onClick={publishNow}
              disabled={publishing || !channels.includes("instagram")}
              className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 py-3 text-sm font-semibold text-[var(--fg-dim)] disabled:opacity-40"
            >
              {publishing ? "投稿中…" : "今すぐInstagramに投稿"}
            </button>
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
