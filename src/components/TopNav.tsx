"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  CalendarDays,
  MessageCircle,
  Settings,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";

// Genre-based menus, shown as horizontally-scrollable tabs at the TOP of the
// app (replaces the old bottom-nav / left-sidebar). Each genre is its own tab
// so the single "投稿" page no longer carries everything.
const items = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/create", label: "投稿をつくる", icon: Plus },
  { href: "/autopilot", label: "おまかせ", icon: Sparkles },
  { href: "/calendar", label: "予約", icon: CalendarDays },
  { href: "/rank", label: "順位", icon: TrendingUp },
  { href: "/inbox", label: "受信", icon: MessageCircle },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-white/8 bg-[#0b0a14]/85 backdrop-blur-xl">
      <div className="no-scrollbar mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const isCreate = href === "/create";
          return (
            <Link key={href} href={href} className="shrink-0">
              <motion.div
                whileTap={{ scale: 0.95 }}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold transition-colors ${
                  active
                    ? "text-white"
                    : isCreate
                    ? "text-white"
                    : "text-[var(--fg-dim)] hover:bg-white/5"
                }`}
                style={
                  active
                    ? { background: "var(--grad-brand)" }
                    : isCreate
                    ? { background: "var(--grad-brand-soft)", border: "1px solid var(--border-strong)" }
                    : undefined
                }
              >
                <Icon size={16} strokeWidth={active ? 2.6 : 2.1} />
                {label}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
