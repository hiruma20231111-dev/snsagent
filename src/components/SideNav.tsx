"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CalendarDays, MessageCircle, Settings, Plus } from "lucide-react";
import { Instagram } from "@/components/icons";
import { useApp } from "@/lib/store";

const items = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/create", label: "投稿をつくる", icon: Plus },
  { href: "/calendar", label: "予約カレンダー", icon: CalendarDays },
  { href: "/inbox", label: "受信ボックス", icon: MessageCircle },
  { href: "/settings", label: "設定", icon: Settings },
];

// Desktop-only left sidebar. Hidden on mobile (bottom nav takes over).
export default function SideNav() {
  const pathname = usePathname();
  const { company } = useApp();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-white/8 px-4 py-6 lg:flex">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          <span className="text-xl font-black">L</span>
        </div>
        <div className="leading-none">
          <p className="text-base font-extrabold tracking-tight">Lumina</p>
          <p className="mt-1 text-[11px] text-[var(--fg-faint)]">{company.name}</p>
        </div>
      </div>

      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const isCreate = href === "/create";
        return (
          <Link key={href} href={href}>
            <motion.div
              whileHover={{ x: 3 }}
              className={`relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ${
                active
                  ? "text-white"
                  : isCreate
                  ? "text-white"
                  : "text-[var(--fg-dim)] hover:bg-white/5"
              }`}
              style={
                active
                  ? { background: "var(--card-strong)", border: "1px solid var(--border-strong)" }
                  : isCreate
                  ? { background: "var(--grad-brand)" }
                  : undefined
              }
            >
              <Icon size={19} strokeWidth={active || isCreate ? 2.5 : 2} />
              {label}
              {active && (
                <motion.span
                  layoutId="side-dot"
                  className="absolute right-3 h-2 w-2 rounded-full"
                  style={{ background: "var(--brand-2)" }}
                />
              )}
            </motion.div>
          </Link>
        );
      })}

      <div className="mt-auto">
        <Link href="/settings">
          <div
            className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 ${
              company.connected.instagram
                ? "border-[var(--ok)]/30 bg-[var(--ok)]/10"
                : "border-white/10 bg-white/5"
            }`}
          >
            <Instagram
              size={17}
              className={
                company.connected.instagram ? "text-[var(--ok)]" : "text-[var(--fg-faint)]"
              }
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-bold">
                {company.connected.instagram ? company.igHandle : "未連携"}
              </p>
              <p className="text-[10px] text-[var(--fg-faint)]">
                {company.connected.instagram ? "Instagram連携中" : "タップして連携"}
              </p>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );
}
