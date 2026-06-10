"use client";

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
} from "recharts";
import { TrendingUp, TrendingDown, MapPin, ArrowRight } from "lucide-react";
import { Instagram } from "@/components/icons";
import Link from "next/link";
import { Page, SectionTitle } from "@/components/ui";
import {
  demoMetrics,
  followerTrend,
  engagementByFormat,
  bestHours,
} from "@/lib/mock-data";

const DONUT_COLORS = ["#ff2e74", "#b026ff", "#5b6dff", "#2ee6a6"];

export default function Dashboard() {
  return (
    <Page>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5"
      >
        <p className="text-sm text-[var(--fg-dim)]">おはようございます☀️</p>
        <h1 className="text-2xl font-black tracking-tight">今日も伸びてます</h1>
      </motion.div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 gap-3">
        {demoMetrics.map((m, i) => {
          const up = m.delta >= 0;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="glass p-4"
            >
              <p className="text-[11px] text-[var(--fg-faint)]">{m.label}</p>
              <p className="mt-1 text-xl font-black">{m.value}</p>
              <p
                className={`mt-1 flex items-center gap-1 text-[11px] font-bold ${
                  up ? "text-[var(--ok)]" : "text-[var(--danger)]"
                }`}
              >
                {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {up ? "+" : ""}
                {m.delta}%
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Follower trend */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="glass mt-4 p-4"
      >
        <SectionTitle>フォロワー推移（14日）</SectionTitle>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={followerTrend} margin={{ left: 0, right: 0, top: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff2e74" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#b026ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{
                  background: "#1b1828",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#b4afce" }}
                formatter={(v) => [Number(v).toLocaleString(), "フォロワー"]}
                labelFormatter={() => ""}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ff2e74"
                strokeWidth={2.5}
                fill="url(#fg)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Engagement + best hours */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-4"
        >
          <p className="mb-1 text-sm font-bold">投稿タイプ別</p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={engagementByFormat}
                  dataKey="value"
                  innerRadius={28}
                  outerRadius={48}
                  paddingAngle={3}
                  stroke="none"
                >
                  {engagementByFormat.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 space-y-0.5">
            {engagementByFormat.map((e, i) => (
              <div key={e.name} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: DONUT_COLORS[i] }}
                />
                <span className="text-[var(--fg-dim)]">{e.name}</span>
                <span className="ml-auto font-bold">{e.value}%</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36 }}
          className="glass p-4"
        >
          <p className="mb-1 text-sm font-bold">伸びる時間帯</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bestHours} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "#837ea0", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                  {bestHours.map((b, i) => (
                    <Cell
                      key={i}
                      fill={b.score > 85 ? "#ff2e74" : "rgba(176,38,255,0.45)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-[var(--fg-faint)]">
            🔥 18時が最も反応◎。AIが自動でこの時間に予約します。
          </p>
        </motion.div>
      </div>

      {/* Channel status */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        className="mt-4"
      >
        <SectionTitle
          action={
            <Link
              href="/calendar"
              className="flex items-center gap-1 text-xs font-semibold text-[var(--brand-2)]"
            >
              予約を見る <ArrowRight size={13} />
            </Link>
          }
        >
          連携チャネル
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <div className="glass flex items-center gap-2.5 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff7a45] to-[#ff2e74] text-white">
              <Instagram size={18} />
            </span>
            <div>
              <p className="text-sm font-bold">Instagram</p>
              <p className="text-[10px] text-[var(--ok)]">● 連携中</p>
            </div>
          </div>
          <div className="glass flex items-center gap-2.5 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2ee6a6] to-[#5b6dff] text-white">
              <MapPin size={18} />
            </span>
            <div>
              <p className="text-sm font-bold">GBP</p>
              <p className="text-[10px] text-[var(--ok)]">● 連携中</p>
            </div>
          </div>
        </div>
      </motion.div>
    </Page>
  );
}
