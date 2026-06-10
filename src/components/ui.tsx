"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { X } from "lucide-react";

// ---------- Button ----------
export function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "soft" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base =
    "relative inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none select-none";
  const styles = {
    primary: "text-white shadow-[var(--shadow-glow)]",
    soft: "bg-white/8 text-[var(--fg)] border border-white/10",
    ghost: "text-[var(--fg-dim)] hover:text-white",
    danger: "bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30",
  }[variant];
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      className={`${base} ${styles} ${className}`}
      style={variant === "primary" ? { background: "var(--grad-brand)" } : undefined}
    >
      {children}
    </motion.button>
  );
}

// ---------- Chip ----------
export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors border ${
        active
          ? "text-white border-transparent"
          : "text-[var(--fg-dim)] border-white/12 bg-white/5"
      }`}
      style={active ? { background: "var(--grad-brand)" } : undefined}
    >
      {children}
    </motion.button>
  );
}

// ---------- Toggle ----------
export function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        on ? "" : "bg-white/12"
      }`}
      style={on ? { background: "var(--grad-brand)" } : undefined}
      aria-pressed={on}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
        style={{ left: on ? 24 : 4 }}
      />
    </button>
  );
}

// ---------- Bottom Sheet ----------
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[480px] rounded-t-[28px] border-t border-white/12 bg-[#15131f] p-5 pb-8"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
            {title && (
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold">{title}</h3>
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/8 p-1.5 text-[var(--fg-dim)]"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="max-h-[70vh] overflow-y-auto no-scrollbar">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- Section header ----------
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

// ---------- Animated page wrapper ----------
export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="px-4 pb-28 pt-4"
    >
      {children}
    </motion.div>
  );
}
