"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Bot,
  CalendarOff,
  Sparkles,
  Server,
  RotateCcw,
  Check,
  Plus,
  Copy,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, SectionTitle, Toggle, Button, BottomSheet } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { AIToneId } from "@/lib/types";

const TONES: { id: AIToneId; label: string; sample: string; emoji: string }[] = [
  { id: "friendly", label: "フレンドリー", sample: "今日のおすすめ、ぜひ遊びにきてね✨", emoji: "😊" },
  { id: "polite", label: "ていねい", sample: "本日のご案内です。お待ちしております。", emoji: "🙇" },
  { id: "energetic", label: "元気", sample: "きました！！見逃したらもったいない🔥", emoji: "🔥" },
  { id: "calm", label: "おだやか", sample: "そっと、ひと息。穏やかな時間を。", emoji: "🌿" },
  { id: "luxury", label: "上質", sample: "特別な一皿を。上質なひとときを。", emoji: "🥂" },
];

const WD = ["日", "月", "火", "水", "木", "金", "土"];

export default function SettingsPage() {
  const { company, rules, setCompany, toggleRule, addRule, resetDemo, showToast } = useApp();
  const [ruleOpen, setRuleOpen] = useState(false);
  const [kw, setKw] = useState("");
  const [reply, setReply] = useState("");

  function toggleClosedDay(d: number) {
    const next = company.closedDays.includes(d)
      ? company.closedDays.filter((x) => x !== d)
      : [...company.closedDays, d];
    setCompany({ closedDays: next });
  }

  return (
    <Page>
      <h1 className="text-2xl font-black tracking-tight">設定</h1>
      <p className="mt-1 text-sm text-[var(--fg-dim)]">
        ふだんは触らない設定をここに集約
      </p>

      {/* 連携 */}
      <div className="mt-5">
        <SectionTitle>アカウント連携</SectionTitle>
        <div className="glass divide-y divide-white/8">
          <ConnectRow
            icon={<Instagram size={18} />}
            grad="linear-gradient(135deg,#ff7a45,#ff2e74)"
            title="Instagram"
            sub={company.igHandle}
            on={company.connected.instagram}
            onChange={(v) =>
              setCompany({ connected: { ...company.connected, instagram: v } })
            }
          />
          <ConnectRow
            icon={<MapPin size={18} />}
            grad="linear-gradient(135deg,#2ee6a6,#5b6dff)"
            title="Googleビジネスプロフィール"
            sub={company.gbpName}
            on={company.connected.gbp}
            onChange={(v) => setCompany({ connected: { ...company.connected, gbp: v } })}
          />
        </div>
      </div>

      {/* AIトーン */}
      <div className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Sparkles size={16} className="text-[var(--brand-2)]" /> AIの文章トーン
          </span>
        </SectionTitle>
        <div className="space-y-2">
          {TONES.map((t) => {
            const active = company.aiTone === t.id;
            return (
              <motion.button
                key={t.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCompany({ aiTone: t.id })}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  active ? "border-[var(--brand-2)] bg-[var(--brand-2)]/10" : "border-white/8 bg-white/4"
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="truncate text-[11px] text-[var(--fg-faint)]">{t.sample}</p>
                </div>
                {active && (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                    style={{ background: "var(--grad-brand)" }}
                  >
                    <Check size={14} />
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 定休日 */}
      <div className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <CalendarOff size={16} className="text-[var(--warn)]" /> 定休日
          </span>
        </SectionTitle>
        <div className="glass p-4">
          <div className="flex justify-between gap-1.5">
            {WD.map((w, i) => {
              const active = company.closedDays.includes(i);
              return (
                <motion.button
                  key={w}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => toggleClosedDay(i)}
                  className={`flex h-11 flex-1 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                    active ? "text-white" : "bg-white/5 text-[var(--fg-faint)]"
                  }`}
                  style={active ? { background: "var(--grad-brand)" } : undefined}
                >
                  {w}
                </motion.button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] text-[var(--fg-faint)]">
            予約時に定休日の投稿をスキップ／実行するか選べます。
          </p>
        </div>
      </div>

      {/* 自動応答ルール */}
      <div className="mt-6">
        <SectionTitle
          action={
            <button
              onClick={() => setRuleOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-2)]"
            >
              <Plus size={14} /> 追加
            </button>
          }
        >
          <span className="flex items-center gap-1.5">
            <Bot size={16} className="text-[var(--ok)]" /> 自動応答
          </span>
        </SectionTitle>
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="glass flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      r.mode === "ai"
                        ? "bg-[var(--brand-3)]/20 text-[#d9b8ff]"
                        : "bg-white/8 text-[var(--fg-dim)]"
                    }`}
                  >
                    {r.mode === "ai" ? "AI応答" : `「${r.keyword}」`}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-[var(--fg-faint)]">{r.reply}</p>
              </div>
              <Toggle on={r.enabled} onChange={() => toggleRule(r.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* マザーボード連携API */}
      <div className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Server size={16} className="text-[var(--brand-4)]" /> マザーボード連携
          </span>
        </SectionTitle>
        <div className="glass p-4">
          <p className="text-[12px] leading-relaxed text-[var(--fg-dim)]">
            運営側の管理アプリは、内部APIキーで保護された統計エンドポイントから
            全テナントの利用状況を取得します。
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-black/30 px-3 py-2.5 font-mono text-[11px]">
            <span className="text-[var(--ok)]">GET</span>
            <span className="flex-1 truncate text-[var(--fg-dim)]">/api/saas/stats</span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${location.origin}/api/saas/stats`);
                showToast("エンドポイントをコピーしました");
              }}
              className="rounded-md bg-white/8 p-1.5"
            >
              <Copy size={13} />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[var(--fg-faint)]">
            ヘッダー <code className="text-[var(--brand-2)]">x-internal-key</code> で認証 ・ company_id 単位でデータ隔離
          </p>
        </div>
      </div>

      {/* プラン + リセット */}
      <div className="mt-6">
        <div className="glass flex items-center justify-between p-4">
          <div>
            <p className="text-sm font-bold">現在のプラン</p>
            <p className="text-[11px] text-[var(--fg-faint)]">
              {company.plan.toUpperCase()} ・ 残り {company.credits} クレジット
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: "var(--grad-brand)" }}
          >
            {company.plan.toUpperCase()}
          </span>
        </div>
        <button
          onClick={() => {
            resetDemo();
            showToast("デモデータをリセットしました");
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 text-sm font-semibold text-[var(--fg-dim)]"
        >
          <RotateCcw size={15} /> デモデータをリセット
        </button>
      </div>

      <p className="mt-6 text-center text-[10px] text-[var(--fg-faint)]">
        Lumina v0.1 — AI SNSオートパイロット
      </p>

      {/* add rule sheet */}
      <BottomSheet open={ruleOpen} onClose={() => setRuleOpen(false)} title="自動応答ルールを追加">
        <div className="space-y-4">
          <div className="glass px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--fg-faint)]">
              キーワード
            </p>
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="例: 予約、駐車場、営業時間"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div className="glass px-4 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase text-[var(--fg-faint)]">
              自動返信メッセージ
            </p>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={3}
              placeholder="このキーワードを含むメッセージへの返信文"
              className="w-full resize-none bg-transparent text-sm outline-none"
            />
          </div>
          <Button
            onClick={() => {
              if (!kw.trim() || !reply.trim()) return;
              addRule({
                id: "rule_" + Date.now(),
                companyId: company.id,
                keyword: kw.trim(),
                reply: reply.trim(),
                mode: "keyword",
                enabled: true,
              });
              setKw("");
              setReply("");
              setRuleOpen(false);
              showToast("ルールを追加しました");
            }}
            className="w-full"
            disabled={!kw.trim() || !reply.trim()}
          >
            <Plus size={16} /> ルールを追加
          </Button>
        </div>
      </BottomSheet>
    </Page>
  );
}

function ConnectRow({
  icon,
  grad,
  title,
  sub,
  on,
  onChange,
}: {
  icon: React.ReactNode;
  grad: string;
  title: string;
  sub: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
        style={{ background: grad }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="truncate text-[11px] text-[var(--fg-faint)]">
          {on ? sub : "未連携"}
        </p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}
