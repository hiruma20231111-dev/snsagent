"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Repeat,
  Pause,
  Play,
  Trash2,
  Minus,
  Plus,
  AlertTriangle,
  Zap,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, BottomSheet, Button, Chip, Toggle } from "@/components/ui";
import { useApp } from "@/lib/store";
import { BANNER_GRADIENTS } from "@/lib/mock-data";
import type { Channel, Recurrence, PostSchedule, Asset } from "@/lib/types";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const {
    company,
    assets,
    schedules,
    addAsset,
    addSchedule,
    updateSchedule,
    removeSchedule,
    pauseAllSchedules,
    showToast,
  } = useApp();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<Date | null>(null);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  // build the month grid
  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(cursor.y, cursor.m, d));
    return arr;
  }, [cursor]);

  function schedulesOn(date: Date) {
    return schedules.filter((s) => {
      const d = new Date(s.at);
      return (
        d.getFullYear() === date.getFullYear() &&
        d.getMonth() === date.getMonth() &&
        d.getDate() === date.getDate()
      );
    });
  }

  const upcoming = schedules
    .filter((s) => new Date(s.at).getTime() >= Date.now() - 86400000)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const m = c.m + delta;
      return { y: c.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
    });
  }

  // ----- 臨時休業 macro -----
  async function runEmergencyClosure() {
    setEmergencyOpen(false);
    pauseAllSchedules();
    showToast("AIが臨時休業バナーを生成中…");
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hint: "臨時休業", tone: "polite", brandName: company.name }),
    });
    void res;
    const assetId = "ast_emg_" + Date.now();
    addAsset({
      id: assetId,
      companyId: company.id,
      title: "本日 臨時休業",
      caption:
        "いつもありがとうございます。本日は都合により臨時休業とさせていただきます。ご不便をおかけしますが、何卒よろしくお願いいたします。",
      hashtags: ["#臨時休業", "#お知らせ"],
      banner: "linear-gradient(135deg,#5b6dff,#b026ff)",
      emoji: "🙇",
      templateId: "tpl_notice",
      createdAt: new Date().toISOString(),
    });
    addSchedule({
      id: "sch_emg_" + Date.now(),
      companyId: company.id,
      assetId,
      channels: ["instagram", "gbp"],
      formats: ["feed", "story", "gbp_update"],
      at: new Date().toISOString(),
      recurrence: "none",
      status: "published",
      postOnClosedDays: true,
    });
    setTimeout(
      () => showToast("臨時休業をInstagram・GBPへ緊急投稿しました。既存予約は一時停止中。"),
      1400
    );
  }

  const monthLabel = `${cursor.y}年 ${cursor.m + 1}月`;

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">予約カレンダー</h1>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setEmergencyOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/15 px-3 py-2 text-xs font-bold text-[var(--danger)]"
        >
          <AlertTriangle size={14} /> 臨時休業
        </motion.button>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
      {/* month nav */}
      <div className="glass p-4 lg:p-6">
        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shiftMonth(-1)} className="rounded-full bg-white/8 p-1.5">
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-bold">{monthLabel}</p>
          <button onClick={() => shiftMonth(1)} className="rounded-full bg-white/8 p-1.5">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WD.map((w, i) => (
            <div
              key={w}
              className={`pb-1 text-[10px] font-bold ${
                i === 0 ? "text-[var(--danger)]" : i === 6 ? "text-[var(--brand-4)]" : "text-[var(--fg-faint)]"
              }`}
            >
              {w}
            </div>
          ))}
          {cells.map((date, i) => {
            if (!date) return <div key={i} />;
            const items = schedulesOn(date);
            const isClosed = company.closedDays.includes(date.getDay());
            const isToday = sameDay(date, new Date());
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                onClick={() => setPicked(date)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl text-xs ${
                  isToday ? "text-white" : "text-[var(--fg-dim)]"
                } ${isClosed ? "opacity-50" : ""}`}
                style={isToday ? { background: "var(--grad-brand)" } : undefined}
              >
                <span className="font-semibold">{date.getDate()}</span>
                {isClosed && <span className="text-[7px] leading-none">休</span>}
                {items.length > 0 && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {items.slice(0, 3).map((s, idx) => (
                      <span
                        key={idx}
                        className="h-1 w-1 rounded-full"
                        style={{
                          background:
                            s.status === "published"
                              ? "var(--ok)"
                              : s.status === "paused"
                              ? "var(--fg-faint)"
                              : "var(--brand-2)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-center gap-3 text-[10px] text-[var(--fg-faint)]">
          <Legend color="var(--brand-2)" label="予約" />
          <Legend color="var(--ok)" label="投稿済" />
          <Legend color="var(--fg-faint)" label="停止中" />
        </div>
      </div>

      {/* upcoming list */}
      <div className="min-w-0">
      <p className="mb-2 mt-5 text-sm font-bold lg:mt-0">今後の予約 ({upcoming.length})</p>
      <div className="space-y-2.5">
        {upcoming.map((s) => (
          <ScheduleRow
            key={s.id}
            s={s}
            asset={assets.find((a) => a.id === s.assetId)}
            onToggle={() =>
              updateSchedule(s.id, {
                status: s.status === "paused" ? "scheduled" : "paused",
              })
            }
            onDelete={() => {
              removeSchedule(s.id);
              showToast("予約を削除しました");
            }}
          />
        ))}
        {upcoming.length === 0 && (
          <div className="glass py-8 text-center text-sm text-[var(--fg-faint)]">
            予約はまだありません。日付をタップして追加できます。
          </div>
        )}
      </div>
      </div>
      </div>

      {/* new schedule sheet */}
      <NewScheduleSheet
        date={picked}
        onClose={() => setPicked(null)}
        closedDays={company.closedDays}
        onCreate={(payload) => {
          const assetId = "ast_q_" + Date.now();
          addAsset({
            id: assetId,
            companyId: company.id,
            title: "新しい投稿",
            caption: "AIで生成した内容がここに入ります。",
            hashtags: ["#お店", "#おすすめ"],
            banner: payload.banner,
            emoji: "✨",
            templateId: "tpl_minimal",
            createdAt: new Date().toISOString(),
          });
          addSchedule({
            id: "sch_q_" + Date.now(),
            companyId: company.id,
            assetId,
            channels: payload.channels,
            formats: payload.channels.includes("gbp") ? ["feed", "gbp_update"] : ["feed"],
            at: payload.at,
            recurrence: payload.recurrence,
            status: "scheduled",
            postOnClosedDays: payload.postOnClosedDays,
          });
          setPicked(null);
          showToast("予約を追加しました📅");
        }}
      />

      {/* emergency confirm */}
      <BottomSheet
        open={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        title="臨時休業モード"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <p className="text-sm leading-relaxed">
              ワンタップで以下を<strong>全自動</strong>で実行します：
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {[
              "既存の予約投稿をすべて一時停止",
              "AIが臨時休業バナーを即時生成",
              "Instagram・GBPへ緊急投稿",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5">
                <Zap size={15} className="text-[var(--warn)]" />
                {t}
              </li>
            ))}
          </ul>
          <Button variant="danger" onClick={runEmergencyClosure} className="w-full">
            <AlertTriangle size={16} /> 臨時休業を実行する
          </Button>
        </div>
      </BottomSheet>
    </Page>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function ScheduleRow({
  s,
  asset,
  onToggle,
  onDelete,
}: {
  s: PostSchedule;
  asset: Asset | undefined;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const d = new Date(s.at);
  const time = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass flex items-center gap-3 p-3 ${s.status === "paused" ? "opacity-60" : ""}`}
    >
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{ background: asset?.banner }}
      >
        {asset?.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{asset?.title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-faint)]">
          <span>{time}</span>
          {s.channels.includes("instagram") && <Instagram size={12} />}
          {s.channels.includes("gbp") && <MapPin size={12} />}
          {s.recurrence !== "none" && (
            <span className="flex items-center gap-0.5 text-[var(--brand-2)]">
              <Repeat size={11} />
              {s.recurrence === "weekly" ? "毎週" : "毎月"}
            </span>
          )}
          {s.status === "published" && <span className="text-[var(--ok)]">投稿済</span>}
          {s.status === "paused" && <span>停止中</span>}
        </div>
      </div>
      {s.status !== "published" && (
        <button onClick={onToggle} className="rounded-full bg-white/8 p-2">
          {s.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
      <button onClick={onDelete} className="rounded-full bg-white/8 p-2 text-[var(--fg-faint)]">
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

function NewScheduleSheet({
  date,
  onClose,
  closedDays,
  onCreate,
}: {
  date: Date | null;
  onClose: () => void;
  closedDays: number[];
  onCreate: (p: {
    at: string;
    channels: Channel[];
    recurrence: Recurrence;
    postOnClosedDays: boolean;
    banner: string;
  }) => void;
}) {
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [channels, setChannels] = useState<Channel[]>(["instagram", "gbp"]);
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const [postOnClosed, setPostOnClosed] = useState(false);

  const isClosedDay = date ? closedDays.includes(date.getDay()) : false;

  function step(setter: (fn: (v: number) => number) => void, delta: number, max: number) {
    setter((v) => (v + delta + max) % max);
  }
  function toggle(c: Channel) {
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  return (
    <BottomSheet
      open={!!date}
      onClose={onClose}
      title={
        date
          ? `${date.getMonth() + 1}月${date.getDate()}日（${WD[date.getDay()]}）に予約`
          : ""
      }
    >
      {date && (
        <div className="space-y-5">
          {/* time pochi-pochi */}
          <div>
            <p className="mb-2 text-sm font-bold">時間</p>
            <div className="flex items-center justify-center gap-4">
              <Stepper
                value={hour}
                label="時"
                onMinus={() => step(setHour as never, -1, 24)}
                onPlus={() => step(setHour as never, 1, 24)}
              />
              <span className="text-2xl font-black">:</span>
              <Stepper
                value={minute}
                label="分"
                pad
                onMinus={() => setMinute((m) => (m + 60 - 5) % 60)}
                onPlus={() => setMinute((m) => (m + 5) % 60)}
              />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              {[
                [7, 30],
                [12, 0],
                [18, 0],
                [21, 0],
              ].map(([h, m]) => (
                <Chip
                  key={`${h}:${m}`}
                  active={hour === h && minute === m}
                  onClick={() => {
                    setHour(h);
                    setMinute(m);
                  }}
                >
                  {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}
                </Chip>
              ))}
            </div>
          </div>

          {/* channels */}
          <div>
            <p className="mb-2 text-sm font-bold">投稿先</p>
            <div className="flex gap-2">
              <SheetChannel
                active={channels.includes("instagram")}
                onClick={() => toggle("instagram")}
                icon={<Instagram size={15} />}
                label="Instagram"
              />
              <SheetChannel
                active={channels.includes("gbp")}
                onClick={() => toggle("gbp")}
                icon={<MapPin size={15} />}
                label="GBP"
              />
            </div>
          </div>

          {/* recurrence */}
          <div>
            <p className="mb-2 text-sm font-bold">繰り返し</p>
            <div className="flex gap-2">
              {(
                [
                  ["none", "単発"],
                  ["weekly", "毎週"],
                  ["monthly", "毎月"],
                ] as [Recurrence, string][]
              ).map(([val, label]) => (
                <Chip key={val} active={recurrence === val} onClick={() => setRecurrence(val)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          {/* closed-day handling */}
          {isClosedDay && (
            <div className="flex items-center justify-between rounded-2xl border border-[var(--warn)]/30 bg-[var(--warn)]/10 px-4 py-3">
              <div>
                <p className="text-sm font-bold">この日は定休日です</p>
                <p className="text-[11px] text-[var(--fg-dim)]">
                  {postOnClosed ? "定休日でも投稿します" : "投稿をスキップします"}
                </p>
              </div>
              <Toggle on={postOnClosed} onChange={setPostOnClosed} />
            </div>
          )}

          <Button
            onClick={() => {
              const at = new Date(date);
              at.setHours(hour, minute, 0, 0);
              const banner =
                BANNER_GRADIENTS[Math.floor(Math.random() * BANNER_GRADIENTS.length)];
              onCreate({
                at: at.toISOString(),
                channels,
                recurrence,
                postOnClosedDays: postOnClosed,
                banner,
              });
            }}
            className="w-full"
            disabled={channels.length === 0}
          >
            この日時で予約する
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

function Stepper({
  value,
  label,
  pad,
  onMinus,
  onPlus,
}: {
  value: number;
  label: string;
  pad?: boolean;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onPlus}
        className="rounded-full bg-white/8 p-2"
      >
        <Plus size={18} />
      </motion.button>
      <div className="flex h-16 w-20 flex-col items-center justify-center rounded-2xl glass-strong">
        <span className="text-3xl font-black tabular-nums">
          {pad ? String(value).padStart(2, "0") : value}
        </span>
        <span className="text-[10px] text-[var(--fg-faint)]">{label}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onMinus}
        className="rounded-full bg-white/8 p-2"
      >
        <Minus size={18} />
      </motion.button>
    </div>
  );
}

function SheetChannel({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-bold ${
        active ? "text-white" : "bg-white/5 text-[var(--fg-faint)] border border-white/10"
      }`}
      style={active ? { background: "var(--grad-brand)" } : undefined}
    >
      {icon}
      {label}
    </motion.button>
  );
}
