"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Send, Sparkles, Bot, Zap, Loader2 } from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, BottomSheet, Chip } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { Conversation } from "@/lib/types";

type Filter = "all" | "unread" | "instagram" | "gbp";

export default function InboxPage() {
  const { conversations: localConvos, rules, showToast } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Conversation | null>(null);

  // Real comments pulled from Instagram (graph.instagram.com). Falls back to
  // the local store conversations when the account isn't connected here.
  const [serverConvos, setServerConvos] = useState<Conversation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inbox")
      .then((r) => r.json())
      .then((d) => {
        if (d.connected && Array.isArray(d.conversations)) {
          setServerConvos(d.conversations as Conversation[]);
        } else {
          setServerConvos(null);
        }
      })
      .catch(() => setServerConvos(null))
      .finally(() => setLoading(false));
  }, []);

  // Local optimistic overlay for read/reply actions on server data.
  const [overrides, setOverrides] = useState<
    Record<string, { unread?: boolean; autoReplied?: boolean; extra?: Conversation["thread"] }>
  >({});

  const baseConvos = serverConvos ?? localConvos;
  const conversations: Conversation[] = baseConvos.map((c) => {
    const o = overrides[c.id];
    if (!o) return c;
    return {
      ...c,
      unread: o.unread ?? c.unread,
      autoReplied: o.autoReplied ?? c.autoReplied,
      thread: o.extra ? [...c.thread, ...o.extra] : c.thread,
      lastMessage: o.extra?.length ? o.extra[o.extra.length - 1].text : c.lastMessage,
    };
  });

  function markConversationRead(id: string) {
    setOverrides((p) => ({ ...p, [id]: { ...p[id], unread: false } }));
  }
  function replyToConversation(id: string, text: string, auto = false) {
    setOverrides((p) => ({
      ...p,
      [id]: {
        ...p[id],
        unread: false,
        autoReplied: auto || p[id]?.autoReplied,
        extra: [
          ...(p[id]?.extra ?? []),
          { from: "us" as const, text, auto, at: new Date().toISOString() },
        ],
      },
    }));
  }

  const filtered = conversations.filter((c) => {
    if (filter === "unread") return c.unread;
    if (filter === "instagram") return c.channel === "instagram";
    if (filter === "gbp") return c.channel === "gbp";
    return true;
  });

  const unreadCount = conversations.filter((c) => c.unread).length;
  const autoRate = conversations.length
    ? Math.round(
        (conversations.filter((c) => c.autoReplied).length / conversations.length) * 100
      )
    : 0;

  // find the open conversation's latest from-store state
  const active = open ? conversations.find((c) => c.id === open.id) ?? open : null;

  function suggestReply(c: Conversation): string {
    const text = c.thread[c.thread.length - 1]?.text ?? "";
    const rule = rules.find((r) => r.mode === "keyword" && r.enabled && text.includes(r.keyword));
    if (rule) return rule.reply;
    return "メッセージありがとうございます！詳しくはお気軽にお尋ねくださいね😊";
  }

  return (
    <Page>
      <h1 className="text-2xl font-black tracking-tight">受信ボックス</h1>
      <p className="mt-1 text-sm text-[var(--fg-dim)]">
        DM・コメント・口コミを1画面で接客
      </p>

      {/* stat strip */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="glass flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-2)]/20 text-[var(--brand-2)]">
            <Zap size={17} />
          </span>
          <div>
            <p className="text-lg font-black leading-none">{unreadCount}</p>
            <p className="text-[11px] text-[var(--fg-faint)]">未読</p>
          </div>
        </div>
        <div className="glass flex items-center gap-3 p-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ok)]/20 text-[var(--ok)]">
            <Bot size={17} />
          </span>
          <div>
            <p className="text-lg font-black leading-none">{autoRate}%</p>
            <p className="text-[11px] text-[var(--fg-faint)]">AI自動応答</p>
          </div>
        </div>
      </div>

      {/* filters */}
      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {(
          [
            ["all", "すべて"],
            ["unread", "未読"],
            ["instagram", "Instagram"],
            ["gbp", "GBP"],
          ] as [Filter, string][]
        ).map(([val, label]) => (
          <Chip key={val} active={filter === val} onClick={() => setFilter(val)}>
            {label}
          </Chip>
        ))}
      </div>

      {/* list */}
      {loading && (
        <div className="glass mt-4 flex items-center justify-center gap-2 py-12 text-[var(--fg-faint)]">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Instagramから取得中…</span>
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="glass mt-4 flex flex-col items-center gap-2 py-12 text-center">
          <Bot size={28} className="text-[var(--fg-faint)]" />
          <p className="text-sm font-bold">受信はまだありません</p>
          <p className="max-w-[250px] text-[12px] text-[var(--fg-faint)]">
            投稿に届いたコメントがここに集約されます。DM受信は申請後に対応予定です。
          </p>
        </div>
      )}
      <div className="mt-4 space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
        {filtered.map((c) => (
          <motion.button
            key={c.id}
            layout
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              markConversationRead(c.id);
              setOpen(c);
            }}
            className="glass flex w-full items-center gap-3 p-3 text-left"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/8 text-xl">
              {c.avatar}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#15131f]">
                {c.channel === "instagram" ? (
                  <Instagram size={11} className="text-[var(--brand-2)]" />
                ) : (
                  <MapPin size={11} className="text-[var(--brand-4)]" />
                )}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-bold">{c.user}</p>
                <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[9px] text-[var(--fg-faint)]">
                  {c.kind === "dm" ? "DM" : "コメント"}
                </span>
                {c.autoReplied && (
                  <span className="flex items-center gap-0.5 rounded-full bg-[var(--ok)]/15 px-1.5 py-0.5 text-[9px] font-semibold text-[var(--ok)]">
                    <Bot size={9} /> 自動
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-[12px] text-[var(--fg-dim)]">
                {c.lastMessage}
              </p>
            </div>
            {c.unread && (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--brand-2)" }} />
            )}
          </motion.button>
        ))}
      </div>

      {/* conversation thread */}
      <BottomSheet open={!!active} onClose={() => setOpen(null)} title={active?.user}>
        {active && (
          <ThreadView
            c={active}
            suggested={suggestReply(active)}
            onSend={(text, auto) => {
              replyToConversation(active.id, text, auto);
              if (auto) showToast("AIが自動返信しました🤖");
            }}
          />
        )}
      </BottomSheet>
    </Page>
  );
}

function ThreadView({
  c,
  suggested,
  onSend,
}: {
  c: Conversation;
  suggested: string;
  onSend: (text: string, auto: boolean) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex flex-col">
      <div className="mb-3 max-h-[40vh] space-y-2 overflow-y-auto no-scrollbar">
        <AnimatePresence initial={false}>
          {c.thread.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.from === "us" ? "text-white" : "bg-white/8"
                }`}
                style={m.from === "us" ? { background: "var(--grad-brand)" } : undefined}
              >
                {m.auto && (
                  <span className="mb-1 flex items-center gap-1 text-[10px] opacity-80">
                    <Bot size={10} /> AI自動返信
                  </span>
                )}
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* AI suggestion */}
      <button
        onClick={() => setDraft(suggested)}
        className="mb-3 flex items-start gap-2 rounded-2xl border border-[var(--brand-3)]/30 bg-[var(--brand-3)]/10 p-3 text-left"
      >
        <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--brand-2)]" />
        <div>
          <p className="text-[10px] font-bold text-[var(--brand-2)]">AIの返信案（タップで挿入）</p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-dim)]">{suggested}</p>
        </div>
      </button>

      {/* composer */}
      <div className="flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="メッセージを入力…"
          className="glass max-h-24 flex-1 resize-none px-3.5 py-2.5 text-sm outline-none"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={!draft.trim()}
          onClick={() => {
            onSend(draft.trim(), false);
            setDraft("");
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white disabled:opacity-40"
          style={{ background: "var(--grad-brand)" }}
        >
          <Send size={17} />
        </motion.button>
      </div>
      <button
        onClick={() => {
          onSend(suggested, true);
          setDraft("");
        }}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/6 py-2.5 text-xs font-semibold text-[var(--fg-dim)]"
      >
        <Bot size={14} /> AIにまかせて自動返信
      </button>
    </div>
  );
}
