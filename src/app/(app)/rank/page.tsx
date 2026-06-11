"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Trash2,
  Plus,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Page, Button } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { RankConfig, RankKeyword } from "@/lib/types";

export default function RankPage() {
  const { company, showToast } = useApp();

  const [hasKey, setHasKey] = useState(true);
  const [cfg, setCfg] = useState<RankConfig | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [keywords, setKeywords] = useState<RankKeyword[]>([]);
  const [newKw, setNewKw] = useState("");
  const [savingCfg, setSavingCfg] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [c, k] = await Promise.all([
          fetch("/api/rank/config").then((r) => r.json()),
          fetch("/api/rank/keywords").then((r) => r.json()),
        ]);
        setHasKey(!!c.hasKey);
        if (c.config) {
          setCfg(c.config);
          setName(c.config.businessName ?? "");
          setAddress(c.config.address ?? "");
        } else {
          setName(company.gbpName || company.name || "");
        }
        if (k.keywords) setKeywords(k.keywords);
      } catch {
        /* ignore */
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveConfig() {
    if (!name.trim()) return;
    setSavingCfg(true);
    try {
      const r = await fetch("/api/rank/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessName: name, address }),
      }).then((res) => res.json());
      if (r.ok) {
        setCfg(r.config);
        showToast(
          r.resolved
            ? "店舗をGoogle上で特定しました📍"
            : hasKey
            ? "保存しました（店舗の特定はできませんでした。住所を補ってください）"
            : "保存しました"
        );
      } else {
        showToast(r.error ?? "保存に失敗しました");
      }
    } finally {
      setSavingCfg(false);
    }
  }

  async function addKeyword() {
    const kw = newKw.trim();
    if (!kw) return;
    setNewKw("");
    const r = await fetch("/api/rank/keywords", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keyword: kw }),
    }).then((res) => res.json());
    if (r.keyword) setKeywords((p) => [...p, r.keyword]);
  }

  async function removeKeyword(id: string) {
    setKeywords((p) => p.filter((k) => k.id !== id));
    await fetch(`/api/rank/keywords?id=${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function checkNow() {
    if (!keywords.length) {
      showToast("先にキーワードを追加してください");
      return;
    }
    setChecking(true);
    try {
      const r = await fetch("/api/rank/check", { method: "POST" }).then((res) => res.json());
      if (r.ok) {
        const k = await fetch("/api/rank/keywords").then((res) => res.json());
        if (k.keywords) setKeywords(k.keywords);
        showToast("順位を計測しました📊");
      } else {
        if (r.needsKey) setHasKey(false);
        showToast(r.error ?? "計測に失敗しました");
      }
    } finally {
      setChecking(false);
    }
  }

  return (
    <Page>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          <TrendingUp size={18} />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">キーワード順位</h1>
          <p className="text-[11px] text-[var(--fg-faint)]">
            Googleマップでの自店の検索順位（MEO）をキーワードごとに計測します。
          </p>
        </div>
      </div>

      {!hasKey && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-[var(--warn)]/30 bg-[var(--warn)]/10 p-3.5">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[var(--warn)]" />
          <div className="text-[12px] leading-relaxed">
            <p className="font-bold">計測にはGoogle Places APIキーが必要です</p>
            <p className="mt-0.5 text-[var(--fg-dim)]">
              Google Cloudで「Places API」を有効化し、環境変数 <code>GOOGLE_PLACES_API_KEY</code> を設定すると計測が有効になります。設定までは店舗名・キーワードの登録だけ可能です。
            </p>
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        {/* business config */}
        <div className="glass space-y-3 p-4">
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <MapPin size={15} /> 計測する店舗
          </p>
          <div>
            <p className="mb-1 text-[11px] font-semibold text-[var(--fg-faint)]">店舗名</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：Darts&Shotbar Pink Dolphin"
              className="w-full rounded-xl bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-[var(--fg-faint)]"
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold text-[var(--fg-faint)]">住所（特定精度UP・任意）</p>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例：大阪府東大阪市…"
              className="w-full rounded-xl bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-[var(--fg-faint)]"
            />
          </div>
          <Button onClick={saveConfig} className="w-full" disabled={savingCfg || !name.trim()}>
            {savingCfg ? "保存中…" : "店舗を保存"}
          </Button>
          {cfg?.placeId && (
            <p className="text-center text-[10px] text-[var(--ok)]">✓ Google上で特定済み</p>
          )}
        </div>

        {/* keywords */}
        <div className="mt-4 lg:mt-0">
          <div className="glass p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">追跡キーワード（{keywords.length}）</p>
              <button
                onClick={checkNow}
                disabled={checking || !keywords.length}
                className="flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-bold disabled:opacity-40"
              >
                {checking ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                今すぐ計測
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                value={newKw}
                onChange={(e) => setNewKw(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="例：東大阪 ダーツバー"
                className="flex-1 rounded-xl bg-white/8 px-3 py-2 text-sm outline-none placeholder:text-[var(--fg-faint)]"
              />
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={addKeyword}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                style={{ background: "var(--grad-brand)" }}
              >
                <Plus size={18} />
              </motion.button>
            </div>

            <div className="space-y-2">
              {keywords.map((kw) => (
                <KeywordRow key={kw.id} kw={kw} onDelete={() => removeKeyword(kw.id)} />
              ))}
              {keywords.length === 0 && (
                <p className="py-6 text-center text-xs text-[var(--fg-faint)]">
                  {loaded ? "キーワードを追加して順位を追跡しましょう。" : "読み込み中…"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}

function KeywordRow({ kw, onDelete }: { kw: RankKeyword; onDelete: () => void }) {
  const last = kw.lastRank;
  const prev = kw.history.length >= 2 ? kw.history[kw.history.length - 2].rank : undefined;

  // trend: lower rank number = better
  let trend: "up" | "down" | "flat" | null = null;
  if (last != null && prev != null) {
    if (last < prev) trend = "up";
    else if (last > prev) trend = "down";
    else trend = "flat";
  }

  const rankLabel =
    kw.lastChecked == null ? "未計測" : last == null ? "圏外" : `${last}位`;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{kw.keyword}</p>
        {kw.lastChecked && (
          <p className="mt-0.5 text-[10px] text-[var(--fg-faint)]">
            計測: {new Date(kw.lastChecked).toLocaleDateString("ja-JP")}
          </p>
        )}
      </div>
      {trend && (
        <span className="flex items-center">
          {trend === "up" && <TrendingUp size={15} className="text-[var(--ok)]" />}
          {trend === "down" && <TrendingDown size={15} className="text-[var(--danger)]" />}
          {trend === "flat" && <Minus size={15} className="text-[var(--fg-faint)]" />}
        </span>
      )}
      <span
        className={`min-w-[52px] rounded-lg px-2 py-1 text-center text-xs font-black tabular-nums ${
          last == null
            ? "bg-white/8 text-[var(--fg-faint)]"
            : last <= 3
            ? "text-white"
            : "bg-white/10 text-[var(--fg)]"
        }`}
        style={last != null && last <= 3 ? { background: "var(--grad-brand)" } : undefined}
      >
        {rankLabel}
      </span>
      <button onClick={onDelete} className="rounded-full bg-white/8 p-2 text-[var(--fg-faint)]">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
