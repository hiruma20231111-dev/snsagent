"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, CalendarDays, MessageCircle, Settings, Plus } from "lucide-react";

const items = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/calendar", label: "予約", icon: CalendarDays },
  { href: "/create", label: "投稿", icon: Plus, center: true },
  { href: "/inbox", label: "受信", icon: MessageCircle },
  { href: "/settings", label: "設定", icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px]">
      <div className="mx-3 mb-3 flex items-end justify-around rounded-[26px] border border-white/12 bg-[#15131f]/90 px-2 py-2.5 backdrop-blur-xl">
        {items.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href;
          if (center) {
            return (
              <Link key={href} href={href} className="-mt-7">
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[var(--shadow-glow)]"
                  style={{ background: "var(--grad-brand)" }}
                >
                  <Icon size={26} strokeWidth={2.4} />
                </motion.div>
              </Link>
            );
          }
          return (
            <Link
              key={href}
              href={href}
              className="relative flex w-14 flex-col items-center gap-1 py-1"
            >
              <Icon
                size={22}
                className={active ? "text-white" : "text-[var(--fg-faint)]"}
                strokeWidth={active ? 2.6 : 2}
              />
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-white" : "text-[var(--fg-faint)]"
                }`}
              >
                {label}
              </span>
              {active && (
                <motion.span
                  layoutId="nav-dot"
                  className="absolute -bottom-0.5 h-1 w-1 rounded-full"
                  style={{ background: "var(--brand-2)" }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
