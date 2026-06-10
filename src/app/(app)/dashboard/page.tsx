"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  Plus,
  CalendarClock,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function Dashboard() {
  const { company, schedules, assets } = useApp();
  const igConnected = company.connected.instagram;
  const scheduled = schedules.filter((s) => s.status === "scheduled").length;
  const published = schedules.filter((s) => s.status === "published").length;

  return (
    <Page>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <p className="text-sm text-[var(--fg-dim)]">ようこそ 👋</p>
        <h1 className="text-2xl font-black tracking-tight">{company.name}</h1>
        {igConnected && (
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--brand-2)]">
            {company.igHandle} と連携中
          </p>
        )}
      </motion.div>

      {/* Connection status */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard
          icon={<Instagram size={18} />}
          grad="linear-gradient(135deg,#ff7a45,#ff2e74)"
          title="Instagram"
          ok={igConnected}
          okText="連携中"
          ngText="未連携"
        />
        <StatusCard
          icon={<MapPin size={18} />}
          grad="linear-gradient(135deg,#2ee6a6,#5b6dff)"
          title="GBP"
          ok={company.connected.gbp}
          okText="連携中"
          ngText="未連携"
        />
        <CountCard icon={<CalendarClock size={16} />} label="予約中" value={scheduled} />
        <CountCard icon={<Sparkles size={16} />} label="投稿済" value={published} />
      </div>

      {/* Primary CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4"
      >
        <Link href="/create">
          <div
            className="flex items-center gap-3 rounded-[22px] p-5 text-white shadow-[var(--shadow-glow)]"
            style={{ background: "var(--grad-brand)" }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Plus size={26} />
            </span>
            <div className="flex-1">
              <p className="text-base font-black">最初の投稿をつくる</p>
              <p className="text-[12px] opacity-90">写真を1枚選ぶだけ。AIが文章を作ります。</p>
            </div>
            <ArrowRight size={20} />
          </div>
        </Link>
      </motion.div>

      {/* Analytics placeholder (real insights come later) */}
      <div className="mt-5">
        <SectionTitle>分析</SectionTitle>
        {published === 0 ? (
          <div className="glass flex flex-col items-center gap-2 py-10 text-center">
            <BarChart3 size={28} className="text-[var(--fg-faint)]" />
            <p className="text-sm font-bold">まだデータがありません</p>
            <p className="max-w-[240px] text-[12px] text-[var(--fg-faint)]">
              投稿を始めると、フォロワー推移やエンゲージメントがここに表示されます。
            </p>
          </div>
        ) : (
          <div className="glass flex flex-col items-center gap-2 py-10 text-center">
            <BarChart3 size={28} className="text-[var(--brand-2)]" />
            <p className="text-sm font-bold">データ収集中…</p>
            <p className="max-w-[260px] text-[12px] text-[var(--fg-faint)]">
              Instagramインサイトの取り込みは順次対応します。
            </p>
          </div>
        )}
      </div>

      {assets.length > 0 && (
        <div className="mt-5">
          <SectionTitle>つくった投稿 ({assets.length})</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {assets.slice(0, 6).map((a) => (
              <div
                key={a.id}
                className="flex aspect-square items-center justify-center rounded-2xl text-2xl"
                style={{ background: a.banner }}
              >
                {a.emoji}
              </div>
            ))}
          </div>
        </div>
      )}
    </Page>
  );
}

function StatusCard({
  icon,
  grad,
  title,
  ok,
  okText,
  ngText,
}: {
  icon: React.ReactNode;
  grad: string;
  title: string;
  ok: boolean;
  okText: string;
  ngText: string;
}) {
  return (
    <div className="glass flex items-center gap-2.5 p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: grad }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className={`text-[10px] ${ok ? "text-[var(--ok)]" : "text-[var(--fg-faint)]"}`}>
          ● {ok ? okText : ngText}
        </p>
      </div>
    </div>
  );
}

function CountCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="glass p-3">
      <p className="flex items-center gap-1 text-[11px] text-[var(--fg-faint)]">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}
