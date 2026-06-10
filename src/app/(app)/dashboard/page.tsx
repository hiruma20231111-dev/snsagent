"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  Plus,
  CalendarClock,
  BarChart3,
  Sparkles,
  Users,
  UserPlus,
  Eye,
  Grid3x3,
  Loader2,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, SectionTitle } from "@/components/ui";
import { useApp } from "@/lib/store";

interface Insights {
  connected: boolean;
  username?: string | null;
  accountType?: string | null;
  followersCount?: number | null;
  followsCount?: number | null;
  mediaCount?: number | null;
  reach7d?: number | null;
  insightsAvailable?: boolean;
  error?: string;
}

interface IgPost {
  id: string;
  caption: string | null;
  mediaType: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  timestamp: string | null;
  likeCount: number | null;
  commentsCount: number | null;
}

export default function Dashboard() {
  const { company, schedules } = useApp();
  const igConnected = company.connected.instagram;
  const scheduled = schedules.filter((s) => s.status === "scheduled").length;

  const [insights, setInsights] = useState<Insights | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [posts, setPosts] = useState<IgPost[] | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // "投稿済" reflects the real number of posts on the connected account
  // (so a successful "今すぐ投稿" actually shows up here). Falls back to the
  // local published-schedule count when not connected.
  const published =
    typeof insights?.mediaCount === "number"
      ? insights.mediaCount
      : schedules.filter((s) => s.status === "published").length;

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then(setInsights)
      .catch(() => setInsights(null))
      .finally(() => setLoadingInsights(false));
    fetch("/api/media")
      .then((r) => r.json())
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : null))
      .catch(() => setPosts(null))
      .finally(() => setLoadingPosts(false));
  }, []);

  const hasRealStats =
    insights?.connected && typeof insights.followersCount === "number";

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

      {/* Real Instagram analytics */}
      <div className="mt-5">
        <SectionTitle>
          {hasRealStats ? `分析（${insights?.username ? "@" + insights.username : "Instagram"}）` : "分析"}
        </SectionTitle>

        {loadingInsights ? (
          <div className="glass flex items-center justify-center gap-2 py-10 text-[var(--fg-faint)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Instagramから取得中…</span>
          </div>
        ) : hasRealStats ? (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <RealStat
                icon={<Users size={16} />}
                label="フォロワー"
                value={insights?.followersCount}
              />
              <RealStat
                icon={<UserPlus size={16} />}
                label="フォロー中"
                value={insights?.followsCount}
              />
              <RealStat
                icon={<Grid3x3 size={16} />}
                label="投稿"
                value={insights?.mediaCount}
              />
              <RealStat
                icon={<Eye size={16} />}
                label="リーチ(7日)"
                value={insights?.reach7d}
                fallback={insights?.insightsAvailable ? undefined : "—"}
              />
            </div>
            <p className="mt-2 text-center text-[10px] text-[var(--fg-faint)]">
              {insights?.username ? `@${insights.username} の実データ` : "実データ"}
              {!insights?.insightsAvailable &&
                "・リーチ等の詳細インサイトは数日分のデータが溜まると表示されます"}
            </p>
          </>
        ) : igConnected ? (
          <div className="glass flex flex-col items-center gap-2 py-10 text-center">
            <BarChart3 size={28} className="text-[var(--fg-faint)]" />
            <p className="text-sm font-bold">数字を取得できませんでした</p>
            <p className="max-w-[260px] text-[12px] text-[var(--fg-faint)]">
              {insights?.error
                ? "Instagram: " + insights.error
                : "少し時間をおいて再読み込みしてください。"}
            </p>
          </div>
        ) : (
          <div className="glass flex flex-col items-center gap-2 py-10 text-center">
            <BarChart3 size={28} className="text-[var(--fg-faint)]" />
            <p className="text-sm font-bold">まだデータがありません</p>
            <p className="max-w-[240px] text-[12px] text-[var(--fg-faint)]">
              Instagramを連携すると、フォロワー数やリーチがここに表示されます。
            </p>
          </div>
        )}
      </div>

      {/* Real Instagram posts feed */}
      <div className="mt-5">
        <SectionTitle>最近の投稿{posts && posts.length > 0 ? ` (${posts.length})` : ""}</SectionTitle>
        {loadingPosts ? (
          <div className="glass flex items-center justify-center gap-2 py-8 text-[var(--fg-faint)]">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">投稿を取得中…</span>
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
            {posts.map((p) => (
              <a
                key={p.id}
                href={p.permalink ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="group relative aspect-square overflow-hidden rounded-2xl bg-white/5"
              >
                {p.thumbnailUrl || p.mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(p.thumbnailUrl ?? p.mediaUrl) as string}
                    alt={p.caption ?? ""}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--fg-faint)]">
                    <Grid3x3 size={20} />
                  </div>
                )}
                {typeof p.commentsCount === "number" && (
                  <span className="absolute bottom-1 right-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur">
                    💬 {p.commentsCount}
                  </span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <div className="glass flex flex-col items-center gap-2 py-8 text-center">
            <Grid3x3 size={26} className="text-[var(--fg-faint)]" />
            <p className="text-sm font-bold">表示できる投稿がありません</p>
            <p className="max-w-[260px] text-[12px] text-[var(--fg-faint)]">
              {igConnected
                ? "投稿するとここに表示されます。"
                : "Instagramを連携すると、実際の投稿がここに並びます。"}
            </p>
          </div>
        )}
      </div>
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

function RealStat({
  icon,
  label,
  value,
  fallback,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
  fallback?: string;
}) {
  const display =
    typeof value === "number" ? value.toLocaleString() : fallback ?? "—";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass p-4"
    >
      <p className="flex items-center gap-1 text-[11px] text-[var(--fg-faint)]">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-black">{display}</p>
    </motion.div>
  );
}
