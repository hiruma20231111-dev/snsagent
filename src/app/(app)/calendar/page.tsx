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
  Pencil,
} from "lucide-react";
import { Instagram } from "@/components/icons";
import { Page, BottomSheet, Button, Chip, Toggle } from "@/components/ui";
import { useApp } from "@/lib/store";
import { BANNER_GRADIENTS } from "@/lib/mock-data";
import { composeStoryImage } from "@/lib/story-image";
import type { Channel, Recurrence, PostSchedule, Asset, PostFormat } from "@/lib/types";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

export default function CalendarPage() {
  const {
    company,
    assets,
    schedules,
    addAsset,
    addSchedule,
    updateSchedule,
    updateAsset,
    removeSchedule,
    pauseAllSchedules,
    showToast,
  } = useApp();

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState<Date | null>(null);
  const [editing, setEditing] = useState<PostSchedule | null>(null);
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

  function assetOf(s: PostSchedule) {
    return assets.find((a) => a.id === s.assetId);
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
      format: "feed",
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
              const thumb = items.map(assetOf).find((a) => a?.previewImage)?.previewImage;
              const isClosed = company.closedDays.includes(date.getDay());
              const isToday = sameDay(date, new Date());
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => setPicked(date)}
                  className={`relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl text-xs ${
                    isToday ? "text-white" : "text-[var(--fg-dim)]"
                  } ${isClosed ? "opacity-50" : ""}`}
                  style={isToday ? { background: "var(--grad-brand)" } : undefined}
                >
                  {/* faint thumbnail of the day's first scheduled post */}
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-25"
                    />
                  )}
                  <span className="relative font-semibold">{date.getDate()}</span>
                  {isClosed && <span className="relative text-[7px] leading-none">休</span>}
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
                asset={assetOf(s)}
                onOpen={() => setEditing(s)}
                onToggle={() => {
                  const next = s.status === "paused" ? "scheduled" : "paused";
                  updateSchedule(s.id, { status: next });
                  serverPatch(s.id, { status: next });
                }}
                onDelete={() => {
                  removeSchedule(s.id);
                  serverDelete(s.id);
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

      {/* day sheet: preview that day's posts + add new */}
      <DaySheet
        date={picked}
        schedules={picked ? schedulesOn(picked) : []}
        assetOf={assetOf}
        onClose={() => setPicked(null)}
        onEdit={(s) => {
          setPicked(null);
          setEditing(s);
        }}
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
            format: "feed",
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

      {/* edit existing schedule (content + date/time + channels) */}
      <EditScheduleSheet
        schedule={editing}
        asset={editing ? assetOf(editing) : undefined}
        onClose={() => setEditing(null)}
        onSave={async ({ at, channels, asset }) => {
          if (!editing) return;
          const sid = editing.id;
          const a = assetOf(editing);
          const baseFormat: PostFormat = a?.format ?? "feed";
          updateSchedule(sid, {
            at,
            channels,
            formats: channels.includes("gbp") ? [baseFormat, "gbp_update"] : [baseFormat],
          });
          if (a) updateAsset(a.id, asset);
          setEditing(null);
          showToast("予約を更新しました✏️");

          // sync the cron ledger
          const isStory = baseFormat === "story";
          const serverCaption = isStory
            ? ""
            : `${asset.caption ?? ""}\n\n${(asset.hashtags ?? []).join(" ")}`.trim();
          const body: Record<string, unknown> = {
            scheduledAt: at,
            channels,
            title: asset.title,
            caption: serverCaption,
          };
          // For Stories, re-burn + re-upload so the auto-post reflects edits.
          if (isStory && a?.photo && asset.storyElements) {
            try {
              const full = await composeStoryImage({ photo: a.photo, elements: asset.storyElements });
              const up = await fetch("/api/upload", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ dataUrl: full }),
              }).then((r) => r.json());
              if (up.ok) body.imageUrl = up.url;
            } catch {
              /* keep existing server image */
            }
          }
          serverPatch(sid, body);
        }}
        onDelete={() => {
          if (!editing) return;
          serverDelete(editing.id);
          removeSchedule(editing.id);
          setEditing(null);
          showToast("予約を削除しました");
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

/** Small image (or gradient fallback) used as a row / sheet thumbnail. */
function Thumb({ asset, size = 44 }: { asset: Asset | undefined; size?: number }) {
  if (asset?.previewImage) {
    return (
      <img
        src={asset.previewImage}
        alt=""
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl text-lg"
      style={{ width: size, height: size, background: asset?.banner }}
    >
      {asset?.emoji ?? "✨"}
    </span>
  );
}

function ScheduleRow({
  s,
  asset,
  onOpen,
  onToggle,
  onDelete,
}: {
  s: PostSchedule;
  asset: Asset | undefined;
  onOpen: () => void;
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
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Thumb asset={asset} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{asset?.title}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--fg-faint)]">
            <span>{time}</span>
            {s.channels.includes("instagram") && <Instagram size={12} />}
            {s.channels.includes("gbp") && <MapPin size={12} />}
            {asset?.format === "story" && <span className="text-[var(--brand-3)]">ストーリーズ</span>}
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
      </button>
      {s.status !== "published" && (
        <>
          <button onClick={onOpen} className="rounded-full bg-white/8 p-2 text-[var(--brand-2)]">
            <Pencil size={14} />
          </button>
          <button onClick={onToggle} className="rounded-full bg-white/8 p-2">
            {s.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
          </button>
        </>
      )}
      <button onClick={onDelete} className="rounded-full bg-white/8 p-2 text-[var(--fg-faint)]">
        <Trash2 size={14} />
      </button>
    </motion.div>
  );
}

/** A day's posts (with preview) + a button to add a new one. */
function DaySheet({
  date,
  schedules,
  assetOf,
  onClose,
  onEdit,
  closedDays,
  onCreate,
}: {
  date: Date | null;
  schedules: PostSchedule[];
  assetOf: (s: PostSchedule) => Asset | undefined;
  onClose: () => void;
  onEdit: (s: PostSchedule) => void;
  closedDays: number[];
  onCreate: (p: {
    at: string;
    channels: Channel[];
    recurrence: Recurrence;
    postOnClosedDays: boolean;
    banner: string;
  }) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <BottomSheet
      open={!!date}
      onClose={() => {
        setAdding(false);
        onClose();
      }}
      title={
        date ? `${date.getMonth() + 1}月${date.getDate()}日（${WD[date.getDay()]}）` : ""
      }
    >
      {date && !adding && (
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <div className="glass py-8 text-center text-sm text-[var(--fg-faint)]">
              この日の予約はまだありません。
            </div>
          ) : (
            schedules.map((s) => {
              const a = assetOf(s);
              const d = new Date(s.at);
              return (
                <button
                  key={s.id}
                  onClick={() => onEdit(s)}
                  className="glass flex w-full items-center gap-3 p-3 text-left"
                >
                  <Thumb asset={a} size={56} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{a?.title}</p>
                    <p className="truncate text-[11px] text-[var(--fg-faint)]">{a?.caption}</p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--fg-dim)]">
                      <span>
                        {String(d.getHours()).padStart(2, "0")}:
                        {String(d.getMinutes()).padStart(2, "0")}
                      </span>
                      {s.channels.includes("instagram") && <Instagram size={12} />}
                      {s.channels.includes("gbp") && <MapPin size={12} />}
                      {a?.format === "story" && (
                        <span className="text-[var(--brand-3)]">ストーリーズ</span>
                      )}
                    </div>
                  </div>
                  <Pencil size={15} className="shrink-0 text-[var(--brand-2)]" />
                </button>
              );
            })
          )}
          <Button onClick={() => setAdding(true)} variant="soft" className="w-full">
            <Plus size={16} /> この日に新規予約
          </Button>
        </div>
      )}

      {date && adding && (
        <NewScheduleForm
          date={date}
          closedDays={closedDays}
          onBack={() => setAdding(false)}
          onCreate={onCreate}
        />
      )}
    </BottomSheet>
  );
}

function NewScheduleForm({
  date,
  closedDays,
  onBack,
  onCreate,
}: {
  date: Date;
  closedDays: number[];
  onBack: () => void;
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

  const isClosedDay = closedDays.includes(date.getDay());

  function toggle(c: Channel) {
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-xs font-semibold text-[var(--fg-dim)]">
        ← 一覧へ戻る
      </button>

      {/* time */}
      <div>
        <p className="mb-2 text-sm font-bold">時間</p>
        <div className="flex items-center justify-center gap-4">
          <Stepper
            value={hour}
            label="時"
            onMinus={() => setHour((v) => (v + 24 - 1) % 24)}
            onPlus={() => setHour((v) => (v + 1) % 24)}
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

      <ChannelRow channels={channels} onToggle={toggle} />

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
  );
}

/** Edit an existing schedule: preview, content, date+time, channels. */
function EditScheduleSheet({
  schedule,
  asset,
  onClose,
  onSave,
  onDelete,
}: {
  schedule: PostSchedule | null;
  asset: Asset | undefined;
  onClose: () => void;
  onSave: (p: { at: string; channels: Channel[]; asset: Partial<Asset> }) => void;
  onDelete: () => void;
}) {
  // local editable copies, re-seeded each time a different schedule opens
  const seed = schedule?.id ?? "";
  const [seedKey, setSeedKey] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState(18);
  const [minute, setMinute] = useState(0);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [preview, setPreview] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  if (schedule && seedKey !== seed) {
    const d = new Date(schedule.at);
    setSeedKey(seed);
    setDate(isoDate(d));
    setHour(d.getHours());
    setMinute(d.getMinutes());
    setChannels(schedule.channels);
    setTitle(asset?.title ?? "");
    setSubtitle(asset?.subtitle ?? "");
    setCaption(asset?.caption ?? "");
    setTags((asset?.hashtags ?? []).join(" "));
    setPreview(asset?.previewImage);
  }

  function toggle(c: Channel) {
    setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  }

  async function save() {
    if (!schedule) return;
    setBusy(true);
    const hashtags = tags
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    const patch: Partial<Asset> = { title, subtitle, caption, hashtags };

    // For Stories, re-burn the preview so text edits are reflected visually.
    if (asset?.format === "story" && asset.photo && asset.storyElements) {
      const els = asset.storyElements.map((e) => {
        if (e.id === "title") return { ...e, text: title };
        if (e.id === "subtitle") return { ...e, text: subtitle };
        if (e.id === "caption") return { ...e, text: caption };
        if (e.id === "hashtags") return { ...e, text: hashtags.join(" ") };
        return e;
      });
      patch.storyElements = els;
      try {
        patch.previewImage = await composeStoryImage({
          photo: asset.photo,
          elements: els,
          maxDim: 540,
          quality: 0.8,
        });
      } catch {
        /* keep existing preview */
      }
    }

    const at = new Date(`${date}T${pad(hour)}:${pad(minute)}:00`).toISOString();
    onSave({ at, channels, asset: patch });
    setBusy(false);
  }

  return (
    <BottomSheet open={!!schedule} onClose={onClose} title="予約を編集">
      {schedule && (
        <div className="space-y-5">
          {/* preview */}
          <div className="flex justify-center">
            {preview ? (
              <img
                src={preview}
                alt="プレビュー"
                className={`rounded-2xl object-cover ${
                  asset?.format === "story" ? "aspect-[9/16] w-40" : "aspect-square w-44"
                }`}
              />
            ) : (
              <div
                className="flex aspect-square w-44 items-center justify-center rounded-2xl text-3xl"
                style={{ background: asset?.banner }}
              >
                {asset?.emoji ?? "✨"}
              </div>
            )}
          </div>

          {/* content */}
          <div className="space-y-2.5">
            <SheetField label="見出し">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
            </SheetField>
            <SheetField label="サブ見出し">
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </SheetField>
            <SheetField label="キャプション">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
              />
            </SheetField>
            <SheetField label="ハッシュタグ（スペース区切り）">
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
              />
            </SheetField>
          </div>

          {/* date + time */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-[var(--fg-faint)]">投稿日</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-white/8 px-3 py-2.5 text-sm font-semibold outline-none [color-scheme:dark]"
            />
            <p className="mb-2 mt-3 text-sm font-bold">時間</p>
            <div className="flex items-center justify-center gap-4">
              <Stepper
                value={hour}
                label="時"
                onMinus={() => setHour((v) => (v + 24 - 1) % 24)}
                onPlus={() => setHour((v) => (v + 1) % 24)}
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
          </div>

          <ChannelRow channels={channels} onToggle={toggle} />

          <div className="flex gap-2">
            <Button onClick={save} className="flex-1" disabled={busy || channels.length === 0}>
              {busy ? "保存中…" : "変更を保存"}
            </Button>
            <Button variant="danger" onClick={onDelete}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function ChannelRow({
  channels,
  onToggle,
}: {
  channels: Channel[];
  onToggle: (c: Channel) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold">投稿先</p>
      <div className="flex gap-2">
        <SheetChannel
          active={channels.includes("instagram")}
          onClick={() => onToggle("instagram")}
          icon={<Instagram size={15} />}
          label="Instagram"
        />
        <SheetChannel
          active={channels.includes("gbp")}
          onClick={() => onToggle("gbp")}
          icon={<MapPin size={15} />}
          label="GBP"
        />
      </div>
    </div>
  );
}

function SheetField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="glass px-4 py-2.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-faint)]">
        {label}
      </p>
      {children}
    </div>
  );
}

function Stepper({
  value,
  label,
  pad: padded,
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
          {padded ? String(value).padStart(2, "0") : value}
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

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ---- server ledger sync (best-effort; UI keeps working if offline) ----
function serverPatch(id: string, body: Record<string, unknown>) {
  fetch(`/api/schedule/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
function serverDelete(id: string) {
  fetch(`/api/schedule/${id}`, { method: "DELETE" }).catch(() => {});
}
