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

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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

  // at most one autopilot post per day → track days already taken
  const usedDays = new Set(futureAuto.map((p) => dayKey(new Date(p.scheduledAt))));

  let created = 0;
  let bi = 0;
  let cursor = new Date(now + 86400000); // start from tomorrow
  cursor.setHours(0, 0, 0, 0);

  while (need > 0 && cursor <= horizonEnd && bi < bank.length) {
    const dow = cursor.getDay();
    const dayOk = cfg.preferredDays.length === 0 || cfg.preferredDays.includes(dow);
    const key = dayKey(cursor);
    if (dayOk && !usedDays.has(key)) {
      const t = pickTime(cfg);
      const at = new Date(cursor);
      at.setHours(t.hour, t.minute, 0, 0);
      if (at.getTime() > now) {
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
    cursor = new Date(cursor.getTime() + 86400000);
  }

  return { created };
}
