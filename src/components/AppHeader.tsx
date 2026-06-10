"use client";

import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { useApp } from "@/lib/store";

export default function AppHeader() {
  const { company } = useApp();
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
      <div className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5">
        <Zap size={13} className="text-[var(--warn)]" fill="currentColor" />
        <span className="text-xs font-bold">{company.credits}</span>
        <span className="text-[10px] text-[var(--fg-faint)]">クレジット</span>
      </div>
    </header>
  );
}
