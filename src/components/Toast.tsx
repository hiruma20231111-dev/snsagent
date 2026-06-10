"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";

export default function Toast() {
  const { toast } = useApp();
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed inset-x-0 top-3 z-[60] mx-auto flex max-w-[440px] items-center gap-2.5 px-4"
        >
          <div className="flex w-full items-center gap-2.5 rounded-2xl border border-white/15 bg-[#1b1828]/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <Sparkles size={15} />
            </span>
            <span className="text-sm font-medium">{toast}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
