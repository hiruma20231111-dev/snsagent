// ============================================================
// autopilot.ts — the planner that fills the schedule from the bank
// ============================================================
// Runs on every cron tick. If autopilot is ON, it tops up the upcoming
// queue so there are always ~postsPerWeek posts per week scheduled over the
// lookahead window, drawing unused photos from the bank and placing them at
// persona-appropriate times (one per day max, on preferred days).

import {
  getAutopilotConfig,
  listBank,
  listPosts,
  savePost,
  updateBankItem,
  type StoredPost,
} from "./server-store";
import { pickTime } from "./persona";
import type { Channel } from "./types";

// The server runs in UTC, but persona time bands mean JST wall-clock. Work in
// JST (UTC+9, no DST) so "night 21:30" really posts at 21:30 in Japan.
const JST_MS = 9 * 60 * 60 * 1000;

/** JST calendar parts for a UTC millisecond timestamp. */
function jstParts(ms: number) {
  const d = new Date(ms + JST_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    day: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
}

/** UTC millisecond timestamp for a JST wall-clock date+time. */
function jstInstant(y: number, m: number, day: number, hour: number, minute: number) {
  return Date.UTC(y, m, day, hour, minute) - JST_MS;
}

function dayKeyMs(ms: number) {
  const p = jstParts(ms);
  return `${p.y}-${p.m}-${p.day}`;
}

export async function planAutopilot(): Promise<{ created: number; reason?: string }> {
  const cfg = await getAutopilotConfig();
  if (!cfg || !cfg.enabled) return { created: 0, reason: "disabled" };

  const now = Date.now();
  const horizonEnd = new Date(now + cfg.lookaheadDays * 86400000);

  const posts = await listPosts();
  const futureAuto = posts.filter(
    (p) =>
      p.source === "autopilot" &&
      new Date(p.scheduledAt).getTime() > now &&
      (p.status === "scheduled" || p.status === "publishing")
  );

  const desired = Math.max(1, Math.round((cfg.postsPerWeek * cfg.lookaheadDays) / 7));
  let need = desired - futureAuto.length;
  if (need <= 0) return { created: 0 };

  const bank = (await listBank()).filter((b) => !b.used);
  if (!bank.length) return { created: 0, reason: "bank-empty" };

  // at most one autopilot post per day (JST) → track days already taken
  const usedDays = new Set(futureAuto.map((p) => dayKeyMs(new Date(p.scheduledAt).getTime())));

  let created = 0;
  let bi = 0;
  // iterate JST calendar days, starting tomorrow (JST)
  for (let offset = 1; need > 0 && bi < bank.length && offset <= cfg.lookaheadDays; offset++) {
    const dayMs = now + offset * 86400000;
    if (dayMs > horizonEnd.getTime() + 86400000) break;
    const { y, m, day, dow } = jstParts(dayMs);
    const dayOk = cfg.preferredDays.length === 0 || cfg.preferredDays.includes(dow);
    const key = `${y}-${m}-${day}`;
    if (dayOk && !usedDays.has(key)) {
      const t = pickTime(cfg);
      const atMs = jstInstant(y, m, day, t.hour, t.minute);
      if (atMs > now) {
        const at = new Date(atMs);
        const item = bank[bi++];
        const stamp = new Date().toISOString();
        const fmt = item.format ?? cfg.format ?? "feed";
        // Stories ignore captions (text is burned into the image); feed carries it.
        const caption =
          fmt === "story" ? "" : `${item.caption}\n\n${item.hashtags.join(" ")}`.trim();
        const post: StoredPost = {
          id: "auto_" + at.getTime() + "_" + Math.random().toString(36).slice(2, 7),
          imageUrl: item.imageUrl,
          caption,
          title: item.title,
          format: fmt,
          channels: cfg.channels as Channel[],
          scheduledAt: at.toISOString(),
          status: "scheduled",
          source: "autopilot",
          createdAt: stamp,
          updatedAt: stamp,
        };
        await savePost(post);
        await updateBankItem(item.id, { used: true });
        usedDays.add(key);
        created++;
        need--;
      }
    }
  }

  return { created };
}
