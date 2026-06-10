"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Sparkles, CalendarCheck, MessageCircleHeart } from "lucide-react";

const features = [
  { icon: Camera, text: "写真1枚アップするだけ" },
  { icon: Sparkles, text: "AIがキャプション＆バナーを自動生成" },
  { icon: CalendarCheck, text: "Instagram & GBP に同時予約投稿" },
  { icon: MessageCircleHeart, text: "DM・口コミも自動で接客" },
];

export default function Landing() {
  return (
    <div className="app-shell flex flex-col items-center px-6 pb-10 pt-16 text-center lg:mx-auto lg:max-w-[480px]">
      <motion.div
        initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-[var(--shadow-glow)]"
        style={{ background: "var(--grad-brand)" }}
      >
        <span className="text-4xl font-black">L</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-7 text-4xl font-black leading-tight tracking-tight"
      >
        写真は撮るだけ。
        <br />
        あとは<span className="text-gradient">AI</span>が
        <br />
        ブランドを創る。
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--fg-dim)]"
      >
        実店舗のためのAI SNSオートパイロット。
        Instagramを一度も開かずに、運用のすべてがここで完結します。
      </motion.p>

      <div className="mt-9 w-full space-y-2.5">
        {features.map(({ icon: Icon, text }, i) => (
          <motion.div
            key={text}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass flex items-center gap-3 px-4 py-3 text-left"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
              style={{ background: "var(--grad-brand-soft)" }}
            >
              <Icon size={18} className="text-white" />
            </span>
            <span className="text-sm font-medium">{text}</span>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-10 w-full"
      >
        <Link href="/dashboard">
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.02 }}
            className="w-full rounded-2xl py-4 text-base font-bold text-white shadow-[var(--shadow-glow)]"
            style={{ background: "var(--grad-brand)" }}
          >
            無料ではじめる →
          </motion.button>
        </Link>
        <p className="mt-3 text-[11px] text-[var(--fg-faint)]">
          写真を1枚選ぶだけ。Instagram連携ですぐ使えます。
        </p>
      </motion.div>
    </div>
  );
}
