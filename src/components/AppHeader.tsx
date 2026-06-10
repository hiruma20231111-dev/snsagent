"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Instagram } from "@/components/icons";
import { useApp } from "@/lib/store";

export default function AppHeader() {
  const { company } = useApp();
  const connected = company.connected.instagram;
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <motion.div
          initial={{ rotate: -8, scale: 0.9 }}
          animate={{ rotate: 0, scale: 1 }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: "var(--grad-brand)" }}
        >
          <span className="text-lg font-black">L</span>
        </motion.div>
        <div className="leading-none">
          <p className="text-[15px] font-extrabold tracking-tight">Lumina</p>
          <p className="mt-0.5 text-[11px] text-[var(--fg-faint)]">{company.name}</p>
        </div>
      </div>

      {/* Always-visible connection status */}
      <Link
        href="/settings"
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
          connected
            ? "border-[var(--ok)]/30 bg-[var(--ok)]/10"
            : "border-white/12 bg-white/5"
        }`}
      >
        <Instagram
          size={13}
          className={connected ? "text-[var(--ok)]" : "text-[var(--fg-faint)]"}
        />
        <span
          className={`max-w-[110px] truncate text-[11px] font-bold ${
            connected ? "text-[var(--ok)]" : "text-[var(--fg-faint)]"
          }`}
        >
          {connected ? company.igHandle : "未連携"}
        </span>
      </Link>
    </header>
  );
}
